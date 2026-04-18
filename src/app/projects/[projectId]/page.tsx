import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AllocationInput } from "@/components/allocation-input";
import { AppFrame } from "@/components/app-frame";
import { buildPrimaryNav } from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  addStatusReportComment,
  createProjectAssignment,
  createProjectPosition,
  saveStatusReportDraft,
  submitStatusReport
} from "./actions";

type ProjectDetailPageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    reportWeek?: string;
    success?: string;
  }>;
};

type PositionWeekRow = {
  week_start: string;
  planned_hours: number;
  planned_allocation_percent: number | null;
};

type AssignmentWeekRow = {
  week_start: string;
  assigned_hours: number;
  assigned_allocation_percent: number | null;
};

type AssignmentRow = {
  id: string;
  assigned_from: string;
  assigned_to: string | null;
  notes: string | null;
  profiles: {
    id: string;
    full_name: string;
  } | null;
  project_assignment_weeks: AssignmentWeekRow[] | null;
};

type PositionRow = {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  rate_unit: string;
  rate_amount: number;
  currency_code: string;
  professional_grades: { name: string } | null;
  project_position_weeks: PositionWeekRow[] | null;
  project_assignments: AssignmentRow[] | null;
};

type CapacityRow = {
  profile_id: string;
  capacity_percent: number;
  valid_from: string;
  valid_to: string | null;
};

type ProjectEmployeeRow = {
  id: string;
  full_name: string;
  system_role: string;
};

type ConflictDetail = {
  summary: string;
};

type StatusReportRow = {
  id: string;
  week_start: string;
  state: "draft" | "submitted";
  overall_progress_percent: number;
  objective_status: "green" | "yellow" | "red";
  objective_comment: string | null;
  timeline_status: "green" | "yellow" | "red";
  timeline_comment: string | null;
  budget_status: "green" | "yellow" | "red";
  budget_comment: string | null;
  scope_status: "green" | "yellow" | "red";
  scope_comment: string | null;
  risks_status: "green" | "yellow" | "red";
  risks_comment: string | null;
  created_by: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
};

type StatusReportCommentRow = {
  id: string;
  status_report_id: string;
  author_profile_id: string;
  body: string;
  created_at: string;
};

type FinancialTimeEntryRow = {
  hours: number;
  project_assignment_id: string | null;
  project_assignments: {
    project_position_id: string;
  } | null;
  billing_overrides:
    | {
        override_hours: number;
      }
    | {
        override_hours: number;
      }[]
    | null;
};

type PositionFinancialRow = {
  positionId: string;
  title: string;
  grade: string;
  rateUnit: string;
  rateAmount: number;
  currencyCode: string;
  plannedHours: number;
  plannedCost: number;
  actualHours: number;
  actualCost: number;
  billableHours: number;
  billableCost: number;
};

function firstRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function formatDate(date: string | null) {
  if (!date) {
    return "Open";
  }

  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(date));
}

function formatDateTime(date: string | null) {
  if (!date) {
    return "n/a";
  }

  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}

function formatMoney(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: currencyCode
  }).format(amount);
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${value}%`;
}

function formatHours(value: number) {
  return `${value.toFixed(1)}h`;
}

function toHourlyRate(rateUnit: string, rateAmount: number) {
  if (rateUnit === "daily") {
    return rateAmount / 8;
  }

  if (rateUnit === "weekly") {
    return rateAmount / 40;
  }

  return rateAmount;
}

function getCapacityForWeek(capacities: CapacityRow[], weekStart: string) {
  const match = capacities.find((entry) => {
    const startsBefore = entry.valid_from <= weekStart;
    const endsAfter = !entry.valid_to || entry.valid_to >= weekStart;
    return startsBefore && endsAfter;
  });

  return match?.capacity_percent ?? 100;
}

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

export default async function ProjectDetailPage({
  params,
  searchParams
}: ProjectDetailPageProps) {
  const [{ projectId }, { error, success, reportWeek }] = await Promise.all([params, searchParams]);
  const activeReportWeek = normalizeWeekStartString(reportWeek);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: profile },
    { data: project },
    { data: grades },
    { data: employees },
    { data: positions },
    { data: statusReports }
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, system_role")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("projects")
      .select(
        `
          id,
          name,
          code,
          description,
          lifecycle_status,
          start_date,
          end_date,
          portfolios (
            name
          ),
          programs (
            name
          ),
          customers (
            name
          ),
          client_units (
            name
          ),
          profiles:internal_project_lead_id (
            full_name
          ),
          project_charters (
            objective,
            scope_summary,
            milestones_summary
          ),
          project_financials (
            declared_budget,
            currency_code,
            budget_notes
          )
        `
      )
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("professional_grades")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name, system_role")
      .eq("is_active", true)
      .order("full_name", { ascending: true }),
    supabase
      .from("project_positions")
      .select(
        `
          id,
          title,
          description,
          start_date,
          end_date,
          rate_unit,
          rate_amount,
          currency_code,
          professional_grades (
            name
          ),
          project_position_weeks (
            week_start,
            planned_hours,
            planned_allocation_percent
          ),
          project_assignments (
            id,
            assigned_from,
            assigned_to,
            notes,
            profiles (
              id,
              full_name
            ),
            project_assignment_weeks (
              week_start,
              assigned_hours,
              assigned_allocation_percent
            )
          )
        `
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("status_reports")
      .select(
        `
          id,
          week_start,
          state,
          overall_progress_percent,
          objective_status,
          objective_comment,
          timeline_status,
          timeline_comment,
          budget_status,
          budget_comment,
          scope_status,
          scope_comment,
          risks_status,
          risks_comment,
          created_by,
          submitted_by,
          submitted_at
        `
      )
      .eq("project_id", projectId)
      .order("week_start", { ascending: false })
  ]);

  if (!project) {
    notFound();
  }

  const projectPortfolio = firstRelation<{ name: string }>(project.portfolios);
  const projectProgram = firstRelation<{ name: string }>(project.programs);
  const projectCustomer = firstRelation<{ name: string }>(project.customers);
  const projectClientUnit = firstRelation<{ name: string }>(project.client_units);
  const projectLead = firstRelation<{ full_name: string }>(project.profiles);
  const projectCharter = firstRelation<{ objective: string }>(project.project_charters);
  const projectFinancials = firstRelation<{
    declared_budget: number | null;
    currency_code: string;
    budget_notes: string | null;
  }>(project.project_financials);

  const navItems = buildPrimaryNav("projects");
  const projectRows = (positions as PositionRow[] | null) ?? [];
  const employeeRows = (employees as ProjectEmployeeRow[] | null) ?? [];
  const gradeRows = (grades as { id: string; name: string }[] | null) ?? [];
  const statusReportRows = (statusReports as StatusReportRow[] | null) ?? [];
  const reportAuthorMap = new Map(employeeRows.map((employee) => [employee.id, employee.full_name]));
  const selectedStatusReport =
    statusReportRows.find((report) => report.week_start === activeReportWeek) ?? null;

  const reportIds = statusReportRows.map((report) => report.id);
  const { data: statusReportComments } = reportIds.length
    ? await supabase
        .from("status_report_comments")
        .select("id, status_report_id, author_profile_id, body, created_at")
        .in("status_report_id", reportIds)
        .order("created_at", { ascending: false })
    : { data: [] };
  const commentsByReportId = new Map<string, StatusReportCommentRow[]>();

  for (const comment of (statusReportComments as StatusReportCommentRow[] | null) ?? []) {
    commentsByReportId.set(comment.status_report_id, [
      ...(commentsByReportId.get(comment.status_report_id) ?? []),
      comment
    ]);
  }

  const staffedProfileIds = Array.from(
    new Set(
      projectRows.flatMap((position) =>
        (position.project_assignments ?? [])
          .map((assignment) => assignment.profiles?.id)
          .filter((value): value is string => Boolean(value))
      )
    )
  );
  const assignmentIds = projectRows.flatMap((position) =>
    (position.project_assignments ?? []).map((assignment) => assignment.id)
  );

  const { data: allRelevantAssignmentWeeks } = staffedProfileIds.length
    ? await supabase
        .from("project_assignment_weeks")
        .select(
          `
            week_start,
            assigned_hours,
            assigned_allocation_percent,
            project_assignments (
              id,
              profile_id,
              project_positions (
                project_id,
                title,
                projects (
                  name
                )
              )
            )
          `
        )
        .in("project_assignments.profile_id", staffedProfileIds)
    : { data: [] };

  const { data: capacityHistory } = staffedProfileIds.length
    ? await supabase
        .from("employment_capacity_history")
        .select("profile_id, capacity_percent, valid_from, valid_to")
        .in("profile_id", staffedProfileIds)
        .order("valid_from", { ascending: false })
    : { data: [] };
  const { data: financialTimeEntries } = assignmentIds.length
    ? await supabase
        .from("time_entries")
        .select(
          `
            hours,
            project_assignment_id,
            project_assignments!inner (
              project_position_id
            ),
            billing_overrides (
              override_hours
            )
          `
        )
        .eq("entry_type", "project")
        .in("project_assignment_id", assignmentIds)
    : { data: [] };

  const conflictMap = new Map<string, ConflictDetail[]>();

  type RelevantWeekRow = {
    week_start: string;
    assigned_hours: number;
    assigned_allocation_percent: number | null;
    project_assignments: {
      id: string;
      profile_id: string;
      project_positions: {
        project_id: string;
        title: string;
        projects: { name: string } | null;
      } | null;
    } | null;
  };

  const rowsByProfileWeek = new Map<string, RelevantWeekRow[]>();
  const weekRows = (allRelevantAssignmentWeeks as RelevantWeekRow[] | null) ?? [];
  const capacities = (capacityHistory as CapacityRow[] | null) ?? [];

  for (const row of weekRows) {
    const profileId = row.project_assignments?.profile_id;

    if (!profileId) {
      continue;
    }

    const key = `${profileId}:${row.week_start}`;
    rowsByProfileWeek.set(key, [...(rowsByProfileWeek.get(key) ?? []), row]);
  }

  for (const [key, groupedRows] of rowsByProfileWeek.entries()) {
    const [profileId, weekStart] = key.split(":");
    const total = groupedRows.reduce((sum, row) => {
      const allocation =
        row.assigned_allocation_percent ?? Number(((row.assigned_hours / 40) * 100).toFixed(2));
      return sum + allocation;
    }, 0);
    const capacity = getCapacityForWeek(
      capacities.filter((entry) => entry.profile_id === profileId),
      weekStart
    );

    if (total <= capacity) {
      continue;
    }

    const contributors = groupedRows
      .map((row) => {
        const assignment = row.project_assignments;
        const projectPosition = assignment?.project_positions;

        if (!assignment || !projectPosition) {
          return null;
        }

        const allocation =
          row.assigned_allocation_percent ?? Number(((row.assigned_hours / 40) * 100).toFixed(2));

        return `${allocation.toFixed(0)}% ${projectPosition.projects?.name ?? "Unknown project"} - ${projectPosition.title}`;
      })
      .filter((value): value is string => Boolean(value))
      .join(", ");

    const summary = `${formatDate(weekStart)}: ${contributors} (${total.toFixed(0)}% vs ${capacity.toFixed(0)}%)`;

    for (const row of groupedRows) {
      const assignmentId = row.project_assignments?.id;

      if (!assignmentId) {
        continue;
      }

      conflictMap.set(assignmentId, [...(conflictMap.get(assignmentId) ?? []), { summary }]);
    }
  }

  const actualHoursByPosition = new Map<string, number>();
  const billableHoursByPosition = new Map<string, number>();

  for (const entry of (financialTimeEntries as FinancialTimeEntryRow[] | null) ?? []) {
    const positionId = entry.project_assignments?.project_position_id;

    if (!positionId) {
      continue;
    }

    const actualHours = Number(entry.hours ?? 0);
    const override = firstRelation<{ override_hours: number }>(entry.billing_overrides);
    const billableHours = Number(override?.override_hours ?? actualHours);

    actualHoursByPosition.set(positionId, (actualHoursByPosition.get(positionId) ?? 0) + actualHours);
    billableHoursByPosition.set(
      positionId,
      (billableHoursByPosition.get(positionId) ?? 0) + billableHours
    );
  }

  const positionFinancialRows: PositionFinancialRow[] = projectRows.map((position) => {
    const hourlyRate = toHourlyRate(position.rate_unit, position.rate_amount);
    const plannedHours = (position.project_position_weeks ?? []).reduce(
      (sum, week) => sum + Number(week.planned_hours),
      0
    );
    const actualHours = actualHoursByPosition.get(position.id) ?? 0;
    const billableHours = billableHoursByPosition.get(position.id) ?? actualHours;

    return {
      positionId: position.id,
      title: position.title,
      grade: position.professional_grades?.name ?? "No grade",
      rateUnit: position.rate_unit,
      rateAmount: Number(position.rate_amount),
      currencyCode: position.currency_code,
      plannedHours,
      plannedCost: plannedHours * hourlyRate,
      actualHours,
      actualCost: actualHours * hourlyRate,
      billableHours,
      billableCost: billableHours * hourlyRate
    };
  });

  const summaryCurrency = projectFinancials?.currency_code ?? projectRows[0]?.currency_code ?? "CHF";
  const declaredBudget = Number(projectFinancials?.declared_budget ?? 0);
  const plannedStaffingCost = positionFinancialRows.reduce((sum, row) => sum + row.plannedCost, 0);
  const actualStaffingCost = positionFinancialRows.reduce((sum, row) => sum + row.actualCost, 0);
  const billableStaffingCost = positionFinancialRows.reduce((sum, row) => sum + row.billableCost, 0);

  return (
    <AppFrame
      actions={
        <div className="topbar-chip-row">
          <Link className="cta cta-secondary" href="/projects">
            Back to projects
          </Link>
        </div>
      }
      description="Create demand positions, then staff them with real people over time. Capacity mismatches are intentionally surfaced as warnings instead of hard blockers."
      eyebrow="Project detail"
      navItems={navItems}
      title={project.name}
      userLabel={profile?.full_name ?? user.email}
    >
      {error ? <p className="banner banner--error">{error}</p> : null}
      {success ? <p className="banner banner--success">{success}</p> : null}

      <section className="workspace-grid workspace-grid--three">
        <article className="panel dashboard-card dashboard-card--wide">
          <div className="card-kicker">Project backbone</div>
          <h2>
            {projectPortfolio?.name ?? "No portfolio"}
            {projectProgram?.name ? ` / ${projectProgram.name}` : ""}
          </h2>
          <p className="card-copy">
            {projectCharter?.objective ?? "No objective captured yet."}
          </p>
          <dl className="project-row-meta">
            <div>
              <dt>Customer</dt>
              <dd>
                {projectCustomer?.name ?? "No customer"}
                {projectClientUnit?.name ? ` / ${projectClientUnit.name}` : ""}
              </dd>
            </div>
            <div>
              <dt>Internal lead</dt>
              <dd>{projectLead?.full_name ?? "Not assigned"}</dd>
            </div>
            <div>
              <dt>Timeline</dt>
              <dd>
                {formatDate(project.start_date)} - {formatDate(project.end_date)}
              </dd>
            </div>
            <div>
              <dt>Budget</dt>
              <dd>
                {projectFinancials?.declared_budget
                  ? formatMoney(projectFinancials.declared_budget, projectFinancials.currency_code)
                  : "No budget"}
              </dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="workspace-grid workspace-grid--three">
        <article className="panel dashboard-card">
          <div className="card-kicker">Financial overview</div>
          <h2>Declared budget</h2>
          <div className="financial-kpi-value">
            {declaredBudget ? formatMoney(declaredBudget, summaryCurrency) : "No budget"}
          </div>
          <p className="card-copy">
            {projectFinancials?.budget_notes ?? "Budget note not captured yet."}
          </p>
        </article>

        <article className="panel dashboard-card">
          <div className="card-kicker">Financial overview</div>
          <h2>Planned staffing cost</h2>
          <div className="financial-kpi-value">
            {formatMoney(plannedStaffingCost, summaryCurrency)}
          </div>
          <p className="card-copy">
            Derived from weekly planned hours on each position and the stored position rate.
          </p>
        </article>

        <article className="panel dashboard-card">
          <div className="card-kicker">Financial overview</div>
          <h2>Actual / billable</h2>
          <div className="financial-kpi-pair">
            <div>
              <span>Actual</span>
              <strong>{formatMoney(actualStaffingCost, summaryCurrency)}</strong>
            </div>
            <div>
              <span>Billable</span>
              <strong>{formatMoney(billableStaffingCost, summaryCurrency)}</strong>
            </div>
          </div>
          <p className="card-copy">
            Billable uses PL overrides where they exist and falls back to employee-reported hours otherwise.
          </p>
        </article>
      </section>

      <section className="project-position-stack">
        <article className="panel position-card">
          <div className="position-card-top">
            <div>
              <div className="card-kicker">Commercial view</div>
              <h2>Plan vs actual by position</h2>
              <p>
                This is the first project-level financial slice: planned cost from demand, actual cost from captured time, and billable cost from overrides.
              </p>
            </div>
          </div>

          <div className="financial-row-list">
            {positionFinancialRows.length ? (
              positionFinancialRows.map((row) => (
                <article className="financial-row" key={row.positionId}>
                  <div className="financial-row-main">
                    <div>
                      <h3>{row.title}</h3>
                      <p>
                        {row.grade} · {formatMoney(row.rateAmount, row.currencyCode)} / {row.rateUnit}
                      </p>
                    </div>
                    <div className="position-chip-group">
                      <span className="pill">{formatHours(row.plannedHours)} planned</span>
                      <span className="pill">{formatHours(row.actualHours)} actual</span>
                      <span className="pill">{formatHours(row.billableHours)} billable</span>
                    </div>
                  </div>

                  <div className="financial-metric-grid">
                    <div>
                      <span>Planned cost</span>
                      <strong>{formatMoney(row.plannedCost, row.currencyCode)}</strong>
                    </div>
                    <div>
                      <span>Actual cost</span>
                      <strong>{formatMoney(row.actualCost, row.currencyCode)}</strong>
                    </div>
                    <div>
                      <span>Billable cost</span>
                      <strong>{formatMoney(row.billableCost, row.currencyCode)}</strong>
                    </div>
                    <div>
                      <span>Variance vs plan</span>
                      <strong>
                        {formatMoney(row.billableCost - row.plannedCost, row.currencyCode)}
                      </strong>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="financial-row financial-row--empty">
                No positions yet. Once planning starts, this view will turn into the core plan-vs-actual commercial dashboard for the project.
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="workspace-grid workspace-grid--project">
        <article className="panel dashboard-card project-form-card">
          <div className="card-kicker">Status reporting</div>
          <h2>{selectedStatusReport ? "Edit draft report" : "Create weekly report"}</h2>
          <p className="card-copy">
            One status report per project and week. Drafts stay editable. Submitted reports are locked and only expandable through comments.
          </p>

          <form action={saveStatusReportDraft} className="project-form-grid">
            <input name="project_id" type="hidden" value={projectId} />

            <label className="field">
              <span>Reporting week</span>
              <input
                defaultValue={activeReportWeek}
                name="report_week_start"
                required
                type="date"
              />
            </label>

            <label className="field">
              <span>Overall progress</span>
              <select
                defaultValue={String(selectedStatusReport?.overall_progress_percent ?? 0)}
                name="overall_progress_percent"
              >
                {Array.from({ length: 11 }, (_, index) => index * 10).map((value) => (
                  <option key={value} value={value}>
                    {value}%
                  </option>
                ))}
              </select>
            </label>

            {(
              [
                ["objective_status", "Objective", selectedStatusReport?.objective_status, "objective_comment", selectedStatusReport?.objective_comment],
                ["timeline_status", "Timeline", selectedStatusReport?.timeline_status, "timeline_comment", selectedStatusReport?.timeline_comment],
                ["budget_status", "Budget", selectedStatusReport?.budget_status, "budget_comment", selectedStatusReport?.budget_comment],
                ["scope_status", "Scope", selectedStatusReport?.scope_status, "scope_comment", selectedStatusReport?.scope_comment],
                ["risks_status", "Risks", selectedStatusReport?.risks_status, "risks_comment", selectedStatusReport?.risks_comment]
              ] as const
            ).map(([statusName, label, statusValue, commentName, commentValue]) => (
              <div className="status-field-pair field--full" key={statusName}>
                <label className="field">
                  <span>{label} status</span>
                  <select defaultValue={statusValue ?? "green"} name={statusName}>
                    <option value="green">Green</option>
                    <option value="yellow">Yellow</option>
                    <option value="red">Red</option>
                  </select>
                </label>

                <label className="field status-field-comment">
                  <span>{label} comment</span>
                  <input
                    defaultValue={commentValue ?? ""}
                    name={commentName}
                    placeholder={`${label} summary or issue context`}
                    type="text"
                  />
                </label>
              </div>
            ))}

            <div className="field field--full project-form-actions">
              <button className="cta cta-secondary" formAction={saveStatusReportDraft} type="submit">
                Save draft
              </button>
              <button className="cta cta-primary" formAction={submitStatusReport} type="submit">
                Submit report
              </button>
            </div>
          </form>
        </article>

        <article className="panel dashboard-card project-form-card">
          <div className="card-kicker">Report history</div>
          <h2>Submitted and draft reports</h2>
          <p className="card-copy">
            Portfolio managers can review the historical trend here. Draft reports can be reopened into the editor by selecting their reporting week.
          </p>

          <div className="status-report-list">
            {statusReportRows.length ? (
              statusReportRows.map((report) => {
                const comments = commentsByReportId.get(report.id) ?? [];
                const reportHref = `/projects/${projectId}?reportWeek=${report.week_start}`;

                return (
                  <article className="status-report-card" key={report.id}>
                    <div className="status-report-top">
                      <div>
                        <h3>
                          <Link href={reportHref}>{formatDate(report.week_start)}</Link>
                        </h3>
                        <p>
                          {report.state === "submitted"
                            ? `Submitted ${formatDateTime(report.submitted_at)}`
                            : "Draft report"}
                        </p>
                      </div>

                      <div className="position-chip-group">
                        <span className={`status-badge status-badge--${report.state}`}>
                          {report.state}
                        </span>
                        <span className="pill">{report.overall_progress_percent}% progress</span>
                      </div>
                    </div>

                    <div className="status-rating-grid">
                      {(
                        [
                          ["Objective", report.objective_status, report.objective_comment],
                          ["Timeline", report.timeline_status, report.timeline_comment],
                          ["Budget", report.budget_status, report.budget_comment],
                          ["Scope", report.scope_status, report.scope_comment],
                          ["Risks", report.risks_status, report.risks_comment]
                        ] as const
                      ).map(([label, rating, comment]) => (
                        <div className="status-rating-row" key={label}>
                          <span className={`status-dot status-dot--${rating}`} />
                          <div>
                            <strong>{label}</strong>
                            <p>{comment ?? "No comment captured."}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="status-comment-block">
                      <div className="status-comment-head">
                        <strong>Comments</strong>
                        <span>{comments.length} total</span>
                      </div>

                      {comments.length ? (
                        <div className="status-comment-list">
                          {comments.slice(0, 3).map((comment) => (
                            <article className="status-comment-row" key={comment.id}>
                              <strong>
                                {reportAuthorMap.get(comment.author_profile_id) ?? "Unknown author"}
                              </strong>
                              <span>{formatDateTime(comment.created_at)}</span>
                              <p>{comment.body}</p>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="status-comment-empty">No comments yet.</div>
                      )}

                      <form action={addStatusReportComment} className="inline-form inline-form--divider">
                        <input name="project_id" type="hidden" value={projectId} />
                        <input name="report_week_start" type="hidden" value={activeReportWeek} />
                        <input name="status_report_id" type="hidden" value={report.id} />
                        <label className="field">
                          <span>Add comment</span>
                          <input
                            name="body"
                            placeholder="Add context, clarification or follow-up"
                            type="text"
                          />
                        </label>
                        <button className="cta cta-secondary" type="submit">
                          Add comment
                        </button>
                      </form>
                    </div>
                  </article>
                );
              })
            ) : (
              <article className="status-report-card status-report-card--empty">
                No status reports yet. Create the first weekly report from the panel on the left.
              </article>
            )}
          </div>
        </article>
      </section>

      <section className="workspace-grid workspace-grid--project">
        <article className="panel dashboard-card project-form-card">
          <div className="card-kicker">Demand planning</div>
          <h2>Create project position</h2>
          <p className="card-copy">
            Positions are the stable planning unit. Weekly demand rows are
            generated automatically from the date range and weekly hours below.
          </p>

          <form action={createProjectPosition} className="project-form-grid">
            <input name="project_id" type="hidden" value={projectId} />

            <label className="field">
              <span>Position title</span>
              <input name="title" placeholder="Senior Consultant PMO" required type="text" />
            </label>

            <label className="field">
              <span>Professional grade</span>
              <select name="professional_grade_id" required>
                <option value="">Select grade</option>
                {gradeRows.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Start date</span>
              <input defaultValue={project.start_date} name="start_date" required type="date" />
            </label>

            <label className="field">
              <span>End date</span>
              <input defaultValue={project.end_date ?? ""} name="end_date" type="date" />
            </label>

            <AllocationInput hoursLabel="Planned hours / week" inputName="planned_hours" />

            <label className="field">
              <span>Rate unit</span>
              <select defaultValue="hourly" name="rate_unit">
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>

            <label className="field">
              <span>Rate amount</span>
              <input
                defaultValue="180"
                min="0"
                name="rate_amount"
                required
                step="0.01"
                type="number"
              />
            </label>

            <label className="field field--full">
              <span>Description</span>
              <textarea
                name="description"
                placeholder="Optional delivery note or staffing intention"
                rows={3}
              />
            </label>

            <div className="field field--full project-form-actions">
              <button className="cta cta-primary" type="submit">
                Create position
              </button>
            </div>
          </form>
        </article>

        <article className="panel dashboard-card project-form-card">
          <div className="card-kicker">Staffing</div>
          <h2>Assign a person to a position</h2>
          <p className="card-copy">
            This creates one historized assignment and weekly fulfillment rows
            for the chosen date range. Allocation is derived automatically from
            the weekly hours.
          </p>

          <form action={createProjectAssignment} className="project-form-grid">
            <input name="project_id" type="hidden" value={projectId} />

            <label className="field field--full">
              <span>Position</span>
              <select name="project_position_id" required>
                <option value="">Select position</option>
                {projectRows.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.title} • {position.professional_grades?.name ?? "No grade"}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field--full">
              <span>Employee</span>
              <select name="profile_id" required>
                <option value="">Select employee</option>
                {employeeRows.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name} • {employee.system_role.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Assigned from</span>
              <input defaultValue={project.start_date} name="assigned_from" required type="date" />
            </label>

            <label className="field">
              <span>Assigned to</span>
              <input defaultValue={project.end_date ?? ""} name="assigned_to" type="date" />
            </label>

            <AllocationInput hoursLabel="Hours / week" inputName="assigned_hours" />

            <label className="field field--full">
              <span>Notes</span>
              <textarea
                name="notes"
                placeholder="Optional context for this staffing decision"
                rows={3}
              />
            </label>

            <div className="field field--full project-form-actions">
              <button className="cta cta-primary" type="submit">
                Create assignment
              </button>
            </div>
          </form>
        </article>
      </section>

      <section className="project-position-stack">
        {projectRows.length ? (
          projectRows.map((position) => {
            const plannedWeeks = position.project_position_weeks ?? [];
            const averagePlannedHours =
              plannedWeeks.reduce((sum, week) => sum + week.planned_hours, 0) /
              (plannedWeeks.length || 1);
            const averagePlannedAllocation =
              plannedWeeks.reduce(
                (sum, week) => sum + (week.planned_allocation_percent ?? 0),
                0
              ) / (plannedWeeks.length || 1);

            return (
              <article className="panel position-card" key={position.id}>
                <div className="position-card-top">
                  <div>
                    <div className="card-kicker">Position</div>
                    <h2>{position.title}</h2>
                    <p>
                      {position.professional_grades?.name ?? "No grade"} •{" "}
                      {formatDate(position.start_date)} - {formatDate(position.end_date)}
                    </p>
                  </div>
                  <div className="position-chip-group">
                    <span className="pill">
                      {averagePlannedHours.toFixed(1)}h / week planned
                    </span>
                    <span className="pill">
                      {averagePlannedAllocation.toFixed(0)}% planned
                    </span>
                    <span className="pill">
                      {formatMoney(position.rate_amount, position.currency_code)} /{" "}
                      {position.rate_unit}
                    </span>
                  </div>
                </div>

                {position.description ? (
                  <p className="card-copy">{position.description}</p>
                ) : null}

                <div className="assignment-list">
                  {(position.project_assignments ?? []).length ? (
                    position.project_assignments?.map((assignment) => {
                      const firstWeek = assignment.project_assignment_weeks?.[0];
                      const conflictDetails = conflictMap.get(assignment.id) ?? [];

                      return (
                        <article className="assignment-row" key={assignment.id}>
                          <div className="assignment-row-top">
                            <div>
                              <h3>{assignment.profiles?.full_name ?? "Unknown employee"}</h3>
                              <p>
                                {formatDate(assignment.assigned_from)} -{" "}
                                {formatDate(assignment.assigned_to)}
                              </p>
                            </div>
                            {firstWeek ? (
                              <div className="assignment-chip-group">
                                <span className="pill">
                                  {firstWeek.assigned_hours.toFixed(1)}h / week
                                </span>
                                <span className="pill">
                                  {formatPercent(firstWeek.assigned_allocation_percent)}
                                </span>
                              </div>
                            ) : null}
                          </div>

                          {assignment.notes ? (
                            <p className="card-copy">{assignment.notes}</p>
                          ) : null}

                          {conflictDetails.length ? (
                            <div className="warning-box">
                              <strong>Capacity conflict detected</strong>
                              <ul>
                                {conflictDetails.slice(0, 4).map((detail) => (
                                  <li key={detail.summary}>{detail.summary}</li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <div className="ok-box">No over-allocation warning detected.</div>
                          )}
                        </article>
                      );
                    })
                  ) : (
                    <div className="assignment-row assignment-row--empty">
                      No one staffed yet. Create the first assignment from the
                      staffing form above.
                    </div>
                  )}
                </div>
              </article>
            );
          })
        ) : (
          <article className="panel position-card position-card--empty">
            No positions created yet. Start by adding the first demand position
            for this project.
          </article>
        )}
      </section>
    </AppFrame>
  );
}
