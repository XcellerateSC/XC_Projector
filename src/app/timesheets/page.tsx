import Link from "next/link";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { buildPrimaryNav } from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { saveTimesheetDraft, submitWeeklyTimesheet } from "./actions";

type TimesheetsPageProps = {
  searchParams: Promise<{
    week?: string;
    year?: string;
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

type WeekListTimesheetRow = {
  week_start: string;
  status: "draft" | "submitted";
};

type WeekListEntry = {
  isCurrentWeek: boolean;
  isSelected: boolean;
  label: string;
  rangeLabel: string;
  status: "submitted" | "draft" | "empty";
  weekStart: string;
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
  return `KW ${String(getIsoWeekNumber(weekStart)).padStart(2, "0")}`;
}

function getIsoWeekData(value: string | Date) {
  const source =
    typeof value === "string" ? new Date(`${value}T00:00:00.000Z`) : new Date(value);
  const target = new Date(
    Date.UTC(source.getUTCFullYear(), source.getUTCMonth(), source.getUTCDate())
  );
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const isoYear = target.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  return { isoWeek, isoYear };
}

function getIsoWeekNumber(weekStart: string) {
  return getIsoWeekData(weekStart).isoWeek;
}

function getIsoWeekYear(weekStart: string) {
  return getIsoWeekData(weekStart).isoYear;
}

function getWeekStartForIsoWeek(isoYear: number, isoWeek: number) {
  const januaryFourth = new Date(Date.UTC(isoYear, 0, 4));
  const januaryFourthDay = januaryFourth.getUTCDay() || 7;
  const firstWeekMonday = new Date(januaryFourth);
  firstWeekMonday.setUTCDate(januaryFourth.getUTCDate() - januaryFourthDay + 1);
  firstWeekMonday.setUTCDate(firstWeekMonday.getUTCDate() + (isoWeek - 1) * 7);
  return firstWeekMonday.toISOString().slice(0, 10);
}

function getIsoWeeksInYear(isoYear: number) {
  return getIsoWeekData(new Date(Date.UTC(isoYear, 11, 28))).isoWeek;
}

function normalizeSelectedYear(value: string | undefined, fallbackYear: number) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (Number.isNaN(parsed) || parsed < 2020 || parsed > 2100) {
    return fallbackYear;
  }

  return parsed;
}

function resolveSelectedWeekStart(args: {
  currentWeekNumber: number;
  currentWeekStart: string;
  requestedWeek: string | undefined;
  selectedYear: number;
}) {
  if (args.requestedWeek) {
    const parsed = new Date(args.requestedWeek);

    if (!Number.isNaN(parsed.getTime())) {
      const normalized = normalizeWeekStart(parsed).toISOString().slice(0, 10);

      if (getIsoWeekYear(normalized) === args.selectedYear) {
        return normalized;
      }
    }
  }

  if (getIsoWeekYear(args.currentWeekStart) === args.selectedYear) {
    return args.currentWeekStart;
  }

  const maxWeek = getIsoWeeksInYear(args.selectedYear);
  const targetWeek = Math.min(args.currentWeekNumber, maxWeek);
  return getWeekStartForIsoWeek(args.selectedYear, targetWeek);
}

function buildWeekSelection(args: {
  currentWeekStart: string;
  selectedWeekStart: string;
  selectedYear: number;
  visibleTimesheets: WeekListTimesheetRow[];
}) {
  const statusByWeekStart = new Map(
    args.visibleTimesheets.map((row) => [row.week_start, row.status])
  );

  return Array.from({ length: getIsoWeeksInYear(args.selectedYear) }, (_, index) => {
    const weekStart = getWeekStartForIsoWeek(args.selectedYear, index + 1);
    const status = statusByWeekStart.get(weekStart);

    return {
      isCurrentWeek: weekStart === args.currentWeekStart,
      isSelected: weekStart === args.selectedWeekStart,
      label: formatWeekLabel(weekStart),
      rangeLabel: formatWeekRange(weekStart),
      status:
        status === "submitted" ? "submitted" : status === "draft" ? "draft" : "empty",
      weekStart
    } satisfies WeekListEntry;
  });
}

export default async function TimesheetsPage({ searchParams }: TimesheetsPageProps) {
  const { week, year, error, success } = await searchParams;
  const currentWeekStart = normalizeWeekStart(new Date()).toISOString().slice(0, 10);
  const currentWeekNumber = getIsoWeekNumber(currentWeekStart);
  const currentYear = getIsoWeekYear(currentWeekStart);
  const selectedYear = normalizeSelectedYear(year, week ? getIsoWeekYear(week) : currentYear);
  const selectedWeekStart = resolveSelectedWeekStart({
    currentWeekNumber,
    currentWeekStart,
    requestedWeek: week,
    selectedYear
  });
  const weekListStart = getWeekStartForIsoWeek(selectedYear, 1);
  const weekListEnd = getWeekStartForIsoWeek(selectedYear, getIsoWeeksInYear(selectedYear));
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
    { data: capacityRows },
    { data: visibleTimesheets }
  ] = await Promise.all([
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
      .limit(1),
    supabase
      .from("weekly_timesheets")
      .select("week_start, status")
      .eq("profile_id", user.id)
      .gte("week_start", weekListStart)
      .lte("week_start", weekListEnd)
      .order("week_start", { ascending: true })
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
  const capturedHours = entryRows.reduce((sum, entry) => sum + Number(entry.hours), 0);
  const targetHours =
    timesheet?.target_hours ??
    Number(((FULL_TIME_HOURS_PER_WEEK * Number(capacityPercent)) / 100).toFixed(2));
  const remainingHours = Number((targetHours - capturedHours).toFixed(2));
  const remainingDisplayHours = Math.max(remainingHours, 0);
  const isSubmitted = timesheet?.status === "submitted";
  const isFutureWeek = selectedWeekStart > currentWeekStart;
  const canSubmit = remainingHours <= 0;
  const navItems = buildPrimaryNav("timesheets");
  const weekSelection = buildWeekSelection({
    currentWeekStart,
    selectedWeekStart,
    selectedYear,
    visibleTimesheets: (visibleTimesheets as WeekListTimesheetRow[] | null) ?? []
  });
  const yearOptions = Array.from({ length: 5 }, (_, index) => currentYear - 2 + index);
  const timesheetStateLabel = isSubmitted
    ? "Submitted"
    : isFutureWeek
      ? "Future week"
      : canSubmit
        ? "Ready to submit"
        : "Open";
  const timesheetStateClassName = isSubmitted
    ? "is-submitted"
    : isFutureWeek
      ? "is-future"
      : canSubmit
        ? "is-ready"
        : "is-open";

  return (
    <AppFrame
      actions={
        <div className="topbar-chip-row">
          <span className="topbar-chip">Year {selectedYear}</span>
          <span className="topbar-chip">{assignmentRows.length} assignments</span>
          <span className="topbar-chip">{internalAccountRows.length} internal accounts</span>
        </div>
      }
      contentClassName="app-content--fit-screen app-content--timesheet-blueprint"
      description="Select a week and capture time in one compact workspace."
      eyebrow="Weekly timesheets"
      navItems={navItems}
      shellClassName="app-shell--fit-screen app-shell--timesheet-blueprint"
      title="Time Sheets"
      topbarClassName="app-topbar--compact app-topbar--timesheet-blueprint"
      userLabel={profile?.full_name ?? user.email}
    >
      {error ? <p className="banner banner--error">{error}</p> : null}
      {success ? <p className="banner banner--success">{success}</p> : null}

      <section className="timesheet-app">
        <section className="workspace-grid workspace-grid--project timesheet-shell">
          <aside className="panel timesheet-week-panel">
            <div className="timesheet-week-panel-head">
              <div className="card-kicker">Week selection</div>
              <form className="timesheet-year-form">
                <select aria-label="Year" defaultValue={String(selectedYear)} name="year">
                  {yearOptions.map((optionYear) => (
                    <option key={optionYear} value={optionYear}>
                      {optionYear}
                    </option>
                  ))}
                </select>
                <button className="cta cta-secondary" type="submit">
                  Go
                </button>
              </form>
              <div aria-hidden="true" className="timesheet-week-panel-subline">
                {formatWeekRange(selectedWeekStart)}
              </div>
            </div>

            <div className="timesheet-week-list">
              {weekSelection.map((weekEntry) => (
                <Link
                  className={`timesheet-week-link${
                    weekEntry.isSelected ? " is-selected" : ""
                  }${weekEntry.isCurrentWeek ? " is-current" : ""}`}
                  href={`/timesheets?year=${selectedYear}&week=${weekEntry.weekStart}`}
                  key={weekEntry.weekStart}
                >
                  <span aria-hidden="true" className="timesheet-week-indicator" />
                  <div className="timesheet-week-copy">
                    <strong>{weekEntry.label}</strong>
                    <span>{weekEntry.rangeLabel}</span>
                  </div>

                  <span className={`timesheet-week-dot timesheet-week-dot--${weekEntry.status}`} />
                </Link>
              ))}
            </div>
          </aside>

          <form className="panel timesheet-detail-panel" key={selectedWeekStart}>
            <input name="week_start" type="hidden" value={selectedWeekStart} />

            <header className="timesheet-detail-header">
              <div className="timesheet-detail-copy">
                <div className="card-kicker">Week status</div>
                <div className="timesheet-status-title">
                  <h2>{formatWeekLabel(selectedWeekStart)}</h2>
                  <p>{formatWeekRange(selectedWeekStart)}</p>
                </div>
              </div>

              <div className="timesheet-detail-head-side">
                <div className="timesheet-status-strip">
                  <div>
                    <span>Captured</span>
                    <strong>{formatHours(capturedHours)}</strong>
                  </div>
                  <div>
                    <span>Remaining</span>
                    <strong>{formatHours(remainingDisplayHours)}</strong>
                  </div>
                  <div>
                    <span>Assignments</span>
                    <strong>{assignmentRows.length}</strong>
                  </div>
                </div>

                <div className="timesheet-detail-actions">
                  <span className={`timesheet-state-chip ${timesheetStateClassName}`}>
                    <span className="timesheet-state-chip-dot" />
                    {timesheetStateLabel}
                  </span>

                  {!isSubmitted ? (
                    <div className="cta-row">
                      <button
                        className="cta cta-secondary"
                        formAction={saveTimesheetDraft}
                        type="submit"
                      >
                        Save draft
                      </button>
                      <button
                        className="cta cta-primary"
                        formAction={submitWeeklyTimesheet}
                        type="submit"
                      >
                        Submit week
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </header>

            <div className="timesheet-detail-scroll">
              {!isSubmitted && !isFutureWeek && remainingHours > 0 ? (
                <div className="warning-box timesheet-inline-note">
                  <strong>{formatHours(remainingDisplayHours)} open.</strong>
                  Capture the remaining time before you submit the current week.
                </div>
              ) : null}

              {!isSubmitted && canSubmit ? (
                <div className="ok-box timesheet-inline-note">
                  The week is fully covered. Submit it once all booked entries have a description.
                </div>
              ) : null}

              <section className="timesheet-content-card">
                <div className="timesheet-subsection-head">
                  <strong>Project time</strong>
                  <span>{assignmentRows.length} active</span>
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
                      No staffed project assignments are active for this week. You can still
                      submit a full week using internal time accounts only.
                    </article>
                  )}
                </div>
              </section>

              <section className="timesheet-content-card">
                <div className="timesheet-subsection-head">
                  <strong>Internal time</strong>
                  <span>{internalAccountRows.length} available</span>
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
                              <span>
                                Description
                                {account.requires_description ? (
                                  <strong className="field-required-marker" aria-hidden="true">
                                    *
                                  </strong>
                                ) : null}
                              </span>
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
            </div>
          </form>
        </section>
      </section>
    </AppFrame>
  );
}
