"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getRequirementWeight,
  type SkillRequirementLevel
} from "@/lib/skills";
import { getProjectAccessContext } from "@/lib/access";
import {
  FULL_TIME_HOURS_PER_WEEK,
  isoDateString,
  normalizeWeekStart,
  normalizeWeekStartString,
  shiftIsoDate
} from "@/lib/work-week";

type ProjectMutationContext = NonNullable<
  Awaited<ReturnType<typeof getProjectAccessContext>>
>;

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

  params.set("project", projectId);
  redirect(`/projects?${params.toString()}`);
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

function readOptionalNumber(formData: FormData, key: string, label: string) {
  const value = readOptionalText(formData, key);

  if (!value) {
    return null;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid number.`);
  }

  return parsed;
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

function readRequiredWeekStart(formData: FormData, key: string, label: string) {
  const value = readRequiredText(formData, key, label);
  return normalizeWeekStartString(value, {
    invalidMessage: "Week start must be a valid date.",
    strict: true
  });
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

function readLifecycleStatus(formData: FormData, key: string, label: string) {
  const value = readRequiredText(formData, key, label);

  if (
    value !== "draft" &&
    value !== "planned" &&
    value !== "active" &&
    value !== "on_hold" &&
    value !== "completed" &&
    value !== "cancelled"
  ) {
    throw new Error(`${label} is invalid.`);
  }

  return value;
}

function readRateUnit(formData: FormData, key: string) {
  const value = readOptionalText(formData, key);

  if (value === "daily" || value === "weekly") {
    return value;
  }

  return "hourly";
}

function readBooleanString(formData: FormData, key: string, label: string) {
  const value = readRequiredText(formData, key, label);

  if (value !== "true" && value !== "false") {
    throw new Error(`${label} is invalid.`);
  }

  return value === "true";
}

function readSkillRequirementLevel(
  formData: FormData,
  key: string,
  label: string
): SkillRequirementLevel {
  const value = readRequiredText(formData, key, label);

  if (value !== "required" && value !== "preferred") {
    throw new Error(`${label} must be required or preferred.`);
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

async function replacePositionWeeks(
  supabase: ProjectMutationContext["supabase"],
  positionId: string,
  startDate: string,
  endDate: string | null,
  plannedHours: number
) {
  const plannedAllocationPercent = calculateAllocationPercent(plannedHours);
  const { error: deleteError } = await supabase
    .from("project_position_weeks")
    .delete()
    .eq("project_position_id", positionId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const weeks = generateWeekStarts(startDate, endDate);

  if (!weeks.length) {
    return;
  }

  const { error: insertError } = await supabase.from("project_position_weeks").insert(
    weeks.map((weekStart) => ({
      planned_allocation_percent: plannedAllocationPercent,
      planned_hours: plannedHours,
      project_position_id: positionId,
      week_start: weekStart
    }))
  );

  if (insertError) {
    throw new Error(insertError.message);
  }
}

async function replaceAssignmentWeeks(
  supabase: ProjectMutationContext["supabase"],
  assignmentId: string,
  assignedFrom: string,
  assignedTo: string | null,
  assignedHours: number
) {
  const assignedAllocationPercent = calculateAllocationPercent(assignedHours);
  const { error: deleteError } = await supabase
    .from("project_assignment_weeks")
    .delete()
    .eq("project_assignment_id", assignmentId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const weeks = generateWeekStarts(assignedFrom, assignedTo);

  if (!weeks.length) {
    return;
  }

  const { error: insertError } = await supabase.from("project_assignment_weeks").insert(
    weeks.map((weekStart) => ({
      assigned_allocation_percent: assignedAllocationPercent,
      assigned_hours: assignedHours,
      project_assignment_id: assignmentId,
      week_start: weekStart
    }))
  );

  if (insertError) {
    throw new Error(insertError.message);
  }
}

async function ensureProjectViewAccess(projectId: string) {
  const context = await getProjectAccessContext(projectId);

  if (!context?.project) {
    redirect("/projects");
  }

  if (!context.canView) {
    throw new Error("You do not have access to this project.");
  }

  return context;
}

async function ensureProjectManageAccess(projectId: string) {
  const context = await ensureProjectViewAccess(projectId);

  if (!context.canManage) {
    throw new Error("You do not have permission to manage this project.");
  }

  return context;
}

export async function updateProjectWorkspace(formData: FormData) {
  const projectId = readRequiredText(formData, "project_id", "Project");

  try {
    const { supabase } = await ensureProjectManageAccess(projectId);
    const portfolioId = readRequiredText(formData, "portfolio_id", "Portfolio");
    const customerId = readRequiredText(formData, "customer_id", "Customer");
    const name = readRequiredText(formData, "name", "Project name");
    const objective = readRequiredText(formData, "objective", "Objective");
    const startDate = readRequiredText(formData, "start_date", "Start date");
    const lifecycleStatus = readLifecycleStatus(
      formData,
      "lifecycle_status",
      "Lifecycle status"
    );
    const programId = readOptionalText(formData, "program_id");
    const clientUnitId = readOptionalText(formData, "client_unit_id");
    const code = readOptionalText(formData, "code");
    const description = readOptionalText(formData, "description");
    const endDate = readOptionalText(formData, "end_date");
    const internalProjectLeadId = readOptionalText(formData, "internal_project_lead_id");
    const declaredBudget = readOptionalNumber(formData, "declared_budget", "Declared budget");
    const budgetNotes = readOptionalText(formData, "budget_notes");
    const scopeSummary = readOptionalText(formData, "scope_summary");
    const milestonesSummary = readOptionalText(formData, "milestones_summary");

    const { error: projectError } = await supabase
      .from("projects")
      .update({
        client_unit_id: clientUnitId,
        code,
        customer_id: customerId,
        description,
        end_date: endDate,
        internal_project_lead_id: internalProjectLeadId,
        lifecycle_status: lifecycleStatus,
        name,
        portfolio_id: portfolioId,
        program_id: programId,
        start_date: startDate
      })
      .eq("id", projectId);

    if (projectError) {
      throw new Error(projectError.message);
    }

    const { error: charterError } = await supabase
      .from("project_charters")
      .update({
        milestones_summary: milestonesSummary,
        objective,
        scope_summary: scopeSummary
      })
      .eq("project_id", projectId);

    if (charterError) {
      throw new Error(charterError.message);
    }

    const { error: financialError } = await supabase
      .from("project_financials")
      .update({
        budget_notes: budgetNotes,
        declared_budget: declaredBudget
      })
      .eq("project_id", projectId);

    if (financialError) {
      throw new Error(financialError.message);
    }

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
  } catch (error) {
    redirectProject(
      projectId,
      "error",
      error instanceof Error ? error.message : "Could not update the project."
    );
  }

  redirectProject(projectId, "success", "Project workspace updated.");
}

export async function setProjectLifecycleStatus(formData: FormData) {
  const projectId = readRequiredText(formData, "project_id", "Project");

  try {
    const { supabase } = await ensureProjectManageAccess(projectId);
    const lifecycleStatus = readLifecycleStatus(
      formData,
      "lifecycle_status",
      "Lifecycle status"
    );

    const { error } = await supabase
      .from("projects")
      .update({
        lifecycle_status: lifecycleStatus
      })
      .eq("id", projectId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
  } catch (error) {
    redirectProject(
      projectId,
      "error",
      error instanceof Error ? error.message : "Could not update the project lifecycle."
    );
  }

  redirectProject(projectId, "success", "Project lifecycle updated.");
}

export async function createProjectPosition(formData: FormData) {
  const projectId = readRequiredText(formData, "project_id", "Project");
  let title = "Position";

  try {
    const { supabase } = await ensureProjectManageAccess(projectId);
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
    const rateAmount = readRequiredNumber(formData, "rate_amount", "Rate amount");
    const description = readOptionalText(formData, "description");
    const rateUnit = readRateUnit(formData, "rate_unit");

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

    await replacePositionWeeks(supabase, positionId, startDate, endDate, plannedHours);

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

export async function updateProjectPosition(formData: FormData) {
  const projectId = readRequiredText(formData, "project_id", "Project");
  const positionId = readRequiredText(formData, "position_id", "Position");

  try {
    const { supabase } = await ensureProjectManageAccess(projectId);
    const title = readRequiredText(formData, "title", "Position title");
    const professionalGradeId = readRequiredText(
      formData,
      "professional_grade_id",
      "Professional grade"
    );
    const startDate = readRequiredText(formData, "start_date", "Start date");
    const endDate = readOptionalText(formData, "end_date");
    const plannedHours = readRequiredNumber(formData, "planned_hours", "Planned hours per week");
    const rateAmount = readRequiredNumber(formData, "rate_amount", "Rate amount");
    const description = readOptionalText(formData, "description");
    const rateUnit = readRateUnit(formData, "rate_unit");

    const { error: updateError } = await supabase
      .from("project_positions")
      .update({
        description,
        end_date: endDate,
        professional_grade_id: professionalGradeId,
        rate_amount: rateAmount,
        rate_unit: rateUnit,
        start_date: startDate,
        title
      })
      .eq("id", positionId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    await replacePositionWeeks(supabase, positionId, startDate, endDate, plannedHours);

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
  } catch (error) {
    redirectProject(
      projectId,
      "error",
      error instanceof Error ? error.message : "Could not update the position."
    );
  }

  redirectProject(projectId, "success", "Position updated.");
}

export async function setProjectPositionActiveState(formData: FormData) {
  const projectId = readRequiredText(formData, "project_id", "Project");
  const positionId = readRequiredText(formData, "position_id", "Position");

  try {
    const { supabase } = await ensureProjectManageAccess(projectId);
    const isActive = readBooleanString(formData, "next_is_active", "Position state");

    const { error } = await supabase
      .from("project_positions")
      .update({
        is_active: isActive
      })
      .eq("id", positionId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
  } catch (error) {
    redirectProject(
      projectId,
      "error",
      error instanceof Error ? error.message : "Could not update the position state."
    );
  }

  redirectProject(projectId, "success", "Position state updated.");
}

export async function createProjectAssignment(formData: FormData) {
  const projectId = readRequiredText(formData, "project_id", "Project");

  try {
    const { supabase } = await ensureProjectManageAccess(projectId);
    const assignmentId = crypto.randomUUID();
    const projectPositionId = readRequiredText(formData, "project_position_id", "Position");
    const profileId = readRequiredText(formData, "profile_id", "Employee");
    const assignedFrom = readRequiredText(formData, "assigned_from", "Assigned from");
    const assignedTo = readOptionalText(formData, "assigned_to");
    const assignedHours = readRequiredNumber(formData, "assigned_hours", "Assigned hours per week");
    const notes = readOptionalText(formData, "notes");
    const { data: position } = await supabase
      .from("project_positions")
      .select("is_active")
      .eq("id", projectPositionId)
      .maybeSingle();

    if (!position?.is_active) {
      throw new Error("You can only staff active positions.");
    }

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

    await replaceAssignmentWeeks(supabase, assignmentId, assignedFrom, assignedTo, assignedHours);

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/timesheets");
  } catch (error) {
    redirectProject(
      projectId,
      "error",
      error instanceof Error ? error.message : "Could not create assignment."
    );
  }

  redirectProject(projectId, "success", "Staffing assignment created.");
}

export async function updateProjectAssignment(formData: FormData) {
  const projectId = readRequiredText(formData, "project_id", "Project");
  const assignmentId = readRequiredText(formData, "assignment_id", "Assignment");

  try {
    const { supabase } = await ensureProjectManageAccess(projectId);
    const assignedFrom = readRequiredText(formData, "assigned_from", "Assigned from");
    const assignedTo = readOptionalText(formData, "assigned_to");
    const assignedHours = readRequiredNumber(formData, "assigned_hours", "Assigned hours per week");
    const notes = readOptionalText(formData, "notes");

    const { error: updateError } = await supabase
      .from("project_assignments")
      .update({
        assigned_from: assignedFrom,
        assigned_to: assignedTo,
        notes
      })
      .eq("id", assignmentId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    await replaceAssignmentWeeks(supabase, assignmentId, assignedFrom, assignedTo, assignedHours);

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/timesheets");
  } catch (error) {
    redirectProject(
      projectId,
      "error",
      error instanceof Error ? error.message : "Could not update the assignment."
    );
  }

  redirectProject(projectId, "success", "Assignment updated.");
}

export async function reassignProjectAssignment(formData: FormData) {
  const projectId = readRequiredText(formData, "project_id", "Project");
  const assignmentId = readRequiredText(formData, "assignment_id", "Assignment");

  try {
    const { supabase } = await ensureProjectManageAccess(projectId);
    const newProfileId = readRequiredText(formData, "new_profile_id", "New employee");
    const reassignFrom = readRequiredWeekStart(formData, "reassign_from", "Reassign from");
    const newAssignedTo = readOptionalText(formData, "new_assigned_to");
    const newAssignedHours = readRequiredNumber(
      formData,
      "new_assigned_hours",
      "Assigned hours per week"
    );
    const notes = readOptionalText(formData, "notes");

    const { data: assignment, error: assignmentError } = await supabase
      .from("project_assignments")
      .select(
        `
          id,
          profile_id,
          project_position_id,
          assigned_from,
          assigned_to,
          notes,
          project_assignment_weeks (
            assigned_hours
          )
        `
      )
      .eq("id", assignmentId)
      .single();

    if (assignmentError || !assignment) {
      throw new Error(assignmentError?.message ?? "Assignment not found.");
    }

    if (newProfileId === assignment.profile_id) {
      throw new Error("Reassign requires a different employee than the current assignment.");
    }

    const currentAssignedFrom = assignment.assigned_from;
    const currentAssignedTo = assignment.assigned_to;

    if (reassignFrom <= currentAssignedFrom) {
      throw new Error("Reassignment must start after the current assignment start date.");
    }

    if (currentAssignedTo && reassignFrom > currentAssignedTo) {
      throw new Error("Reassignment must fall within the active assignment range.");
    }

    const historicalAssignedHours =
      Number(assignment.project_assignment_weeks?.[0]?.assigned_hours ?? newAssignedHours);
    const oldAssignmentEnd = shiftIsoDate(reassignFrom, -1);

    const { error: closeError } = await supabase
      .from("project_assignments")
      .update({
        assigned_to: oldAssignmentEnd
      })
      .eq("id", assignmentId);

    if (closeError) {
      throw new Error(closeError.message);
    }

    await replaceAssignmentWeeks(
      supabase,
      assignmentId,
      currentAssignedFrom,
      oldAssignmentEnd,
      historicalAssignedHours
    );

    const newAssignmentId = crypto.randomUUID();
    const { error: insertError } = await supabase.from("project_assignments").insert({
      id: newAssignmentId,
      assigned_from: reassignFrom,
      assigned_to: newAssignedTo ?? currentAssignedTo,
      notes: notes ?? assignment.notes,
      profile_id: newProfileId,
      project_position_id: assignment.project_position_id
    });

    if (insertError) {
      throw new Error(insertError.message);
    }

    await replaceAssignmentWeeks(
      supabase,
      newAssignmentId,
      reassignFrom,
      newAssignedTo ?? currentAssignedTo,
      newAssignedHours
    );

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/timesheets");
  } catch (error) {
    redirectProject(
      projectId,
      "error",
      error instanceof Error ? error.message : "Could not reassign the staffing record."
    );
  }

  redirectProject(projectId, "success", "Assignment split and reassigned.");
}

export async function endProjectAssignment(formData: FormData) {
  const projectId = readRequiredText(formData, "project_id", "Project");
  const assignmentId = readRequiredText(formData, "assignment_id", "Assignment");

  try {
    const { supabase } = await ensureProjectManageAccess(projectId);
    const currentWeekStart = isoDateString(normalizeWeekStart(new Date()));
    const { data: assignment, error: assignmentError } = await supabase
      .from("project_assignments")
      .select(
        `
          assigned_from,
          project_assignment_weeks (
            assigned_hours
          )
        `
      )
      .eq("id", assignmentId)
      .single();

    if (assignmentError || !assignment) {
      throw new Error(assignmentError?.message ?? "Assignment not found.");
    }

    if (currentWeekStart < assignment.assigned_from) {
      throw new Error("This assignment has not started yet, so it cannot be ended this week.");
    }

    const assignedHours = Number(
      assignment.project_assignment_weeks?.[0]?.assigned_hours ?? 0
    );

    const { error: updateError } = await supabase
      .from("project_assignments")
      .update({
        assigned_to: currentWeekStart
      })
      .eq("id", assignmentId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    await replaceAssignmentWeeks(
      supabase,
      assignmentId,
      assignment.assigned_from,
      currentWeekStart,
      assignedHours
    );

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/timesheets");
  } catch (error) {
    redirectProject(
      projectId,
      "error",
      error instanceof Error ? error.message : "Could not end the assignment."
    );
  }

  redirectProject(projectId, "success", "Assignment ended for the current week.");
}

export async function saveBillingOverride(formData: FormData) {
  const projectId = readRequiredText(formData, "project_id", "Project");

  try {
    const { supabase, userId } = await ensureProjectManageAccess(projectId);
    const timeEntryId = readRequiredText(formData, "time_entry_id", "Time entry");
    const overrideHours = readRequiredNumber(formData, "override_hours", "Override hours");
    const reason = readOptionalText(formData, "reason");

    const { data: existingOverride } = await supabase
      .from("billing_overrides")
      .select("id")
      .eq("time_entry_id", timeEntryId)
      .maybeSingle();

    if (existingOverride) {
      const { error } = await supabase
        .from("billing_overrides")
        .update({
          override_hours: overrideHours,
          overridden_at: new Date().toISOString(),
          overridden_by: userId,
          reason
        })
        .eq("id", existingOverride.id);

      if (error) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await supabase.from("billing_overrides").insert({
        id: crypto.randomUUID(),
        override_hours: overrideHours,
        overridden_at: new Date().toISOString(),
        overridden_by: userId,
        reason,
        time_entry_id: timeEntryId
      });

      if (error) {
        throw new Error(error.message);
      }
    }

    revalidatePath(`/projects/${projectId}`);
  } catch (error) {
    redirectProject(
      projectId,
      "error",
      error instanceof Error ? error.message : "Could not save the billing override."
    );
  }

  redirectProject(projectId, "success", "Billing override saved.");
}

export async function removeBillingOverride(formData: FormData) {
  const projectId = readRequiredText(formData, "project_id", "Project");

  try {
    const { supabase } = await ensureProjectManageAccess(projectId);
    const billingOverrideId = readRequiredText(
      formData,
      "billing_override_id",
      "Billing override"
    );

    const { error } = await supabase
      .from("billing_overrides")
      .delete()
      .eq("id", billingOverrideId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(`/projects/${projectId}`);
  } catch (error) {
    redirectProject(
      projectId,
      "error",
      error instanceof Error ? error.message : "Could not remove the billing override."
    );
  }

  redirectProject(projectId, "success", "Billing override removed.");
}

export async function savePositionSkillRequirement(formData: FormData) {
  const projectId = readRequiredText(formData, "project_id", "Project");

  try {
    const { supabase } = await ensureProjectManageAccess(projectId);
    const projectPositionId = readRequiredText(formData, "project_position_id", "Position");
    const skillId = readRequiredText(formData, "skill_id", "Skill");
    const requirementLevel = readSkillRequirementLevel(
      formData,
      "requirement_level",
      "Requirement level"
    );
    const notes = readOptionalText(formData, "notes");
    const weight = getRequirementWeight(requirementLevel);

    const { data: existingRequirement } = await supabase
      .from("project_position_skill_requirements")
      .select("id")
      .eq("project_position_id", projectPositionId)
      .eq("skill_id", skillId)
      .maybeSingle();

    if (existingRequirement) {
      const { error } = await supabase
        .from("project_position_skill_requirements")
        .update({
          notes,
          requirement_level: requirementLevel,
          weight
        })
        .eq("id", existingRequirement.id);

      if (error) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await supabase.from("project_position_skill_requirements").insert({
        id: crypto.randomUUID(),
        notes,
        project_position_id: projectPositionId,
        requirement_level: requirementLevel,
        skill_id: skillId,
        weight
      });

      if (error) {
        throw new Error(error.message);
      }
    }

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
  } catch (error) {
    redirectProject(
      projectId,
      "error",
      error instanceof Error ? error.message : "Could not save the skill requirement."
    );
  }

  redirectProject(projectId, "success", "Position skill requirement saved.");
}

export async function removePositionSkillRequirement(formData: FormData) {
  const projectId = readRequiredText(formData, "project_id", "Project");

  try {
    const { supabase } = await ensureProjectManageAccess(projectId);
    const requirementId = readRequiredText(formData, "requirement_id", "Skill requirement");

    const { error } = await supabase
      .from("project_position_skill_requirements")
      .delete()
      .eq("id", requirementId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
  } catch (error) {
    redirectProject(
      projectId,
      "error",
      error instanceof Error ? error.message : "Could not remove the skill requirement."
    );
  }

  redirectProject(projectId, "success", "Position skill requirement removed.");
}

async function saveStatusReportInternal(formData: FormData, finalize: boolean) {
  const projectId = readRequiredText(formData, "project_id", "Project");
  const reportWeek = readRequiredWeekStart(formData, "report_week_start", "Reporting week");
  let successMessage = "Status report draft saved.";

  try {
    const { supabase, userId } = await ensureProjectManageAccess(projectId);
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
    const { supabase, userId } = await ensureProjectViewAccess(projectId);
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
