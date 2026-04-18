import Link from "next/link";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { buildPrimaryNav } from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { saveTimesheetDraft, submitWeeklyTimesheet } from "./actions";

type TimesheetsPageProps = {
  searchParams: Promise<{
    week?: string;
    error?: string;
    success?: string;
  }>;
};

type AssignmentWeekRow = {
  assigned_hours: number;
  assigned_allocation_percent: number | null;
  project_assignments: {
    id: string;
    assigned_from: string;
    assigned_to: string | null;
    project_positions: {
      title: string;
      projects: {
        name: string;
      } | null;
    } | null;
  } | null;
};

type InternalTimeAccountRow = {
  id: string;
  name: string;
  description: string | null;
  requires_description: boolean;
};

type TimeEntryRow = {
  id: string;
  entry_type: "project" | "internal";
  project_assignment_id: string | null;
  internal_time_account_type_id: string | null;
  hours: number;
  description: string;
};

type CapacityRow = {
  capacity_percent: number;
};

const FULL_TIME_HOURS_PER_WEEK = 40;

function normalizeWeekStart(date: Date) {
  const copy = new Date(date);
  const day = copy.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setUTCDate(copy.getUTCDate() + diff);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function normalizeWeekStartString(value: string | undefined) {
  if (!value) {
    return normalizeWeekStart(new Date()).toISOString().slice(0, 10);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return normalizeWeekStart(new Date()).toISOString().slice(0, 10);
  }

  return normalizeWeekStart(parsed).toISOString().slice(0, 10);
}

function shiftWeek(weekStart: string, amount: number) {
  const next = new Date(`${weekStart}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + amount * 7);
  return next.toISOString().slice(0, 10);
}

function formatWeekRange(weekStart: string) {
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 4);

  return `${new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit"
  }).format(start)} - ${new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(end)}`;
}

function formatHours(value: number) {
  return `${value.toFixed(2)}h`;
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${value.toFixed(0)}%`;
}

function formatWeekLabel(weekStart: string) {
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  const target = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  return `KW ${weekNumber}`;
}

export default async function TimesheetsPage({ searchParams }: TimesheetsPageProps) {
  const { week, error, success } = await searchParams;
  const selectedWeekStart = normalizeWeekStartString(week);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: profile },
    { data: timesheet },
    { data: assignmentWeeks },
    { data: internalTypes },
    { data: capacityRows }
  ] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, system_role")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("weekly_timesheets")
        .select("id, target_hours, status, submitted_at, time_entries(*)")
        .eq("profile_id", user.id)
        .eq("week_start", selectedWeekStart)
        .maybeSingle(),
      supabase
        .from("project_assignment_weeks")
        .select(
          `
            assigned_hours,
            assigned_allocation_percent,
            project_assignments!inner (
              id,
              assigned_from,
              assigned_to,
              project_positions (
                title,
                projects (
                  name
                )
              )
            )
          `
        )
        .eq("week_start", selectedWeekStart)
        .eq("project_assignments.profile_id", user.id),
      supabase
        .from("internal_time_account_types")
        .select("id, name, description, requires_description")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("employment_capacity_history")
        .select("capacity_percent")
        .eq("profile_id", user.id)
        .lte("valid_from", selectedWeekStart)
        .or(`valid_to.is.null,valid_to.gte.${selectedWeekStart}`)
        .order("valid_from", { ascending: false })
        .limit(1)
    ]);

  const entryRows = ((timesheet?.time_entries as TimeEntryRow[] | null) ?? []).filter(Boolean);
  const projectEntryMap = new Map(
    entryRows
      .filter((entry) => entry.entry_type === "project" && entry.project_assignment_id)
      .map((entry) => [entry.project_assignment_id as string, entry])
  );
  const internalEntryMap = new Map(
    entryRows
      .filter((entry) => entry.entry_type === "internal" && entry.internal_time_account_type_id)
      .map((entry) => [entry.internal_time_account_type_id as string, entry])
  );

  const assignmentRows = (assignmentWeeks as AssignmentWeekRow[] | null) ?? [];
  const internalAccountRows = (internalTypes as InternalTimeAccountRow[] | null) ?? [];
  const capacityPercent = (capacityRows as CapacityRow[] | null)?.[0]?.capacity_percent ?? 100;
  const targetHours =
    timesheet?.target_hours ??
    Number(((FULL_TIME_HOURS_PER_WEEK * Number(capacityPercent)) / 100).toFixed(2));
  const capturedHours = entryRows.reduce((sum, entry) => sum + Number(entry.hours), 0);
  const remainingHours = Number((targetHours - capturedHours).toFixed(2));
  const isSubmitted = timesheet?.status === "submitted";
  const navItems = buildPrimaryNav("timesheets");

  return (
    <AppFrame
      actions={
        <div className="topbar-chip-row">
          <Link className="cta cta-secondary" href={`/timesheets?week=${shiftWeek(selectedWeekStart, -1)}`}>
            Previous week
          </Link>
          <Link className="cta cta-secondary" href="/timesheets">
            Current week
          </Link>
          <Link className="cta cta-secondary" href={`/timesheets?week=${shiftWeek(selectedWeekStart, 1)}`}>
            Next week
          </Link>
        </div>
      }
      description="Capture your full week across staffed project assignments and internal time accounts. Submission is only allowed once your full target capacity is covered."
      eyebrow="Weekly timesheets"
      navItems={navItems}
      title={`${formatWeekLabel(selectedWeekStart)} · ${formatWeekRange(selectedWeekStart)}`}
      userLabel={profile?.full_name ?? user.email}
    >
      {error ? <p className="banner banner--error">{error}</p> : null}
      {success ? <p className="banner banner--success">{success}</p> : null}

      <section className="workspace-grid workspace-grid--three">
        <article className="panel dashboard-card">
          <div className="card-kicker">Week status</div>
          <h2>{isSubmitted ? "Submitted" : "Draft"}</h2>
          <p className="card-copy">
            {isSubmitted
              ? "This week is locked. You can still review the captured entries below."
              : "You can save partial progress as draft. Descriptions become mandatory only when you submit the full week."}
          </p>
          <div className="summary-strip">
            <div>
              <span>Target</span>
              <strong>{formatHours(targetHours)}</strong>
            </div>
            <div>
              <span>Captured</span>
              <strong>{formatHours(capturedHours)}</strong>
            </div>
          </div>
        </article>

        <article className="panel dashboard-card">
          <div className="card-kicker">Coverage</div>
          <h2>{remainingHours <= 0 ? "Complete" : "Still open"}</h2>
          <p className="card-copy">
            Submission requires an exact full-week match to your target capacity for the selected week.
          </p>
          <div className="summary-strip">
            <div>
              <span>Remaining</span>
              <strong>{formatHours(Math.max(remainingHours, 0))}</strong>
            </div>
            <div>
              <span>Assignments</span>
              <strong>{assignmentRows.length}</strong>
            </div>
          </div>
        </article>

        <article className="panel dashboard-card">
          <div className="card-kicker">Scope</div>
          <h2>Internal accounts included</h2>
          <p className="card-copy">
            Vacation, paid absence, training, internal admin and business development are all captured in the same weekly submit flow.
          </p>
          <div className="tag-list">
            {internalAccountRows.slice(0, 4).map((account) => (
              <span className="tag" key={account.id}>
                {account.name}
              </span>
            ))}
          </div>
        </article>
      </section>

      <form className="timesheet-layout" key={selectedWeekStart}>
        <input name="week_start" type="hidden" value={selectedWeekStart} />

        <section className="timesheet-section panel">
          <div className="timesheet-section-head">
            <div>
              <div className="card-kicker">Project time</div>
              <h2>Active assignments this week</h2>
            </div>
            <span className="pill">{assignmentRows.length} active</span>
          </div>

          <div className="timesheet-entry-stack">
            {assignmentRows.length ? (
              assignmentRows.map((row) => {
                const assignment = row.project_assignments;

                if (!assignment) {
                  return null;
                }

                const existing = projectEntryMap.get(assignment.id);

                return (
                  <article className="timesheet-entry-card" key={assignment.id}>
                    <div className="timesheet-entry-row">
                      <div className="timesheet-entry-main">
                        <div className="timesheet-entry-copy">
                          <h3>{assignment.project_positions?.projects?.name ?? "Unknown project"}</h3>
                          <p>{assignment.project_positions?.title ?? "Unknown position"}</p>
                        </div>
                        <div className="assignment-chip-group">
                          <span className="pill">{formatHours(Number(row.assigned_hours))}</span>
                          <span className="pill">
                            {formatPercent(row.assigned_allocation_percent)}
                          </span>
                        </div>
                      </div>

                      <div className="timesheet-entry-controls">
                        <label className="field timesheet-field-hours">
                          <span>Hours</span>
                          <input
                            defaultValue={existing?.hours ?? ""}
                            disabled={isSubmitted}
                            min="0"
                            name={`project_hours__${assignment.id}`}
                            step="0.25"
                            type="number"
                          />
                        </label>

                        <label className="field timesheet-field-description">
                          <span>Description</span>
                          <input
                            defaultValue={existing?.description ?? ""}
                            disabled={isSubmitted}
                            name={`project_description__${assignment.id}`}
                            placeholder="What did you work on during this week?"
                            type="text"
                          />
                        </label>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <article className="timesheet-entry-card timesheet-entry-card--empty">
                No staffed project assignments are active for this week. You can still submit a full week using internal time accounts only.
              </article>
            )}
          </div>
        </section>

        <section className="timesheet-section panel">
          <div className="timesheet-section-head">
            <div>
              <div className="card-kicker">Internal time</div>
              <h2>Non-project accounts</h2>
            </div>
            <span className="pill">{internalAccountRows.length} available</span>
          </div>

          <div className="timesheet-entry-stack">
            {internalAccountRows.map((account) => {
              const existing = internalEntryMap.get(account.id);

              return (
                <article className="timesheet-entry-card" key={account.id}>
                  <div className="timesheet-entry-row">
                    <div className="timesheet-entry-main">
                      <div className="timesheet-entry-copy">
                        <h3>{account.name}</h3>
                        <p>{account.description ?? "Internal allocation bucket"}</p>
                      </div>
                      <div className="assignment-chip-group">
                        {account.requires_description ? (
                          <span className="tag">Description required on submit</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="timesheet-entry-controls">
                      <label className="field timesheet-field-hours">
                        <span>Hours</span>
                        <input
                          defaultValue={existing?.hours ?? ""}
                          disabled={isSubmitted}
                          min="0"
                          name={`internal_hours__${account.id}`}
                          step="0.25"
                          type="number"
                        />
                      </label>

                      <label className="field timesheet-field-description">
                        <span>Description</span>
                        <input
                          defaultValue={existing?.description ?? ""}
                          disabled={isSubmitted}
                          name={`internal_description__${account.id}`}
                          placeholder="Why was this time booked here?"
                          type="text"
                        />
                      </label>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {!isSubmitted ? (
          <section className="timesheet-footer panel">
            <div>
              <div className="card-kicker">Submission</div>
              <h2>Save now or submit the full week</h2>
              <p className="card-copy">
                Draft save keeps the week editable and allows incomplete descriptions. Submit locks the week once target hours are fully covered and all booked entries have a description.
              </p>
            </div>

            <div className="cta-row">
              <button className="cta cta-secondary" formAction={saveTimesheetDraft} type="submit">
                Save draft
              </button>
              <button className="cta cta-primary" formAction={submitWeeklyTimesheet} type="submit">
                Submit week
              </button>
            </div>
          </section>
        ) : null}
      </form>
    </AppFrame>
  );
}
