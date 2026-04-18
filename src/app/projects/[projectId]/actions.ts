"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const FULL_TIME_HOURS_PER_WEEK = 40;

function redirectProject(
  projectId: string,
  kind: "error" | "success",
  message: string,
  extraParams?: Record<string, string | null | undefined>
): never {
  const params = new URLSearchParams();
  params.set(kind, message);

  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (value) {
        params.set(key, value);
      }
    }
  }

  redirect(`/projects/${projectId}?${params.toString()}`);
}

function readRequiredText(formData: FormData, key: string, label: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function readOptionalText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readRequiredNumber(formData: FormData, key: string, label: string) {
  const value = readRequiredText(formData, key, label);
  const parsed = Number(value);

  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid number.`);
  }

  return parsed;
}

function calculateAllocationPercent(hoursPerWeek: number) {
  return Number(((hoursPerWeek / FULL_TIME_HOURS_PER_WEEK) * 100).toFixed(2));
}

function normalizeWeekStart(date: Date) {
  const copy = new Date(date);
  const day = copy.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setUTCDate(copy.getUTCDate() + diff);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function normalizeWeekStartString(value: string | null | undefined) {
  if (!value) {
    return normalizeWeekStart(new Date()).toISOString().slice(0, 10);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Week start must be a valid date.");
  }

  return normalizeWeekStart(parsed).toISOString().slice(0, 10);
}

function readRequiredWeekStart(formData: FormData, key: string, label: string) {
  const value = readRequiredText(formData, key, label);
  return normalizeWeekStartString(value);
}

function readStatusRating(formData: FormData, key: string, label: string) {
  const value = readRequiredText(formData, key, label);

  if (value !== "green" && value !== "yellow" && value !== "red") {
    throw new Error(`${label} must be green, yellow or red.`);
  }

  return value;
}

function readProgressStep(formData: FormData, key: string, label: string) {
  const value = readRequiredNumber(formData, key, label);

  if (value < 0 || value > 100 || value % 10 !== 0) {
    throw new Error(`${label} must be between 0 and 100 in 10% steps.`);
  }

  return value;
}

function generateWeekStarts(startDate: string, endDate: string | null) {
  const start = normalizeWeekStart(new Date(startDate));
  const end = normalizeWeekStart(new Date(endDate ?? startDate));
  const weeks: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    weeks.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  return weeks;
}

async function ensureProjectAccess(projectId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    redirect("/projects");
  }

  return { supabase, userId: user.id };
}

export async function createProjectPosition(formData: FormData) {
  const projectId = readRequiredText(formData, "project_id", "Project");
  let title = "Position";

  try {
    const { supabase } = await ensureProjectAccess(projectId);
    const positionId = crypto.randomUUID();
    title = readRequiredText(formData, "title", "Position title");
    const professionalGradeId = readRequiredText(
      formData,
      "professional_grade_id",
      "Professional grade"
    );
    const startDate = readRequiredText(formData, "start_date", "Start date");
    const endDate = readOptionalText(formData, "end_date");
    const plannedHours = readRequiredNumber(formData, "planned_hours", "Planned hours per week");
    const plannedAllocationPercent = calculateAllocationPercent(plannedHours);
    const rateAmount = readRequiredNumber(formData, "rate_amount", "Rate amount");
    const description = readOptionalText(formData, "description");
    const rateUnit =
      readOptionalText(formData, "rate_unit") === "daily" ||
      readOptionalText(formData, "rate_unit") === "weekly"
        ? readOptionalText(formData, "rate_unit")
        : "hourly";

    const { error: positionError } = await supabase
      .from("project_positions")
      .insert({
        id: positionId,
        project_id: projectId,
        title,
        professional_grade_id: professionalGradeId,
        description,
        start_date: startDate,
        end_date: endDate,
        rate_unit: rateUnit,
        rate_amount: rateAmount
      });

    if (positionError) {
      throw new Error(positionError.message ?? "Could not create position.");
    }

    const weeks = generateWeekStarts(startDate, endDate);
    const { error: weeksError } = await supabase.from("project_position_weeks").insert(
      weeks.map((weekStart) => ({
        project_position_id: positionId,
        week_start: weekStart,
        planned_hours: plannedHours,
        planned_allocation_percent: plannedAllocationPercent
      }))
    );

    if (weeksError) {
      throw new Error(weeksError.message);
    }

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
  } catch (error) {
    redirectProject(
      projectId,
      "error",
      error instanceof Error ? error.message : "Could not create position."
    );
  }

  redirectProject(projectId, "success", `Position "${title}" created.`);
}

export async function createProjectAssignment(formData: FormData) {
  const projectId = readRequiredText(formData, "project_id", "Project");

  try {
    const { supabase } = await ensureProjectAccess(projectId);
    const assignmentId = crypto.randomUUID();
    const projectPositionId = readRequiredText(formData, "project_position_id", "Position");
    const profileId = readRequiredText(formData, "profile_id", "Employee");
    const assignedFrom = readRequiredText(formData, "assigned_from", "Assigned from");
    const assignedTo = readOptionalText(formData, "assigned_to");
    const assignedHours = readRequiredNumber(formData, "assigned_hours", "Assigned hours per week");
    const assignedAllocationPercent = calculateAllocationPercent(assignedHours);
    const notes = readOptionalText(formData, "notes");

    const { error: assignmentError } = await supabase
      .from("project_assignments")
      .insert({
        id: assignmentId,
        project_position_id: projectPositionId,
        profile_id: profileId,
        assigned_from: assignedFrom,
        assigned_to: assignedTo,
        notes
      });

    if (assignmentError) {
      throw new Error(assignmentError.message ?? "Could not create assignment.");
    }

    const weeks = generateWeekStarts(assignedFrom, assignedTo);
    const { error: weeksError } = await supabase.from("project_assignment_weeks").insert(
      weeks.map((weekStart) => ({
        project_assignment_id: assignmentId,
        week_start: weekStart,
        assigned_hours: assignedHours,
        assigned_allocation_percent: assignedAllocationPercent
      }))
    );

    if (weeksError) {
      throw new Error(weeksError.message);
    }

    revalidatePath(`/projects/${projectId}`);
  } catch (error) {
    redirectProject(
      projectId,
      "error",
      error instanceof Error ? error.message : "Could not create assignment."
    );
  }

  redirectProject(projectId, "success", "Staffing assignment created.");
}

async function saveStatusReportInternal(formData: FormData, finalize: boolean) {
  const projectId = readRequiredText(formData, "project_id", "Project");
  const reportWeek = readRequiredWeekStart(formData, "report_week_start", "Reporting week");
  let successMessage = "Status report draft saved.";

  try {
    const { supabase, userId } = await ensureProjectAccess(projectId);
    const overallProgressPercent = readProgressStep(
      formData,
      "overall_progress_percent",
      "Overall progress"
    );
    const objectiveStatus = readStatusRating(formData, "objective_status", "Objective status");
    const timelineStatus = readStatusRating(formData, "timeline_status", "Timeline status");
    const budgetStatus = readStatusRating(formData, "budget_status", "Budget status");
    const scopeStatus = readStatusRating(formData, "scope_status", "Scope status");
    const risksStatus = readStatusRating(formData, "risks_status", "Risks status");
    const objectiveComment = readOptionalText(formData, "objective_comment");
    const timelineComment = readOptionalText(formData, "timeline_comment");
    const budgetComment = readOptionalText(formData, "budget_comment");
    const scopeComment = readOptionalText(formData, "scope_comment");
    const risksComment = readOptionalText(formData, "risks_comment");

    const { data: existingReport } = await supabase
      .from("status_reports")
      .select("id, state")
      .eq("project_id", projectId)
      .eq("week_start", reportWeek)
      .maybeSingle();

    if (existingReport?.state === "submitted") {
      throw new Error("This reporting week has already been submitted and is locked.");
    }

    const payload = {
      project_id: projectId,
      week_start: reportWeek,
      state: finalize ? "submitted" : "draft",
      overall_progress_percent: overallProgressPercent,
      objective_status: objectiveStatus,
      objective_comment: objectiveComment,
      timeline_status: timelineStatus,
      timeline_comment: timelineComment,
      budget_status: budgetStatus,
      budget_comment: budgetComment,
      scope_status: scopeStatus,
      scope_comment: scopeComment,
      risks_status: risksStatus,
      risks_comment: risksComment,
      created_by: existingReport ? undefined : userId,
      submitted_by: finalize ? userId : null,
      submitted_at: finalize ? new Date().toISOString() : null
    };

    if (existingReport) {
      const { error } = await supabase.from("status_reports").update(payload).eq("id", existingReport.id);

      if (error) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await supabase.from("status_reports").insert({
        id: crypto.randomUUID(),
        ...payload
      });

      if (error) {
        throw new Error(error.message);
      }
    }

    revalidatePath(`/projects/${projectId}`);
    successMessage = finalize ? "Status report submitted." : "Status report draft saved.";
  } catch (error) {
    redirectProject(
      projectId,
      "error",
      error instanceof Error ? error.message : "Could not save the status report.",
      { reportWeek }
    );
  }

  redirectProject(projectId, "success", successMessage, { reportWeek });
}

export async function saveStatusReportDraft(formData: FormData) {
  return saveStatusReportInternal(formData, false);
}

export async function submitStatusReport(formData: FormData) {
  return saveStatusReportInternal(formData, true);
}

export async function addStatusReportComment(formData: FormData) {
  const projectId = readRequiredText(formData, "project_id", "Project");
  const reportWeek = normalizeWeekStartString(readOptionalText(formData, "report_week_start"));

  try {
    const { supabase, userId } = await ensureProjectAccess(projectId);
    const statusReportId = readRequiredText(formData, "status_report_id", "Status report");
    const body = readRequiredText(formData, "body", "Comment");

    const { error } = await supabase.from("status_report_comments").insert({
      id: crypto.randomUUID(),
      status_report_id: statusReportId,
      author_profile_id: userId,
      body
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(`/projects/${projectId}`);
  } catch (error) {
    redirectProject(
      projectId,
      "error",
      error instanceof Error ? error.message : "Could not add the comment.",
      { reportWeek }
    );
  }

  redirectProject(projectId, "success", "Comment added.", { reportWeek });
}
