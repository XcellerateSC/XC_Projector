import Link from "next/link";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { buildPrimaryNav } from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { logout } from "../login/actions";

type AccessAssignmentRow = {
  portfolio_id: string | null;
  program_id: string | null;
  project_id: string | null;
};

type AssignmentWeekRow = {
  assigned_hours: number;
  assigned_allocation_percent: number | null;
  project_assignments: {
    id: string;
    profile_id: string;
    project_positions: {
      project_id: string;
      title: string;
      projects: {
        name: string;
      } | null;
    } | null;
  } | null;
};

type CurrentUserAssignmentRow = {
  assigned_hours: number;
  assigned_allocation_percent: number | null;
  project_assignments: {
    id: string;
    assigned_from: string;
    assigned_to: string | null;
    project_positions: {
      project_id: string;
      title: string;
      projects: {
        name: string;
      } | null;
    } | null;
  } | null;
};

type TimesheetRow = {
  id: string;
  week_start: string;
  target_hours: number;
  status: "draft" | "submitted";
  submitted_at: string | null;
  time_entries:
    | {
        hours: number;
      }[]
    | null;
};

type CapacityRow = {
  profile_id?: string;
  capacity_percent: number;
  valid_from: string;
  valid_to: string | null;
};

type VisibleProjectRow = {
  id: string;
  name: string;
  lifecycle_status: "draft" | "planned" | "active" | "on_hold" | "completed" | "cancelled";
  portfolio_id: string;
  program_id: string | null;
  internal_project_lead_id: string | null;
  start_date: string;
  end_date: string | null;
  project_positions:
    | {
        id: string;
        title: string;
        is_active: boolean;
        start_date: string;
        end_date: string | null;
        project_assignments:
          | {
              id: string;
              profile_id: string;
              assigned_from: string;
              assigned_to: string | null;
            }[]
          | null;
      }[]
    | null;
};

type StatusReportRow = {
  id: string;
  project_id: string;
  week_start: string;
  state: "draft" | "submitted";
};

type LeadershipProjectSignal = {
  id: string;
  name: string;
  draftReport: boolean;
  missingReport: boolean;
  overcapacityAssignments: number;
  unstaffedPositions: number;
  withoutPositions: boolean;
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

function formatRoleLabel(role: string | null | undefined) {
  if (!role) {
    return "Profile incomplete";
  }

  return role
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatHours(value: number) {
  return `${value.toFixed(1)}h`;
}

function buildInitials(name: string | null | undefined, email: string | null | undefined) {
  const source = name?.trim() || email?.trim() || "User";
  const parts = source
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "U";
}

function isDateRangeActiveForWeek(startDate: string, endDate: string | null, weekStart: string) {
  const weekEnd = shiftWeek(weekStart, 1);
  const inclusiveWeekEnd = new Date(`${weekEnd}T00:00:00.000Z`);
  inclusiveWeekEnd.setUTCDate(inclusiveWeekEnd.getUTCDate() - 1);
  const weekEndString = inclusiveWeekEnd.toISOString().slice(0, 10);

  return startDate <= weekEndString && (!endDate || endDate >= weekStart);
}

function calculateCurrentWeekStatus(args: {
  activeAssignments: CurrentUserAssignmentRow[];
  currentWeekStart: string;
  currentWeekTimesheet: TimesheetRow | null;
  currentCapacityPercent: number;
}) {
  const targetHours =
    args.currentWeekTimesheet?.target_hours ??
    Number(((FULL_TIME_HOURS_PER_WEEK * Number(args.currentCapacityPercent)) / 100).toFixed(2));
  const capturedHours = ((args.currentWeekTimesheet?.time_entries ?? []) as { hours: number }[]).reduce(
    (sum, entry) => sum + Number(entry.hours),
    0
  );
  const remainingHours = Number((targetHours - capturedHours).toFixed(2));

  if (args.currentWeekTimesheet?.status === "submitted") {
    return {
      label: "Up to date",
      detail: "Your current week is submitted.",
      pillClassName: "pill--good",
      remainingHours,
      targetHours,
      capturedHours
    };
  }

  if (remainingHours <= 0) {
    return {
      label: "Ready to submit",
      detail: "Your week is fully captured and can be submitted.",
      pillClassName: "pill--partial",
      remainingHours,
      targetHours,
      capturedHours
    };
  }

  if (args.currentWeekTimesheet || args.activeAssignments.length) {
    return {
      label: "Still open",
      detail: "There is still time missing in the current week.",
      pillClassName: "pill--missing",
      remainingHours,
      targetHours,
      capturedHours
    };
  }

  return {
    label: "No week activity yet",
    detail: "No active assignments or timesheet entries exist for the current week.",
    pillClassName: "pill--good",
    remainingHours,
    targetHours,
    capturedHours
  };
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const currentWeekStart = normalizeWeekStart(new Date()).toISOString().slice(0, 10);
  const recentWeekCutoff = shiftWeek(currentWeekStart, -5);

  const [
    { data: profile },
    { data: accessAssignments },
    { data: currentUserAssignments },
    { data: recentTimesheets },
    { data: currentCapacityRows },
    { data: visibleProjects }
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, system_role")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("access_assignments")
      .select("portfolio_id, program_id, project_id")
      .eq("profile_id", user.id),
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
              project_id,
              title,
              projects (
                name
              )
            )
          )
        `
      )
      .eq("week_start", currentWeekStart)
      .eq("project_assignments.profile_id", user.id),
    supabase
      .from("weekly_timesheets")
      .select("id, week_start, target_hours, status, submitted_at, time_entries(hours)")
      .eq("profile_id", user.id)
      .gte("week_start", recentWeekCutoff)
      .order("week_start", { ascending: false }),
    supabase
      .from("employment_capacity_history")
      .select("capacity_percent, valid_from, valid_to")
      .eq("profile_id", user.id)
      .lte("valid_from", currentWeekStart)
      .or(`valid_to.is.null,valid_to.gte.${currentWeekStart}`)
      .order("valid_from", { ascending: false })
      .limit(1),
    supabase
      .from("projects")
      .select(
        `
          id,
          name,
          lifecycle_status,
          portfolio_id,
          program_id,
          internal_project_lead_id,
          start_date,
          end_date,
          project_positions (
            id,
            title,
            is_active,
            start_date,
            end_date,
            project_assignments (
              id,
              profile_id,
              assigned_from,
              assigned_to
            )
          )
        `
      )
      .order("name", { ascending: true })
  ]);

  const navItems = buildPrimaryNav("dashboard");
  const displayName = profile?.full_name ?? user.email ?? "User";
  const roleLabel = formatRoleLabel(profile?.system_role);
  const initials = buildInitials(profile?.full_name, user.email);
  const accessRows = (accessAssignments as AccessAssignmentRow[] | null) ?? [];
  const currentAssignmentRows = (currentUserAssignments as CurrentUserAssignmentRow[] | null) ?? [];
  const recentTimesheetRows = (recentTimesheets as TimesheetRow[] | null) ?? [];
  const currentWeekTimesheet =
    recentTimesheetRows.find((row) => row.week_start === currentWeekStart) ?? null;
  const currentCapacityPercent =
    ((currentCapacityRows as CapacityRow[] | null) ?? [])[0]?.capacity_percent ?? 100;
  const visibleProjectRows = (visibleProjects as VisibleProjectRow[] | null) ?? [];

  const assignedPortfolioIds = new Set(
    accessRows
      .map((assignment) => assignment.portfolio_id)
      .filter((value): value is string => Boolean(value))
  );
  const assignedProgramIds = new Set(
    accessRows
      .map((assignment) => assignment.program_id)
      .filter((value): value is string => Boolean(value))
  );
  const assignedProjectIds = new Set(
    accessRows
      .map((assignment) => assignment.project_id)
      .filter((value): value is string => Boolean(value))
  );

  const manageableProjects =
    profile?.system_role === "portfolio_manager"
      ? visibleProjectRows
      : visibleProjectRows.filter(
          (project) =>
            project.internal_project_lead_id === user.id ||
            assignedProjectIds.has(project.id) ||
            (!!project.program_id && assignedProgramIds.has(project.program_id)) ||
            assignedPortfolioIds.has(project.portfolio_id)
        );

  const manageableProjectIds = manageableProjects.map((project) => project.id);

  const { data: currentStatusReports } = manageableProjectIds.length
    ? await supabase
        .from("status_reports")
        .select("id, project_id, week_start, state")
        .in("project_id", manageableProjectIds)
        .eq("week_start", currentWeekStart)
    : { data: [] };

  const staffedProfileIdsOnManagedProjects = Array.from(
    new Set(
      manageableProjects.flatMap((project) =>
        (project.project_positions ?? []).flatMap((position) =>
          (position.project_assignments ?? []).map((assignment) => assignment.profile_id)
        )
      )
    )
  );

  const [{ data: managedAssignmentWeeks }, { data: capacityHistory }] = await Promise.all([
    staffedProfileIdsOnManagedProjects.length
      ? supabase
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
                  project_id
                )
              )
            `
          )
          .eq("week_start", currentWeekStart)
          .in("project_assignments.profile_id", staffedProfileIdsOnManagedProjects)
      : Promise.resolve({ data: [] }),
    staffedProfileIdsOnManagedProjects.length
      ? supabase
          .from("employment_capacity_history")
          .select("profile_id, capacity_percent, valid_from, valid_to")
          .in("profile_id", staffedProfileIdsOnManagedProjects)
          .lte("valid_from", currentWeekStart)
          .or(`valid_to.is.null,valid_to.gte.${currentWeekStart}`)
      : Promise.resolve({ data: [] })
  ]);

  const currentWeekStatus = calculateCurrentWeekStatus({
    activeAssignments: currentAssignmentRows,
    currentCapacityPercent,
    currentWeekStart,
    currentWeekTimesheet
  });

  const openRecentWeeks = recentTimesheetRows.filter((row) => row.status === "draft");
  const currentStatusReportMap = new Map(
    ((currentStatusReports as StatusReportRow[] | null) ?? []).map((report) => [report.project_id, report])
  );

  const capacityByProfileId = new Map<string, number>();
  for (const row of (capacityHistory as CapacityRow[] | null) ?? []) {
    if (!row.profile_id || capacityByProfileId.has(row.profile_id)) {
      continue;
    }

    capacityByProfileId.set(row.profile_id, row.capacity_percent);
  }

  const profileWeekTotals = new Map<string, number>();
  for (const row of (managedAssignmentWeeks as AssignmentWeekRow[] | null) ?? []) {
    const profileId = row.project_assignments?.profile_id;

    if (!profileId) {
      continue;
    }

    const value =
      row.assigned_allocation_percent !== null
        ? Number(row.assigned_allocation_percent)
        : (Number(row.assigned_hours) / FULL_TIME_HOURS_PER_WEEK) * 100;

    profileWeekTotals.set(profileId, (profileWeekTotals.get(profileId) ?? 0) + value);
  }

  const overcapacityAssignmentsByProjectId = new Map<string, number>();
  for (const row of (managedAssignmentWeeks as AssignmentWeekRow[] | null) ?? []) {
    const profileId = row.project_assignments?.profile_id;
    const projectId = row.project_assignments?.project_positions?.project_id;

    if (!profileId || !projectId) {
      continue;
    }

    const capacity = capacityByProfileId.get(profileId) ?? 100;
    const total = profileWeekTotals.get(profileId) ?? 0;

    if (total > capacity) {
      overcapacityAssignmentsByProjectId.set(
        projectId,
        (overcapacityAssignmentsByProjectId.get(projectId) ?? 0) + 1
      );
    }
  }

  const leadershipSignals: LeadershipProjectSignal[] = manageableProjects
    .filter((project) => ["planned", "active", "on_hold"].includes(project.lifecycle_status))
    .map((project) => {
      const activePositions = (project.project_positions ?? []).filter(
        (position) =>
          position.is_active && isDateRangeActiveForWeek(position.start_date, position.end_date, currentWeekStart)
      );
      const unstaffedPositions = activePositions.filter((position) => {
        const hasActiveAssignment = (position.project_assignments ?? []).some((assignment) =>
          isDateRangeActiveForWeek(assignment.assigned_from, assignment.assigned_to, currentWeekStart)
        );

        return !hasActiveAssignment;
      }).length;
      const report = currentStatusReportMap.get(project.id);

      return {
        id: project.id,
        name: project.name,
        draftReport: report?.state === "draft",
        missingReport: !report,
        overcapacityAssignments: overcapacityAssignmentsByProjectId.get(project.id) ?? 0,
        unstaffedPositions,
        withoutPositions: activePositions.length === 0
      };
    });

  const leadershipAttentionProjects = leadershipSignals.filter(
    (signal) =>
      signal.missingReport ||
      signal.draftReport ||
      signal.withoutPositions ||
      signal.unstaffedPositions > 0 ||
      signal.overcapacityAssignments > 0
  );
  const missingReports = leadershipSignals.filter((signal) => signal.missingReport).length;
  const draftReports = leadershipSignals.filter((signal) => signal.draftReport).length;
  const projectsWithoutPositions = leadershipSignals.filter((signal) => signal.withoutPositions).length;
  const totalUnstaffedPositions = leadershipSignals.reduce(
    (sum, signal) => sum + signal.unstaffedPositions,
    0
  );
  const overcapacityProjectCount = leadershipSignals.filter(
    (signal) => signal.overcapacityAssignments > 0
  ).length;

  return (
    <AppFrame
      actions={
        <>
          <Link className="profile-trigger" href="/profile">
            <span className="profile-trigger-avatar">{initials}</span>
            <span className="profile-trigger-copy">
              <strong>Mein Profil</strong>
              <span>{displayName}</span>
            </span>
          </Link>

          <form action={logout}>
            <button className="cta cta-secondary" type="submit">
              Sign out
            </button>
          </form>
        </>
      }
      description="A compact overview of your staffing, current week status and project responsibilities."
      eyebrow="Dashboard"
      navItems={navItems}
      title={`Welcome back, ${displayName}`}
      userLabel={displayName}
    >
      <section className="workspace-grid workspace-grid--three">
        <article className="panel dashboard-card dashboard-profile-card">
          <div className="dashboard-profile-top">
            <span className="dashboard-avatar">{initials}</span>
            <div>
              <div className="card-kicker">Personal overview</div>
              <h2>{displayName}</h2>
              <p className="card-copy">
                {roleLabel} · {formatWeekRange(currentWeekStart)}
              </p>
            </div>
          </div>

          <div className="summary-strip">
            <div>
              <span>Active staffing</span>
              <strong>{currentAssignmentRows.length}</strong>
            </div>
            <div>
              <span>Current week</span>
              <strong>{currentWeekStatus.label}</strong>
            </div>
            <div>
              <span>Managed projects</span>
              <strong>{manageableProjects.length}</strong>
            </div>
            <div>
              <span>Open signals</span>
              <strong>{leadershipAttentionProjects.length + (currentWeekStatus.remainingHours > 0 ? 1 : 0)}</strong>
            </div>
          </div>
        </article>

        <article className="panel dashboard-card">
          <div className="dashboard-card-head">
            <div>
              <div className="card-kicker">My staffing</div>
              <h2>Projects I am staffed on</h2>
            </div>
            <span className={`pill ${currentAssignmentRows.length ? "pill--good" : ""}`}>
              {currentAssignmentRows.length} active
            </span>
          </div>

          {currentAssignmentRows.length ? (
            <div className="dashboard-list">
              {currentAssignmentRows.map((row) => {
                const assignment = row.project_assignments;

                if (!assignment?.project_positions) {
                  return null;
                }

                return (
                  <Link
                    className="dashboard-list-row"
                    href={`/projects/${assignment.project_positions.project_id}`}
                    key={assignment.id}
                  >
                    <div>
                      <strong>{assignment.project_positions.projects?.name ?? "Unknown project"}</strong>
                      <span>{assignment.project_positions.title}</span>
                    </div>
                    <div className="dashboard-row-side">
                      <span className="tag">{formatHours(Number(row.assigned_hours))}</span>
                      <span className="tag">
                        {row.assigned_allocation_percent !== null
                          ? `${Number(row.assigned_allocation_percent).toFixed(0)}%`
                          : "planned"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="ok-box">No active project staffing is assigned for the current week.</div>
          )}
        </article>

        <article className="panel dashboard-card">
          <div className="dashboard-card-head">
            <div>
              <div className="card-kicker">My week</div>
              <h2>Timesheet status</h2>
            </div>
            <span className={`pill ${currentWeekStatus.pillClassName}`}>{currentWeekStatus.label}</span>
          </div>

          <p className="card-copy">{currentWeekStatus.detail}</p>

          <div className="summary-strip">
            <div>
              <span>Target</span>
              <strong>{formatHours(currentWeekStatus.targetHours)}</strong>
            </div>
            <div>
              <span>Captured</span>
              <strong>{formatHours(currentWeekStatus.capturedHours)}</strong>
            </div>
          </div>

          {currentWeekStatus.remainingHours > 0 ? (
            <div className="warning-box">
              <strong>{formatHours(currentWeekStatus.remainingHours)} still open</strong>
              Capture the remaining time before you submit the current week.
            </div>
          ) : null}

          {openRecentWeeks.filter((row) => row.week_start < currentWeekStart).length ? (
            <div className="dashboard-inline-note">
              {openRecentWeeks.filter((row) => row.week_start < currentWeekStart).length} previous week(s) still saved as draft.
            </div>
          ) : (
            <div className="dashboard-inline-note is-good">No earlier draft week is waiting for submission.</div>
          )}
        </article>

        <article className="panel dashboard-card dashboard-card--full">
          <div className="dashboard-card-head">
            <div>
              <div className="card-kicker">Project leadership</div>
              <h2>Responsibilities and signals</h2>
            </div>
            <span className={`pill ${leadershipAttentionProjects.length ? "pill--partial" : "pill--good"}`}>
              {manageableProjects.length} project{manageableProjects.length === 1 ? "" : "s"}
            </span>
          </div>

          {manageableProjects.length ? (
            <>
              <div className="summary-strip">
                <div>
                  <span>Missing reports</span>
                  <strong>{missingReports}</strong>
                </div>
                <div>
                  <span>Draft reports</span>
                  <strong>{draftReports}</strong>
                </div>
                <div>
                  <span>No positions</span>
                  <strong>{projectsWithoutPositions}</strong>
                </div>
                <div>
                  <span>Unstaffed positions</span>
                  <strong>{totalUnstaffedPositions}</strong>
                </div>
                <div>
                  <span>Overcapacity signals</span>
                  <strong>{overcapacityProjectCount}</strong>
                </div>
              </div>

              {leadershipAttentionProjects.length ? (
                <div className="dashboard-list">
                  {leadershipAttentionProjects.map((project) => (
                    <Link className="dashboard-list-row" href={`/projects/${project.id}`} key={project.id}>
                      <div>
                        <strong>{project.name}</strong>
                        <span>
                          {[
                            project.missingReport ? "status report missing" : null,
                            project.draftReport ? "status report still draft" : null,
                            project.withoutPositions ? "no planning positions captured" : null,
                            project.unstaffedPositions > 0
                              ? `${project.unstaffedPositions} unstaffed position(s)`
                              : null,
                            project.overcapacityAssignments > 0
                              ? `${project.overcapacityAssignments} overcapacity signal(s)`
                              : null
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                      <div className="dashboard-row-side">
                        {project.missingReport ? <span className="tag tag--focus">Report</span> : null}
                        {project.unstaffedPositions > 0 ? (
                          <span className="tag tag--focus">Staffing</span>
                        ) : null}
                        {project.overcapacityAssignments > 0 ? (
                          <span className="tag tag--focus">Capacity</span>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="ok-box">
                  Your managed projects are currently up to date: no missing report, no unstaffed position and no visible overcapacity warning is open right now.
                </div>
              )}
            </>
          ) : (
            <div className="ok-box">No current project leadership responsibility is assigned to your user.</div>
          )}
        </article>
      </section>
    </AppFrame>
  );
}
