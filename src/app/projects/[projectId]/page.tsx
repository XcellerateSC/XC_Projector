import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AllocationInput } from "@/components/allocation-input";
import {
  formatProficiencyLabel,
  formatRequirementLevel,
  formatSkillOptionLabel,
  getRequirementWeight,
  type SkillOption
} from "@/lib/skills";
import { getProjectAccessContext } from "@/lib/access";
import { buildPrimaryNav } from "@/lib/navigation";
import {
  normalizeWeekStart,
  normalizeWeekStartString
} from "@/lib/work-week";

import {
  addStatusReportComment,
  createProjectAssignment,
  createProjectPosition,
  endProjectAssignment,
  reassignProjectAssignment,
  removePositionSkillRequirement,
  savePositionSkillRequirement,
  saveStatusReportDraft,
  setProjectPositionActiveState,
  submitStatusReport,
  updateProjectAssignment,
  updateProjectPosition,
  updateProjectWorkspace
} from "./actions";
import {
  buildProjectHref,
  firstRelation,
  formatDate,
  formatDateTime,
  formatHours,
  formatLifecycleLabel,
  formatMatchStatus,
  formatMoney,
  formatPercent,
  formatReportState,
  formatStatusLabel,
  getReportSignal,
  type PositionMatchHint,
  type PositionRow,
  type ProfileRow,
  type ProjectDirectoryRow,
  type ProjectRow,
  type SkillRow,
  type StatusReportCommentRow,
  type StatusReportRow
} from "./project-hub-shared";
import {
  ProjectCockpit,
  type ProjectCockpitAttentionRow,
  type ProjectCockpitListRow
} from "./project-cockpit";
import {
  ProjectPerformance,
  type ProjectPerformanceWeekRow
} from "./project-performance";
import { ProjectsShell } from "../projects-shell";
import {
  SetupDetailPanel,
  SetupSelectionLink,
  SetupSelectionPanel,
  SetupWorkspace
} from "../setup-blueprint";

type ProjectDetailPageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    rail?: string;
    reportWeek?: string;
    section?: string;
    success?: string;
  }>;
};

type ProjectTimeEntryRow = {
  hours: number;
  project_assignment_id: string | null;
  weekly_timesheets:
    | {
        profile_id: string;
        status: "draft" | "submitted";
        week_start: string;
      }
    | {
        profile_id: string;
        status: "draft" | "submitted";
        week_start: string;
      }[]
    | null;
};

function getProjectSelectionTone(
  lifecycleStatus: string
): "good" | "muted" | "neutral" | "warn" {
  switch (lifecycleStatus) {
    case "active":
    case "completed":
      return "good";
    case "on_hold":
      return "warn";
    case "cancelled":
      return "muted";
    default:
      return "neutral";
  }
}

function getProjectStateChipTone(lifecycleStatus: string) {
  switch (lifecycleStatus) {
    case "active":
    case "completed":
      return "is-good";
    case "planned":
    case "draft":
      return "is-focus";
    default:
      return "is-muted";
  }
}

function isDateOlderThanDays(value: string | null, dayCount: number) {
  if (!value) {
    return true;
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return true;
  }

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - dayCount);
  cutoff.setUTCHours(0, 0, 0, 0);

  return parsed.getTime() < cutoff.getTime();
}

export default async function ProjectDetailPageRedirect({
  params,
  searchParams
}: ProjectDetailPageProps) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);

  redirect(
    buildProjectHref(projectId, {
      error: query.error,
      rail: query.rail,
      reportWeek: query.reportWeek,
      section: query.section,
      success: query.success
    })
  );
}

export async function ProjectHubPage({
  params,
  searchParams
}: ProjectDetailPageProps) {
  const [{ projectId }, { error, rail, reportWeek, section, success }] = await Promise.all([
    params,
    searchParams
  ]);
  const activeReportWeek = normalizeWeekStartString(reportWeek);
  const projectAccess = await getProjectAccessContext(projectId);

  if (!projectAccess?.project) {
    notFound();
  }

  if (!projectAccess.canView) {
    redirect("/projects");
  }

  const { profile: currentProfile, supabase, user, userId } = projectAccess;

  const [
    { data: projectDirectory },
    { data: project },
    { data: portfolios },
    { data: programs },
    { data: customers },
    { data: clientUnits },
    { data: grades },
    { data: employees },
    { data: positions },
    { data: statusReports },
    { data: skills }
  ] = await Promise.all([
    supabase
      .from("projects")
      .select(
        `
          id,
          name,
          lifecycle_status,
          customers (
            name
          ),
          client_units (
            name
          ),
          portfolios (
            name
          ),
          programs (
            name
          )
        `
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select(
        `
          id,
          name,
          code,
          description,
          lifecycle_status,
          portfolio_id,
          program_id,
          customer_id,
          client_unit_id,
          internal_project_lead_id,
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
    supabase.from("portfolios").select("id, name").order("name", { ascending: true }),
    supabase
      .from("programs")
      .select("id, name, portfolio_id")
      .order("name", { ascending: true }),
    supabase.from("customers").select("id, name").order("name", { ascending: true }),
    supabase
      .from("client_units")
      .select("id, name, customer_id")
      .order("name", { ascending: true }),
    supabase
      .from("professional_grades")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("profiles")
      .select(
        `
          id,
          full_name,
          system_role,
          employee_skills (
            proficiency_score,
            skills (
              id,
              name,
              skill_categories (
                name
              )
            )
          )
        `
      )
      .eq("is_active", true)
      .order("full_name", { ascending: true }),
    supabase
      .from("project_positions")
      .select(
        `
          id,
          title,
          description,
          professional_grade_id,
          start_date,
          end_date,
          rate_unit,
          rate_amount,
          currency_code,
          is_active,
          professional_grades (
            name
          ),
          project_position_skill_requirements (
            id,
            notes,
            requirement_level,
            weight,
            skills (
              id,
              name,
              skill_categories (
                name
              )
            )
          ),
          project_position_weeks (
            week_start,
            planned_hours,
            planned_allocation_percent
          ),
          project_assignments (
            id,
            profile_id,
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
      .order("week_start", { ascending: false }),
    supabase
      .from("skills")
      .select(
        `
          id,
          name,
          skill_categories (
            name
          )
        `
      )
      .eq("is_active", true)
      .order("name", { ascending: true })
  ]);

  const selectedProject = project as ProjectRow | null;

  if (!selectedProject) {
    notFound();
  }

  const projectDirectoryRows = ((projectDirectory as ProjectDirectoryRow[] | null) ?? []).map(
    (entry) => ({
      ...entry,
      client_units: firstRelation<{ name: string }>(entry.client_units),
      customers: firstRelation<{ name: string }>(entry.customers),
      portfolios: firstRelation<{ name: string }>(entry.portfolios),
      programs: firstRelation<{ name: string }>(entry.programs)
    })
  );
  const portfolioRows = (portfolios as { id: string; name: string }[] | null) ?? [];
  const programRows = (programs as { id: string; name: string; portfolio_id: string }[] | null) ?? [];
  const customerRows = (customers as { id: string; name: string }[] | null) ?? [];
  const clientUnitRows =
    (clientUnits as { customer_id: string; id: string; name: string }[] | null) ?? [];
  const gradeRows = (grades as { id: string; name: string }[] | null) ?? [];
  const employeeRows = (employees as ProfileRow[] | null) ?? [];
  const positionRows = (positions as PositionRow[] | null) ?? [];
  const statusReportRows = (statusReports as StatusReportRow[] | null) ?? [];
  const skillRows = ((skills as SkillRow[] | null) ?? []).map(
    (skill): SkillOption => ({
      categoryName: skill.skill_categories?.name ?? null,
      id: skill.id,
      name: skill.name
    })
  );
  const projectAssignmentMeta = new Map<
    string,
    {
      profileId: string;
      rateAmount: number;
    }
  >();

  for (const position of positionRows) {
    for (const assignment of position.project_assignments ?? []) {
      projectAssignmentMeta.set(assignment.id, {
        profileId: assignment.profile_id,
        rateAmount: Number(position.rate_amount)
      });
    }
  }

  const projectAssignmentIds = Array.from(projectAssignmentMeta.keys());
  const { data: projectTimeEntries } = projectAssignmentIds.length
    ? await supabase
        .from("time_entries")
        .select(
          `
            hours,
            project_assignment_id,
            weekly_timesheets!inner (
              week_start,
              status,
              profile_id
            )
          `
        )
        .eq("entry_type", "project")
        .in("project_assignment_id", projectAssignmentIds)
    : { data: [] };

  const activeSection =
    section === "charter" ||
    section === "performance" ||
    section === "staffing" ||
    section === "status" ||
    section === "overview"
      ? section
      : "overview";
  const railState = rail === "closed" ? "closed" : "open";
  const projectOverviewHref = buildProjectHref(projectId, { rail: railState });
  const projectCharterHref = buildProjectHref(projectId, {
    rail: railState,
    section: "charter"
  });
  const projectStaffingHref = buildProjectHref(projectId, {
    rail: railState,
    section: "staffing"
  });
  const projectStatusHref = buildProjectHref(projectId, {
    rail: railState,
    section: "status"
  });
  const projectPerformanceHref = buildProjectHref(projectId, {
    rail: railState,
    section: "performance"
  });

  const projectPortfolio = firstRelation<{ name: string }>(selectedProject.portfolios);
  const projectProgram = firstRelation<{ name: string }>(selectedProject.programs);
  const projectCustomer = firstRelation<{ name: string }>(selectedProject.customers);
  const projectClientUnit = firstRelation<{ name: string }>(selectedProject.client_units);
  const projectLead = firstRelation<{ full_name: string }>(selectedProject.profiles);
  const projectCharter = firstRelation<{
    milestones_summary: string | null;
    objective: string;
    scope_summary: string | null;
  }>(selectedProject.project_charters);
  const projectFinancials = firstRelation<{
    budget_notes: string | null;
    currency_code: string;
    declared_budget: number | null;
  }>(selectedProject.project_financials);
  const summaryCurrency = projectFinancials?.currency_code ?? positionRows[0]?.currency_code ?? "CHF";
  const charterSummary =
    selectedProject.description ??
    "No project description captured yet.";
  const declaredBudget = Number(projectFinancials?.declared_budget ?? 0);
  const totalAssignments = positionRows.reduce(
    (sum, position) => sum + (position.project_assignments ?? []).length,
    0
  );
  const openPositions = positionRows.filter((position) => !(position.project_assignments ?? []).length).length;
  const plannedStaffingCost = positionRows.reduce((sum, position) => {
    const weeklyHours = (position.project_position_weeks ?? []).reduce(
      (weekSum, week) => weekSum + Number(week.planned_hours),
      0
    );
    return sum + weeklyHours * Number(position.rate_amount);
  }, 0);
  const latestReports = statusReportRows.slice(0, 5);
  const selectedStatusReport =
    statusReportRows.find((report) => report.week_start === activeReportWeek) ?? null;
  const selectedReportDimensions = [
    ["Objective", selectedStatusReport?.objective_status ?? "green", selectedStatusReport?.objective_comment],
    ["Timeline", selectedStatusReport?.timeline_status ?? "green", selectedStatusReport?.timeline_comment],
    ["Budget", selectedStatusReport?.budget_status ?? "green", selectedStatusReport?.budget_comment],
    ["Scope", selectedStatusReport?.scope_status ?? "green", selectedStatusReport?.scope_comment],
    ["Risks", selectedStatusReport?.risks_status ?? "green", selectedStatusReport?.risks_comment]
  ] as const;
  const selectedStatusCounts = selectedReportDimensions.reduce(
    (counts, [, status]) => {
      counts[status] += 1;
      return counts;
    },
    { green: 0, red: 0, yellow: 0 }
  );
  const latestStatusReport = latestReports[0] ?? null;
  const latestReportSignal = getReportSignal(latestStatusReport);
  const lastReportIsStale = isDateOlderThanDays(latestStatusReport?.week_start ?? null, 7);
  const lastReportFreshnessSignal = lastReportIsStale ? "red" : "green";
  const staffingSignal = openPositions ? "red" : "green";
  const charterReady = Boolean(projectCharter?.objective?.trim());
  const scopeReady = Boolean(
    projectCharter?.scope_summary?.trim() || selectedProject.description?.trim()
  );
  const openPositionRows = positionRows.filter(
    (position) => !(position.project_assignments ?? []).length
  );
  const reportAttentionLabel = selectedStatusReport
    ? selectedStatusReport.state === "submitted"
      ? "Weekly report submitted"
      : "Weekly report still in draft"
    : "Weekly report missing";
  const reportAttentionSummary = selectedStatusReport
    ? `${formatDate(activeReportWeek)} / ${formatReportState(selectedStatusReport.state)}`
    : `No report for ${formatDate(activeReportWeek)}`;
  const cockpitRows = [
    {
      href: projectStatusHref,
      key: "status",
      label: reportAttentionLabel,
      summary: reportAttentionSummary,
      tone:
        selectedStatusReport?.state === "submitted"
          ? "good"
          : selectedStatusReport?.state === "draft"
            ? "warn"
            : "warn"
    },
    {
      href: projectStaffingHref,
      key: "staffing",
      label: openPositions ? "Staffing still open" : "Staffing covered",
      summary: openPositions
        ? `${openPositions} of ${positionRows.length} positions still open`
        : `${totalAssignments} assignments across ${positionRows.length} positions`,
      tone: openPositions ? "warn" : "good"
    },
    {
      href: projectCharterHref,
      key: "charter",
      label: charterReady && scopeReady ? "Charter captured" : "Charter needs completion",
      summary: charterReady
        ? projectCharter?.objective ?? charterSummary
        : "Objective, scope and reference links can be tightened here.",
      tone: charterReady && scopeReady ? "good" : "warn"
    }
  ] as const satisfies readonly ProjectCockpitAttentionRow[];
  const cockpitReportRows = latestReports.slice(0, 4).map((report) => ({
    actionLabel: "Open",
    href: buildProjectHref(projectId, {
      rail: railState,
      reportWeek: report.week_start,
      section: "status"
    }),
    id: report.id,
    signal: getReportSignal(report) ?? "green",
    summary: `${report.overall_progress_percent}% progress / ${formatReportState(report.state)}`,
    title: formatDate(report.week_start)
  })) satisfies ProjectCockpitListRow[];
  const cockpitStaffingRows = openPositionRows.slice(0, 4).map((position) => ({
    actionLabel: "Staff",
    href: projectStaffingHref,
    id: position.id,
    summary: `${position.professional_grades?.name ?? "No grade"} / ${formatMoney(position.rate_amount, position.currency_code)} / ${position.rate_unit}`,
    title: position.title
  })) satisfies ProjectCockpitListRow[];
  const performanceByWeek = new Map<
    string,
    {
      assignedHours: number;
      bookedHours: number;
      bookedProfiles: Set<string>;
      bookedValue: number;
      planHours: number;
      planValue: number;
      reportSignal: ReturnType<typeof getReportSignal>;
      reportState: StatusReportRow["state"] | null;
      staffedProfiles: Set<string>;
    }
  >();
  const ensurePerformanceWeek = (weekStart: string) => {
    const existing = performanceByWeek.get(weekStart);

    if (existing) {
      return existing;
    }

    const next = {
      assignedHours: 0,
      bookedHours: 0,
      bookedProfiles: new Set<string>(),
      bookedValue: 0,
      planHours: 0,
      planValue: 0,
      reportSignal: null,
      reportState: null,
      staffedProfiles: new Set<string>()
    };
    performanceByWeek.set(weekStart, next);
    return next;
  };

  for (const position of positionRows) {
    const rateAmount = Number(position.rate_amount);

    for (const week of position.project_position_weeks ?? []) {
      const performanceWeek = ensurePerformanceWeek(week.week_start);
      performanceWeek.planHours += Number(week.planned_hours);
      performanceWeek.planValue += Number(week.planned_hours) * rateAmount;
    }

    for (const assignment of position.project_assignments ?? []) {
      for (const week of assignment.project_assignment_weeks ?? []) {
        const performanceWeek = ensurePerformanceWeek(week.week_start);
        performanceWeek.assignedHours += Number(week.assigned_hours);
        performanceWeek.staffedProfiles.add(assignment.profile_id);
      }
    }
  }

  for (const report of statusReportRows) {
    const performanceWeek = ensurePerformanceWeek(report.week_start);
    performanceWeek.reportSignal = getReportSignal(report);
    performanceWeek.reportState = report.state;
  }

  for (const entry of (projectTimeEntries as ProjectTimeEntryRow[] | null) ?? []) {
    const assignmentId = entry.project_assignment_id;
    const assignmentMeta = assignmentId ? projectAssignmentMeta.get(assignmentId) : null;
    const timesheet = firstRelation<{
      profile_id: string;
      status: "draft" | "submitted";
      week_start: string;
    }>(entry.weekly_timesheets);

    if (!assignmentMeta || !timesheet) {
      continue;
    }

    const performanceWeek = ensurePerformanceWeek(timesheet.week_start);
    performanceWeek.bookedHours += Number(entry.hours);
    performanceWeek.bookedValue += Number(entry.hours) * assignmentMeta.rateAmount;
    performanceWeek.bookedProfiles.add(timesheet.profile_id);
  }

  const performanceRows = Array.from(performanceByWeek.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([weekStart, row]) => {
      const staffingCoveragePercent =
        row.planHours > 0 ? Math.round((row.assignedHours / row.planHours) * 100) : null;
      const timesheetCompletionPercent = row.staffedProfiles.size
        ? Math.round((row.bookedProfiles.size / row.staffedProfiles.size) * 100)
        : null;

      return {
        assignedHours: Number(row.assignedHours.toFixed(2)),
        bookedHours: Number(row.bookedHours.toFixed(2)),
        bookedValue: Number(row.bookedValue.toFixed(2)),
        planHours: Number(row.planHours.toFixed(2)),
        planValue: Number(row.planValue.toFixed(2)),
        reportSignal: row.reportSignal,
        reportState: row.reportState,
        staffingCoveragePercent,
        timesheetCompletionPercent,
        weekStart
      } satisfies ProjectPerformanceWeekRow;
    });
  const totalPlannedHours = performanceRows.reduce((sum, row) => sum + row.planHours, 0);
  const totalAssignedHours = performanceRows.reduce((sum, row) => sum + row.assignedHours, 0);
  const totalBookedHours = performanceRows.reduce((sum, row) => sum + row.bookedHours, 0);
  const totalPlannedValue = performanceRows.reduce((sum, row) => sum + row.planValue, 0);
  const totalBookedValue = performanceRows.reduce((sum, row) => sum + row.bookedValue, 0);
  const forecastValue = performanceRows.reduce((sum, row) => {
    if (row.weekStart > activeReportWeek) {
      return sum + row.planValue;
    }

    return sum + row.bookedValue;
  }, 0);
  const performanceRatio = totalPlannedHours > 0 ? totalBookedHours / totalPlannedHours : null;
  const performanceTone =
    performanceRatio === null
      ? "yellow"
      : performanceRatio > 1.1 || performanceRatio < 0.75
        ? "red"
        : performanceRatio < 0.9
          ? "yellow"
          : "green";
  const moduleItems = [
    {
      href: projectOverviewHref,
      key: "overview",
      label: "Cockpit",
      tone: latestReportSignal ?? "yellow"
    },
    {
      href: projectCharterHref,
      key: "charter",
      label: "Charter",
      tone: charterReady && scopeReady ? "green" : "yellow"
    },
    {
      href: projectStaffingHref,
      key: "staffing",
      label: "Staffing",
      tone: openPositions ? "yellow" : "green"
    },
    {
      href: projectStatusHref,
      key: "status",
      label: "Status",
      tone:
        selectedStatusReport?.state === "submitted"
          ? "green"
          : selectedStatusReport?.state === "draft"
            ? "yellow"
            : "yellow"
    },
    {
      href: projectPerformanceHref,
      key: "performance",
      label: "Performance",
      tone: performanceTone
    }
  ] as const;
  const reportIds = statusReportRows.map((report) => report.id);
  const { data: statusReportComments } = reportIds.length
    ? await supabase
        .from("status_report_comments")
        .select("id, status_report_id, author_profile_id, body, created_at")
        .in("status_report_id", reportIds)
        .order("created_at", { ascending: false })
    : { data: [] };
  const commentsByReportId = new Map<string, StatusReportCommentRow[]>();
  const reportAuthorMap = new Map(employeeRows.map((employee) => [employee.id, employee.full_name]));

  for (const comment of (statusReportComments as StatusReportCommentRow[] | null) ?? []) {
    commentsByReportId.set(comment.status_report_id, [
      ...(commentsByReportId.get(comment.status_report_id) ?? []),
      comment
    ]);
  }

  const currentWeekStart = normalizeWeekStart(new Date()).toISOString().slice(0, 10);
  const matchHintsByPosition = new Map<string, PositionMatchHint[]>();

  for (const position of positionRows) {
    const requirements = [...(position.project_position_skill_requirements ?? [])].sort((left, right) => {
      if (left.requirement_level !== right.requirement_level) {
        return left.requirement_level === "required" ? -1 : 1;
      }

      return (left.skills?.name ?? "").localeCompare(right.skills?.name ?? "");
    });

    if (!requirements.length) {
      continue;
    }

    const requiredRequirements = requirements.filter(
      (requirement) => requirement.requirement_level === "required"
    );
    const preferredRequirements = requirements.filter(
      (requirement) => requirement.requirement_level === "preferred"
    );
    const totalWeight = requirements.reduce((sum, requirement) => sum + Number(requirement.weight), 0);

    const hints = employeeRows
      .map((employee): PositionMatchHint => {
        const employeeSkillMap = new Map(
          ((employee.employee_skills ?? []) as NonNullable<ProfileRow["employee_skills"]>)
            .filter((entry) => entry.skills?.id)
            .map((entry) => [entry.skills?.id as string, entry.proficiency_score])
        );
        const matchedRequirements = requirements.filter(
          (requirement) => requirement.skills?.id && employeeSkillMap.has(requirement.skills.id)
        );
        const missingRequiredSkillNames = requiredRequirements
          .filter((requirement) => requirement.skills?.id && !employeeSkillMap.has(requirement.skills.id))
          .map((requirement) => requirement.skills?.name ?? "Unknown skill");
        const matchedWeight = matchedRequirements.reduce(
          (sum, requirement) => sum + Number(requirement.weight),
          0
        );
        const proficiencyScores = matchedRequirements
          .map((requirement) =>
            requirement.skills?.id ? employeeSkillMap.get(requirement.skills.id) ?? null : null
          )
          .filter((value): value is number => value !== null);
        const proficiencyAverage = proficiencyScores.length
          ? Number(
              (
                proficiencyScores.reduce((sum, value) => sum + value, 0) /
                proficiencyScores.length
              ).toFixed(1)
            )
          : null;
        const matchPercent = totalWeight ? Math.round((matchedWeight / totalWeight) * 100) : 0;
        const status =
          missingRequiredSkillNames.length === 0 && matchPercent >= 75
            ? "strong"
            : missingRequiredSkillNames.length === 0 && matchedRequirements.length > 0
              ? "good"
              : matchedRequirements.length > 0
                ? "partial"
                : "missing";

        return {
          employeeId: employee.id,
          fullName: employee.full_name,
          matchPercent,
          matchedPreferred: preferredRequirements.filter(
            (requirement) => requirement.skills?.id && employeeSkillMap.has(requirement.skills.id)
          ).length,
          matchedRequired: requiredRequirements.length - missingRequiredSkillNames.length,
          missingRequiredSkillNames,
          proficiencyAverage,
          status,
          systemRole: employee.system_role,
          totalPreferred: preferredRequirements.length,
          totalRequired: requiredRequirements.length
        };
      })
      .sort((left, right) => {
        if (left.missingRequiredSkillNames.length !== right.missingRequiredSkillNames.length) {
          return left.missingRequiredSkillNames.length - right.missingRequiredSkillNames.length;
        }

        if (left.matchPercent !== right.matchPercent) {
          return right.matchPercent - left.matchPercent;
        }

        return left.fullName.localeCompare(right.fullName);
      });

    matchHintsByPosition.set(position.id, hints);
  }

  const navItems = buildPrimaryNav("projects");
  const isPortfolioManager = currentProfile.system_role === "portfolio_manager";
  const projectHeaderSubtitle = [
    projectCustomer?.name ?? "No customer",
    projectClientUnit?.name ?? null,
    `${formatDate(selectedProject.start_date)} - ${formatDate(selectedProject.end_date)}`
  ]
    .filter(Boolean)
    .join(" / ");
  const projectStateChipTone = getProjectStateChipTone(selectedProject.lifecycle_status);

  return (
    <ProjectsShell
      activeSection="overview"
      compactChrome
      counts={{
        customers: customerRows.length,
        portfolios: portfolioRows.length,
        programs: programRows.length,
        projects: projectDirectoryRows.length
      }}
      description="Select a project and manage charter, staffing, status and performance in one compact workspace."
      error={error}
      eyebrow="Projects"
      isPortfolioManager={isPortfolioManager}
      navItems={navItems}
      showSectionNav={false}
      success={success}
      title="Project Details"
      userLabel={currentProfile.full_name ?? user.email}
    >
      <SetupWorkspace>
        <SetupSelectionPanel
          action={
            isPortfolioManager ? (
              <Link className="cta cta-secondary" href="/projects/new">
                New project
              </Link>
            ) : undefined
          }
          subtitle={`${projectDirectoryRows.length} visible projects`}
          title="Project Selection"
        >
          {projectDirectoryRows.map((entry) => (
            <SetupSelectionLink
              dotTone={getProjectSelectionTone(entry.lifecycle_status)}
              href={buildProjectHref(entry.id, {
                reportWeek: activeSection === "status" ? activeReportWeek : undefined,
                section: activeSection === "overview" ? undefined : activeSection
              })}
              key={entry.id}
              selected={entry.id === projectId}
              subtitle={`${entry.customers?.name ?? "No customer"}${
                entry.client_units?.name ? ` / ${entry.client_units.name}` : ""
              }`}
              title={entry.name}
              trailing={<span className="pill">{formatLifecycleLabel(entry.lifecycle_status)}</span>}
            />
          ))}
        </SetupSelectionPanel>

        <SetupDetailPanel
          metrics={[
            {
              label: "Status",
              value: (
                <span className={`project-workspace-metric project-workspace-metric--${latestReportSignal ?? "red"}`}>
                  <span className={`status-dot status-dot--${latestReportSignal ?? "red"}`} />
                  <span>
                    {latestStatusReport
                      ? `${formatStatusLabel(latestReportSignal ?? "green")} / ${latestStatusReport.overall_progress_percent}%`
                      : "Missing"}
                  </span>
                </span>
              )
            },
            {
              label: "Staffing",
              value: (
                <span className={`project-workspace-metric project-workspace-metric--${staffingSignal}`}>
                  <span className={`status-dot status-dot--${staffingSignal}`} />
                  <span>{openPositions ? `${openPositions} open` : "Covered"}</span>
                </span>
              )
            },
            {
              label: "Last report",
              value: (
                <span className={`project-workspace-metric project-workspace-metric--${lastReportFreshnessSignal}`}>
                  <span className={`status-dot status-dot--${lastReportFreshnessSignal}`} />
                  <span>{latestStatusReport ? formatDate(latestStatusReport.week_start) : "Missing"}</span>
                </span>
              )
            }
          ]}
          status={
            <span className={`setup-state-chip ${projectStateChipTone}`}>
              <span className="setup-state-chip-dot" />
              {formatLifecycleLabel(selectedProject.lifecycle_status)}
            </span>
          }
          subtitle={projectHeaderSubtitle}
          title={selectedProject.name}
          titleLabel="Project Workspace"
        >
          <div className="project-control-strip">
            <nav className="project-module-strip" aria-label="Project modules">
              {moduleItems.map((item) => (
                <Link
                  className={`project-module-row${activeSection === item.key ? " is-active" : ""}`}
                  href={item.href}
                  key={item.key}
                >
                  <span
                    aria-hidden="true"
                    className={`project-module-tone project-module-tone--${item.tone}`}
                  />

                  <div className="project-module-copy">
                    <strong>{item.label}</strong>
                  </div>
                </Link>
              ))}
            </nav>
          </div>

            <div className={`${activeSection === "overview" ? "project-overview-column" : "project-detail-body"}`}>
              {activeSection === "overview" ? (
                <ProjectCockpit
                  attentionRows={cockpitRows}
                  openPositions={openPositions}
                  positionCount={positionRows.length}
                  reportRows={cockpitReportRows}
                  staffingRows={cockpitStaffingRows}
                  statusHref={projectStatusHref}
                />
              ) : null}
 
              {activeSection === "charter" ? (
                <section className="project-charter-layout">
                  <article className="panel dashboard-card project-form-card">
                    <div className="project-section-head">
                      <div>
                        <div className="card-kicker">Manage project charter</div>
                        <h2>Edit charter and project backbone</h2>
                      </div>
                      <Link className="cta cta-secondary" href={projectOverviewHref}>
                        Back to overview
                      </Link>
                    </div>

                    <form action={updateProjectWorkspace} className="project-form-grid project-charter-form">
                      <input name="project_id" type="hidden" value={projectId} />
                      <input
                        name="milestones_summary"
                        type="hidden"
                        value={projectCharter?.milestones_summary ?? ""}
                      />

                      <label className="field">
                        <span>Portfolio</span>
                        <select defaultValue={selectedProject.portfolio_id ?? ""} name="portfolio_id" required>
                          <option value="">Select portfolio</option>
                          {portfolioRows.map((portfolio) => (
                            <option key={portfolio.id} value={portfolio.id}>
                              {portfolio.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field">
                        <span>Program</span>
                        <select defaultValue={selectedProject.program_id ?? ""} name="program_id">
                          <option value="">Optional program</option>
                          {programRows.map((program) => (
                            <option key={program.id} value={program.id}>
                              {program.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field">
                        <span>Customer</span>
                        <select defaultValue={selectedProject.customer_id ?? ""} name="customer_id" required>
                          <option value="">Select customer</option>
                          {customerRows.map((customer) => (
                            <option key={customer.id} value={customer.id}>
                              {customer.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field">
                        <span>Client unit</span>
                        <select defaultValue={selectedProject.client_unit_id ?? ""} name="client_unit_id">
                          <option value="">Optional client unit</option>
                          {clientUnitRows.map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unit.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field">
                        <span>Project name</span>
                        <input defaultValue={selectedProject.name} name="name" required type="text" />
                      </label>

                      <label className="field">
                        <span>Code</span>
                        <input defaultValue={selectedProject.code ?? ""} name="code" type="text" />
                      </label>

                      <label className="field">
                        <span>Lifecycle</span>
                        <select defaultValue={selectedProject.lifecycle_status} name="lifecycle_status" required>
                          <option value="draft">Draft</option>
                          <option value="planned">Planned</option>
                          <option value="active">Active</option>
                          <option value="on_hold">On hold</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </label>

                      <label className="field">
                        <span>Internal lead</span>
                        <select defaultValue={selectedProject.internal_project_lead_id ?? ""} name="internal_project_lead_id">
                          <option value="">Optional lead</option>
                          {employeeRows
                            .filter((employee) =>
                              ["project_lead", "portfolio_manager"].includes(employee.system_role)
                            )
                            .map((employee) => (
                              <option key={employee.id} value={employee.id}>
                                {employee.full_name}
                              </option>
                            ))}
                        </select>
                      </label>

                      <label className="field">
                        <span>Start date</span>
                        <input defaultValue={selectedProject.start_date} name="start_date" required type="date" />
                      </label>

                      <label className="field">
                        <span>End date</span>
                        <input defaultValue={selectedProject.end_date ?? ""} name="end_date" type="date" />
                      </label>

                      <label className="field">
                        <span>Declared budget</span>
                        <input
                          defaultValue={projectFinancials?.declared_budget ?? ""}
                          min="0"
                          name="declared_budget"
                          step="0.01"
                          type="number"
                        />
                      </label>

                      <label className="field field--full project-charter-text">
                        <span>Description</span>
                        <textarea defaultValue={selectedProject.description ?? ""} name="description" rows={6} />
                      </label>

                      <label className="field field--full project-charter-text">
                        <span>Objective</span>
                        <textarea defaultValue={projectCharter?.objective ?? ""} name="objective" required rows={6} />
                      </label>

                      <label className="field field--full project-charter-text">
                        <span>Workstreams</span>
                        <textarea defaultValue={projectCharter?.scope_summary ?? ""} name="scope_summary" rows={6} />
                      </label>

                      <label className="field field--full project-charter-text">
                        <span>Budget notes</span>
                        <textarea defaultValue={projectFinancials?.budget_notes ?? ""} name="budget_notes" rows={6} />
                      </label>

                      <div className="field field--full project-form-actions">
                        <button className="cta cta-primary" type="submit">
                          Save project changes
                        </button>
                      </div>
                    </form>
                  </article>
                </section>
              ) : null}

              {activeSection === "status" ? (
                <section className="workspace-grid workspace-grid--project">
                  <article className="panel dashboard-card project-form-card">
                    <div className="project-section-head">
                      <div>
                        <div className="card-kicker">Status reporting</div>
                        <h2>{selectedStatusReport ? "Edit draft report" : "Create weekly report"}</h2>
                      </div>
                      <Link className="cta cta-secondary" href={projectOverviewHref}>
                        Back to overview
                      </Link>
                    </div>

                    <div className="status-composer-preview">
                      <div className="status-composer-head">
                        <div>
                          <strong>{formatDate(activeReportWeek)}</strong>
                          <span>
                            {selectedStatusReport
                              ? `Editing ${selectedStatusReport.state} report`
                              : "Preview for a new weekly report"}
                          </span>
                        </div>
                        <span className="pill">
                          {(selectedStatusReport?.overall_progress_percent ?? 0)}% progress
                        </span>
                      </div>

                      <div className="status-progress-track" aria-hidden="true">
                        <span
                          className="status-progress-fill"
                          style={{ width: `${selectedStatusReport?.overall_progress_percent ?? 0}%` }}
                        />
                      </div>

                      <div className="status-composer-grid">
                        <div>
                          <span>Green</span>
                          <strong>{selectedStatusCounts.green}</strong>
                        </div>
                        <div>
                          <span>Yellow</span>
                          <strong>{selectedStatusCounts.yellow}</strong>
                        </div>
                        <div>
                          <span>Red</span>
                          <strong>{selectedStatusCounts.red}</strong>
                        </div>
                      </div>
                    </div>

                    <form action={saveStatusReportDraft} className="project-form-grid">
                      <input name="project_id" type="hidden" value={projectId} />

                      <label className="field">
                        <span>Reporting week</span>
                        <input defaultValue={activeReportWeek} name="report_week_start" required type="date" />
                      </label>

                      <label className="field">
                        <span>Overall progress</span>
                        <select defaultValue={String(selectedStatusReport?.overall_progress_percent ?? 0)} name="overall_progress_percent">
                          {Array.from({ length: 11 }, (_, index) => index * 10).map((value) => (
                            <option key={value} value={value}>
                              {value}%
                            </option>
                          ))}
                        </select>
                      </label>

                      {selectedReportDimensions.map(([label, statusValue, commentValue]) => {
                        const fieldKey = label.toLowerCase();
                        return (
                          <div className="status-field-pair field--full" key={label}>
                            <label className="field">
                              <span>{label} status</span>
                              <select defaultValue={statusValue} name={`${fieldKey}_status`}>
                                <option value="green">Green</option>
                                <option value="yellow">Yellow</option>
                                <option value="red">Red</option>
                              </select>
                            </label>

                            <label className="field status-field-comment">
                              <span>{label} comment</span>
                              <input
                                defaultValue={commentValue ?? ""}
                                name={`${fieldKey}_comment`}
                                placeholder={`${label} summary or issue context`}
                                type="text"
                              />
                            </label>

                            <div className="status-field-indicator" aria-hidden="true">
                              <span className={`status-dot status-dot--${statusValue}`} />
                              <strong>{formatStatusLabel(statusValue)}</strong>
                            </div>
                          </div>
                        );
                      })}

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

                    <div className="status-report-list">
                      {statusReportRows.length ? (
                        statusReportRows.map((report) => {
                          const comments = commentsByReportId.get(report.id) ?? [];
                          const reportHref = buildProjectHref(projectId, {
                            rail: railState,
                            reportWeek: report.week_start,
                            section: "status"
                          });

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
                                        <strong>{reportAuthorMap.get(comment.author_profile_id) ?? "Unknown author"}</strong>
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
                                  <input name="report_week_start" type="hidden" value={report.week_start} />
                                  <input name="status_report_id" type="hidden" value={report.id} />
                                  <label className="field">
                                    <span>Add comment</span>
                                    <input name="body" placeholder="Add context, clarification or follow-up" type="text" />
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
                          No status reports yet.
                        </article>
                      )}
                    </div>
                  </article>
                </section>
              ) : null}

              {activeSection === "performance" ? (
                <ProjectPerformance
                  currencyCode={summaryCurrency}
                  declaredBudget={declaredBudget}
                  forecastValue={forecastValue}
                  overviewHref={projectOverviewHref}
                  rows={performanceRows}
                  totalAssignedHours={totalAssignedHours}
                  totalBookedHours={totalBookedHours}
                  totalBookedValue={totalBookedValue}
                  totalPlannedHours={totalPlannedHours}
                  totalPlannedValue={totalPlannedValue}
                />
              ) : null}

              {activeSection === "staffing" ? (
                <>
                  <section className="workspace-grid workspace-grid--project">
                    <article className="panel dashboard-card project-form-card">
                      <div className="project-section-head">
                        <div>
                          <div className="card-kicker">Demand planning</div>
                          <h2>Create project position</h2>
                        </div>
                        <Link className="cta cta-secondary" href={projectOverviewHref}>
                          Back to overview
                        </Link>
                      </div>

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
                          <input defaultValue={selectedProject.start_date} name="start_date" required type="date" />
                        </label>

                        <label className="field">
                          <span>End date</span>
                          <input defaultValue={selectedProject.end_date ?? ""} name="end_date" type="date" />
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
                          <input defaultValue="180" min="0" name="rate_amount" required step="0.01" type="number" />
                        </label>

                        <label className="field field--full">
                          <span>Description</span>
                          <textarea name="description" placeholder="Optional delivery note or staffing intention" rows={3} />
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

                      <form action={createProjectAssignment} className="project-form-grid">
                        <input name="project_id" type="hidden" value={projectId} />

                        <label className="field field--full">
                          <span>Position</span>
                          <select name="project_position_id" required>
                            <option value="">Select position</option>
                            {positionRows.map((position) => (
                              <option disabled={!position.is_active} key={position.id} value={position.id}>
                                {position.title} / {position.professional_grades?.name ?? "No grade"}
                                {position.is_active ? "" : " (inactive)"}
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
                                {employee.full_name} / {employee.system_role.replaceAll("_", " ")}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="field">
                          <span>Assigned from</span>
                          <input defaultValue={selectedProject.start_date} name="assigned_from" required type="date" />
                        </label>

                        <label className="field">
                          <span>Assigned to</span>
                          <input defaultValue={selectedProject.end_date ?? ""} name="assigned_to" type="date" />
                        </label>

                        <AllocationInput hoursLabel="Hours / week" inputName="assigned_hours" />

                        <label className="field field--full">
                          <span>Notes</span>
                          <textarea name="notes" placeholder="Optional context for this staffing decision" rows={3} />
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
                    {positionRows.length ? (
                      positionRows.map((position) => {
                        const plannedWeeks = position.project_position_weeks ?? [];
                        const assignmentRows = position.project_assignments ?? [];
                        const averagePlannedHours =
                          plannedWeeks.reduce((sum, week) => sum + week.planned_hours, 0) /
                          (plannedWeeks.length || 1);
                        const averagePlannedAllocation =
                          plannedWeeks.reduce(
                            (sum, week) => sum + (week.planned_allocation_percent ?? 0),
                            0
                          ) / (plannedWeeks.length || 1);
                        const assignedHours = assignmentRows.reduce(
                          (sum, assignment) =>
                            sum + Number(assignment.project_assignment_weeks?.[0]?.assigned_hours ?? 0),
                          0
                        );

                        return (
                          <article className="panel position-card" key={position.id}>
                            <div className="position-card-top">
                              <div>
                                <div className="card-kicker">Position</div>
                                <h2>{position.title}</h2>
                                <p>
                                  {position.professional_grades?.name ?? "No grade"} /{" "}
                                  {formatDate(position.start_date)} - {formatDate(position.end_date)}
                                </p>
                              </div>
                              <div className="position-chip-group">
                                <span className={`pill ${position.is_active ? "pill--strong" : "pill--missing"}`}>
                                  {position.is_active ? "Active position" : "Inactive position"}
                                </span>
                                <span className="pill">{averagePlannedHours.toFixed(1)}h / week planned</span>
                                <span className="pill">{averagePlannedAllocation.toFixed(0)}% planned</span>
                                <form action={setProjectPositionActiveState}>
                                  <input name="project_id" type="hidden" value={projectId} />
                                  <input name="position_id" type="hidden" value={position.id} />
                                  <input name="next_is_active" type="hidden" value={position.is_active ? "false" : "true"} />
                                  <button className="cta cta-secondary" type="submit">
                                    {position.is_active ? "Deactivate" : "Reactivate"}
                                  </button>
                                </form>
                              </div>
                            </div>

                            {position.description ? <p className="card-copy">{position.description}</p> : null}

                            <div className="staffing-summary-strip">
                              <div>
                                <span>Assigned people</span>
                                <strong>{assignmentRows.length}</strong>
                              </div>
                              <div>
                                <span>Planned demand</span>
                                <strong>{averagePlannedHours.toFixed(1)}h / week</strong>
                              </div>
                              <div>
                                <span>Staffed today</span>
                                <strong>{assignedHours.toFixed(1)}h / week</strong>
                              </div>
                              <div>
                                <span>Open roles</span>
                                <strong>{assignmentRows.length ? 0 : 1}</strong>
                              </div>
                            </div>

                            <section className="position-detail-grid">
                              <article className="position-subcard">
                                <div className="skill-section-head">
                                  <strong>Required skills</strong>
                                  <span>{(position.project_position_skill_requirements ?? []).length} linked</span>
                                </div>

                                {(position.project_position_skill_requirements ?? []).length ? (
                                  <div className="skill-badge-list">
                                    {[...(position.project_position_skill_requirements ?? [])]
                                      .sort((left, right) => {
                                        if (left.requirement_level !== right.requirement_level) {
                                          return left.requirement_level === "required" ? -1 : 1;
                                        }

                                        return (left.skills?.name ?? "").localeCompare(right.skills?.name ?? "");
                                      })
                                      .map((requirement) => (
                                        <div className="skill-badge" key={requirement.id}>
                                          <div className="skill-badge-copy">
                                            <strong>{requirement.skills?.name ?? "Unknown skill"}</strong>
                                            <span>
                                              {(requirement.skills?.skill_categories?.name ?? "Uncategorized") +
                                                ` / ${formatRequirementLevel(requirement.requirement_level)}`}
                                            </span>
                                          </div>

                                          <form action={removePositionSkillRequirement}>
                                            <input name="project_id" type="hidden" value={projectId} />
                                            <input name="requirement_id" type="hidden" value={requirement.id} />
                                            <button className="skill-remove" type="submit">
                                              Remove
                                            </button>
                                          </form>
                                        </div>
                                      ))}
                                  </div>
                                ) : (
                                  <div className="skill-list-empty">No skill requirements captured yet.</div>
                                )}

                                {skillRows.length ? (
                                  <form action={savePositionSkillRequirement} className="inline-form inline-form--divider">
                                    <input name="project_id" type="hidden" value={projectId} />
                                    <input name="project_position_id" type="hidden" value={position.id} />

                                    <label className="field">
                                      <span>Skill</span>
                                      <select name="skill_id" required>
                                        <option value="">Select skill</option>
                                        {skillRows.map((skill) => (
                                          <option key={skill.id} value={skill.id}>
                                            {formatSkillOptionLabel(skill)}
                                          </option>
                                        ))}
                                      </select>
                                    </label>

                                    <label className="field">
                                      <span>Requirement level</span>
                                      <select defaultValue="required" name="requirement_level">
                                        <option value="required">Required</option>
                                        <option value="preferred">Preferred</option>
                                      </select>
                                    </label>

                                    <label className="field">
                                      <span>Notes</span>
                                      <input name="notes" placeholder="Optional relevance or delivery context" type="text" />
                                    </label>

                                    <button className="cta cta-secondary" type="submit">
                                      Save requirement
                                    </button>
                                  </form>
                                ) : null}
                              </article>

                              <article className="position-subcard">
                                <div className="skill-section-head">
                                  <strong>Edit position</strong>
                                  <span>Update planning and delivery shape</span>
                                </div>

                                <form action={updateProjectPosition} className="project-form-grid">
                                  <input name="project_id" type="hidden" value={projectId} />
                                  <input name="position_id" type="hidden" value={position.id} />

                                  <label className="field">
                                    <span>Position title</span>
                                    <input defaultValue={position.title} name="title" required type="text" />
                                  </label>

                                  <label className="field">
                                    <span>Professional grade</span>
                                    <select defaultValue={position.professional_grade_id} name="professional_grade_id" required>
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
                                    <input defaultValue={position.start_date} name="start_date" required type="date" />
                                  </label>

                                  <label className="field">
                                    <span>End date</span>
                                    <input defaultValue={position.end_date ?? ""} name="end_date" type="date" />
                                  </label>

                                  <label className="field">
                                    <span>Planned hours / week</span>
                                    <input
                                      defaultValue={averagePlannedHours.toFixed(2)}
                                      min="0"
                                      name="planned_hours"
                                      required
                                      step="0.25"
                                      type="number"
                                    />
                                  </label>

                                  <label className="field">
                                    <span>Rate unit</span>
                                    <select defaultValue={position.rate_unit} name="rate_unit">
                                      <option value="hourly">Hourly</option>
                                      <option value="daily">Daily</option>
                                      <option value="weekly">Weekly</option>
                                    </select>
                                  </label>

                                  <label className="field">
                                    <span>Rate amount</span>
                                    <input
                                      defaultValue={position.rate_amount}
                                      min="0"
                                      name="rate_amount"
                                      required
                                      step="0.01"
                                      type="number"
                                    />
                                  </label>

                                  <label className="field field--full">
                                    <span>Description</span>
                                    <textarea defaultValue={position.description ?? ""} name="description" rows={3} />
                                  </label>

                                  <div className="field field--full project-form-actions">
                                    <button className="cta cta-secondary" type="submit">
                                      Save position
                                    </button>
                                  </div>
                                </form>
                              </article>

                              <article className="position-subcard">
                                <div className="skill-section-head">
                                  <strong>Candidate fit hints</strong>
                                  <span>{(matchHintsByPosition.get(position.id) ?? []).slice(0, 5).length} shown</span>
                                </div>

                                {(position.project_position_skill_requirements ?? []).length ? (
                                  <div className="match-list">
                                    {(matchHintsByPosition.get(position.id) ?? []).slice(0, 5).map((match) => (
                                      <article className={`match-row match-row--${match.status}`} key={`${position.id}:${match.employeeId}`}>
                                        <div className="match-row-top">
                                          <div>
                                            <h3>{match.fullName}</h3>
                                            <p>{match.systemRole.replaceAll("_", " ")}</p>
                                          </div>
                                          <span className={`pill pill--${match.status}`}>
                                            {formatMatchStatus(match.status)}
                                          </span>
                                        </div>

                                        <div className="match-metrics">
                                          <span className="tag">{match.matchPercent}% weighted match</span>
                                          <span className="tag">{match.matchedRequired}/{match.totalRequired} required</span>
                                          <span className="tag">{match.matchedPreferred}/{match.totalPreferred} preferred</span>
                                          {match.proficiencyAverage !== null ? (
                                            <span className="tag">
                                              {formatProficiencyLabel(Math.round(match.proficiencyAverage))} average
                                            </span>
                                          ) : null}
                                        </div>

                                        <p className="match-note">
                                          {match.missingRequiredSkillNames.length
                                            ? `Missing required: ${match.missingRequiredSkillNames.join(", ")}`
                                            : "All required skills are covered for this profile."}
                                        </p>
                                      </article>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="skill-list-empty">
                                    Candidate hints appear once at least one required or preferred skill is linked to the position.
                                  </div>
                                )}
                              </article>
                            </section>

                            <div className="assignment-list">
                              {assignmentRows.length ? (
                                assignmentRows.map((assignment) => {
                                  const firstWeek = assignment.project_assignment_weeks?.[0];

                                  return (
                                    <article className="assignment-row" key={assignment.id}>
                                      <div className="assignment-row-top">
                                        <div>
                                          <h3>{assignment.profiles?.full_name ?? "Unknown employee"}</h3>
                                          <p>{formatDate(assignment.assigned_from)} - {formatDate(assignment.assigned_to)}</p>
                                        </div>
                                        {firstWeek ? (
                                          <div className="assignment-chip-group">
                                            <span className="pill">{firstWeek.assigned_hours.toFixed(1)}h / week</span>
                                            <span className="pill">{formatPercent(firstWeek.assigned_allocation_percent)}</span>
                                          </div>
                                        ) : null}
                                      </div>

                                      {firstWeek ? (
                                        <div className="assignment-loadbar" aria-hidden="true">
                                          <span
                                            className="assignment-loadbar-fill"
                                            style={{ width: `${Math.min(100, Number(firstWeek.assigned_allocation_percent ?? 0))}%` }}
                                          />
                                        </div>
                                      ) : null}

                                      {assignment.notes ? <p className="card-copy">{assignment.notes}</p> : null}

                                      <div className="assignment-management-grid">
                                        <article className="position-subcard">
                                          <div className="skill-section-head">
                                            <strong>Edit assignment</strong>
                                            <span>Dates, hours and notes</span>
                                          </div>

                                          <form action={updateProjectAssignment} className="project-form-grid">
                                            <input name="project_id" type="hidden" value={projectId} />
                                            <input name="assignment_id" type="hidden" value={assignment.id} />

                                            <label className="field">
                                              <span>Assigned from</span>
                                              <input defaultValue={assignment.assigned_from} name="assigned_from" required type="date" />
                                            </label>

                                            <label className="field">
                                              <span>Assigned to</span>
                                              <input defaultValue={assignment.assigned_to ?? ""} name="assigned_to" type="date" />
                                            </label>

                                            <label className="field">
                                              <span>Hours / week</span>
                                              <input
                                                defaultValue={firstWeek?.assigned_hours ?? ""}
                                                min="0"
                                                name="assigned_hours"
                                                required
                                                step="0.25"
                                                type="number"
                                              />
                                            </label>

                                            <label className="field field--full">
                                              <span>Notes</span>
                                              <textarea defaultValue={assignment.notes ?? ""} name="notes" rows={3} />
                                            </label>

                                            <div className="field field--full project-form-actions">
                                              <button className="cta cta-secondary" type="submit">
                                                Save assignment
                                              </button>
                                            </div>
                                          </form>
                                        </article>

                                        <article className="position-subcard">
                                          <div className="skill-section-head">
                                            <strong>Reassign or end</strong>
                                            <span>Preserve history by splitting</span>
                                          </div>

                                          <form action={reassignProjectAssignment} className="project-form-grid">
                                            <input name="project_id" type="hidden" value={projectId} />
                                            <input name="assignment_id" type="hidden" value={assignment.id} />

                                            <label className="field field--full">
                                              <span>New employee</span>
                                              <select defaultValue="" name="new_profile_id" required>
                                                <option value="">Select employee</option>
                                                {employeeRows
                                                  .filter((employee) => employee.id !== assignment.profile_id)
                                                  .map((employee) => (
                                                    <option key={employee.id} value={employee.id}>
                                                      {employee.full_name} / {employee.system_role.replaceAll("_", " ")}
                                                    </option>
                                                  ))}
                                              </select>
                                            </label>

                                            <label className="field">
                                              <span>Reassign from week</span>
                                              <input defaultValue={currentWeekStart} name="reassign_from" required type="date" />
                                            </label>

                                            <label className="field">
                                              <span>New end date</span>
                                              <input defaultValue={assignment.assigned_to ?? ""} name="new_assigned_to" type="date" />
                                            </label>

                                            <label className="field">
                                              <span>Hours / week</span>
                                              <input
                                                defaultValue={firstWeek?.assigned_hours ?? ""}
                                                min="0"
                                                name="new_assigned_hours"
                                                required
                                                step="0.25"
                                                type="number"
                                              />
                                            </label>

                                            <label className="field field--full">
                                              <span>Notes for new assignment</span>
                                              <textarea defaultValue={assignment.notes ?? ""} name="notes" rows={3} />
                                            </label>

                                            <div className="field field--full project-form-actions">
                                              <button className="cta cta-secondary" type="submit">
                                                Reassign with split
                                              </button>
                                            </div>
                                          </form>

                                          <form action={endProjectAssignment}>
                                            <input name="project_id" type="hidden" value={projectId} />
                                            <input name="assignment_id" type="hidden" value={assignment.id} />
                                            <button className="cta cta-secondary" type="submit">
                                              End assignment this week
                                            </button>
                                          </form>
                                        </article>
                                      </div>
                                    </article>
                                  );
                                })
                              ) : (
                                <div className="assignment-row assignment-row--empty">
                                  No one staffed yet. Create the first assignment from the staffing form above.
                                </div>
                              )}
                            </div>
                          </article>
                        );
                      })
                    ) : (
                      <article className="panel position-card position-card--empty">
                        No positions created yet. Start by adding the first demand position for this project.
                      </article>
                    )}
                  </section>
                </>
              ) : null}
            </div>
        </SetupDetailPanel>
      </SetupWorkspace>
    </ProjectsShell>
  );
}
