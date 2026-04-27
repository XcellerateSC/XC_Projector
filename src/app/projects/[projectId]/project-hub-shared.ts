import type { SkillRequirementLevel } from "@/lib/skills";

export type ProjectDirectoryRow = {
  client_units: { name: string } | { name: string }[] | null;
  customers: { name: string } | { name: string }[] | null;
  id: string;
  lifecycle_status: string;
  name: string;
  portfolios: { name: string } | { name: string }[] | null;
  programs: { name: string } | { name: string }[] | null;
};

export type ProjectRow = {
  client_unit_id: string | null;
  code: string | null;
  customer_id: string | null;
  description: string | null;
  end_date: string | null;
  id: string;
  internal_project_lead_id: string | null;
  lifecycle_status: string;
  name: string;
  portfolio_id: string | null;
  program_id: string | null;
  start_date: string;
  client_units: { name: string } | { name: string }[] | null;
  customers: { name: string } | { name: string }[] | null;
  portfolios: { name: string } | { name: string }[] | null;
  profiles: { full_name: string } | { full_name: string }[] | null;
  programs: { name: string } | { name: string }[] | null;
  project_charters:
    | {
        objective: string;
        milestones_summary: string | null;
        scope_summary: string | null;
      }
    | {
        objective: string;
        milestones_summary: string | null;
        scope_summary: string | null;
      }[]
    | null;
  project_financials:
    | {
        budget_notes: string | null;
        currency_code: string;
        declared_budget: number | null;
      }
    | {
        budget_notes: string | null;
        currency_code: string;
        declared_budget: number | null;
      }[]
    | null;
};

export type PositionWeekRow = {
  planned_allocation_percent: number | null;
  planned_hours: number;
  week_start: string;
};

export type AssignmentWeekRow = {
  assigned_allocation_percent: number | null;
  assigned_hours: number;
  week_start: string;
};

export type SkillRow = {
  id: string;
  name: string;
  skill_categories: {
    name: string;
  } | null;
};

export type PositionSkillRequirementRow = {
  id: string;
  notes: string | null;
  requirement_level: SkillRequirementLevel;
  weight: number;
  skills: SkillRow | null;
};

export type AssignmentRow = {
  assigned_from: string;
  assigned_to: string | null;
  id: string;
  notes: string | null;
  profile_id: string;
  profiles: {
    full_name: string;
    id: string;
  } | null;
  project_assignment_weeks: AssignmentWeekRow[] | null;
};

export type PositionRow = {
  currency_code: string;
  description: string | null;
  end_date: string | null;
  id: string;
  is_active: boolean;
  professional_grade_id: string;
  professional_grades: { name: string } | null;
  project_assignments: AssignmentRow[] | null;
  project_position_skill_requirements: PositionSkillRequirementRow[] | null;
  project_position_weeks: PositionWeekRow[] | null;
  rate_amount: number;
  rate_unit: string;
  start_date: string;
  title: string;
};

export type ProfileRow = {
  full_name: string;
  id: string;
  system_role: string;
  employee_skills:
    | {
        proficiency_score: number | null;
        skills: SkillRow | null;
      }[]
    | null;
};

export type StatusSignal = "green" | "yellow" | "red";

export type StatusReportRow = {
  budget_comment: string | null;
  budget_status: StatusSignal;
  created_by: string | null;
  id: string;
  objective_comment: string | null;
  objective_status: StatusSignal;
  overall_progress_percent: number;
  risks_comment: string | null;
  risks_status: StatusSignal;
  scope_comment: string | null;
  scope_status: StatusSignal;
  state: "draft" | "submitted";
  submitted_at: string | null;
  submitted_by: string | null;
  timeline_comment: string | null;
  timeline_status: StatusSignal;
  week_start: string;
};

export type StatusReportCommentRow = {
  author_profile_id: string;
  body: string;
  created_at: string;
  id: string;
  status_report_id: string;
};

export type PositionMatchHint = {
  employeeId: string;
  fullName: string;
  matchPercent: number;
  matchedPreferred: number;
  matchedRequired: number;
  missingRequiredSkillNames: string[];
  proficiencyAverage: number | null;
  status: "strong" | "good" | "partial" | "missing";
  systemRole: string;
  totalPreferred: number;
  totalRequired: number;
};

export type ProjectHrefOptions = {
  error?: string;
  rail?: string;
  reportWeek?: string;
  section?: string;
  success?: string;
};

export function firstRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export function formatDate(date: string | null) {
  if (!date) {
    return "Open";
  }

  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(date));
}

export function formatDateTime(date: string | null) {
  if (!date) {
    return "n/a";
  }

  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(date));
}

export function formatMoney(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("de-CH", {
    currency: currencyCode,
    style: "currency"
  }).format(amount);
}

export function formatPercent(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${value}%`;
}

export function formatHours(value: number) {
  return `${value.toFixed(1)}h`;
}

export function formatLifecycleLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function formatStatusLabel(value: StatusSignal) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatMatchStatus(status: PositionMatchHint["status"]) {
  switch (status) {
    case "strong":
      return "Strong fit";
    case "good":
      return "Viable fit";
    case "partial":
      return "Partial fit";
    default:
      return "No fit yet";
  }
}

export function getReportSignal(report: StatusReportRow | null) {
  if (!report) {
    return null;
  }

  const ratings = [
    report.objective_status,
    report.timeline_status,
    report.budget_status,
    report.scope_status,
    report.risks_status
  ];

  if (ratings.includes("red")) {
    return "red";
  }

  if (ratings.includes("yellow")) {
    return "yellow";
  }

  return "green";
}

export function formatReportState(state: StatusReportRow["state"] | null) {
  if (state === "submitted") {
    return "Submitted";
  }

  if (state === "draft") {
    return "Draft";
  }

  return "Missing";
}

export function getProjectInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function buildProjectHref(projectId: string, options?: ProjectHrefOptions) {
  const params = new URLSearchParams();
  params.set("project", projectId);

  if (options?.section) {
    params.set("section", options.section);
  }

  if (options?.rail) {
    params.set("rail", options.rail);
  }

  if (options?.reportWeek) {
    params.set("reportWeek", options.reportWeek);
  }

  if (options?.error) {
    params.set("error", options.error);
  }

  if (options?.success) {
    params.set("success", options.success);
  }

  return `/projects?${params.toString()}`;
}
