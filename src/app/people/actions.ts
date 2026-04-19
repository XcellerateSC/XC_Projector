"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectPeople(kind: "error" | "success", message: string): never {
  const params = new URLSearchParams();
  params.set(kind, message);
  redirect(`/people?${params.toString()}`);
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

function readOptionalUuid(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  if (!value.trim()) {
    return null;
  }

  return value;
}

function readRequiredInteger(formData: FormData, key: string, label: string) {
  const value = readRequiredText(formData, key, label);
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed)) {
    throw new Error(`${label} must be a whole number.`);
  }

  return parsed;
}

async function requireSignedInProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, system_role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/login");
  }

  return {
    supabase,
    systemRole: profile.system_role,
    userId: user.id
  };
}

async function ensureSkillProfileAccess(targetProfileId: string) {
  const context = await requireSignedInProfile();

  if (
    context.systemRole !== "portfolio_manager" &&
    targetProfileId !== context.userId
  ) {
    throw new Error("You can only manage your own skills.");
  }

  return context;
}

async function ensurePortfolioManager() {
  const context = await requireSignedInProfile();

  if (context.systemRole !== "portfolio_manager") {
    throw new Error("Only portfolio managers can manage user roles and access.");
  }

  return context;
}

function readSystemRole(formData: FormData, key: string, label: string) {
  const value = readRequiredText(formData, key, label);

  if (
    value !== "employee" &&
    value !== "project_lead" &&
    value !== "portfolio_manager"
  ) {
    throw new Error(`${label} is invalid.`);
  }

  return value;
}

function readBooleanString(formData: FormData, key: string, label: string) {
  const value = readRequiredText(formData, key, label);

  if (value !== "true" && value !== "false") {
    throw new Error(`${label} is invalid.`);
  }

  return value === "true";
}

export async function createSkill(formData: FormData) {
  let skillName = "Skill";

  try {
    const { supabase, systemRole } = await requireSignedInProfile();

    if (systemRole !== "portfolio_manager") {
      throw new Error("Only portfolio managers can extend the skill catalog.");
    }

    const categoryId = readRequiredText(formData, "skill_category_id", "Skill category");
    skillName = readRequiredText(formData, "name", "Skill name");
    const description = readOptionalText(formData, "description");

    const { error } = await supabase.from("skills").insert({
      description,
      name: skillName,
      skill_category_id: categoryId
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/people");
  } catch (error) {
    redirectPeople(
      "error",
      error instanceof Error ? error.message : "Could not create the skill."
    );
  }

  redirectPeople("success", `Skill "${skillName}" created.`);
}

export async function saveEmployeeSkill(formData: FormData) {
  let successMessage = "Skill saved.";

  try {
    const profileId = readRequiredText(formData, "profile_id", "Employee");
    const { supabase } = await ensureSkillProfileAccess(profileId);
    const skillId = readRequiredText(formData, "skill_id", "Skill");
    const proficiencyScore = readRequiredInteger(
      formData,
      "proficiency_score",
      "Proficiency"
    );
    const notes = readOptionalText(formData, "notes");

    if (proficiencyScore < 1 || proficiencyScore > 5) {
      throw new Error("Proficiency must be between 1 and 5.");
    }

    const { data: existingSkill } = await supabase
      .from("employee_skills")
      .select("id")
      .eq("profile_id", profileId)
      .eq("skill_id", skillId)
      .maybeSingle();

    if (existingSkill) {
      const { error } = await supabase
        .from("employee_skills")
        .update({
          notes,
          proficiency_score: proficiencyScore
        })
        .eq("id", existingSkill.id);

      if (error) {
        throw new Error(error.message);
      }

      successMessage = "Skill profile updated.";
    } else {
      const { error } = await supabase.from("employee_skills").insert({
        id: crypto.randomUUID(),
        notes,
        profile_id: profileId,
        proficiency_score: proficiencyScore,
        skill_id: skillId
      });

      if (error) {
        throw new Error(error.message);
      }

      successMessage = "Skill added to the profile.";
    }

    revalidatePath("/people");
  } catch (error) {
    redirectPeople(
      "error",
      error instanceof Error ? error.message : "Could not save the employee skill."
    );
  }

  redirectPeople("success", successMessage);
}

export async function removeEmployeeSkill(formData: FormData) {
  try {
    const profileId = readRequiredText(formData, "profile_id", "Employee");
    const employeeSkillId = readRequiredText(formData, "employee_skill_id", "Employee skill");
    await ensureSkillProfileAccess(profileId);
    const { supabase } = await requireSignedInProfile();

    const { error } = await supabase
      .from("employee_skills")
      .delete()
      .eq("id", employeeSkillId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/people");
  } catch (error) {
    redirectPeople(
      "error",
      error instanceof Error ? error.message : "Could not remove the employee skill."
    );
  }

  redirectPeople("success", "Skill removed from the profile.");
}

export async function updateProfileAdmin(formData: FormData) {
  let successMessage = "Profile admin settings updated.";

  try {
    const { supabase } = await ensurePortfolioManager();
    const profileId = readRequiredText(formData, "profile_id", "Profile");
    const systemRole = readSystemRole(formData, "system_role", "System role");
    const isActive = readBooleanString(formData, "is_active", "Active state");
    const professionalGradeId = readOptionalUuid(formData, "professional_grade_id");
    const businessUnitId = readOptionalUuid(formData, "business_unit_id");
    const locationId = readOptionalUuid(formData, "location_id");
    const jobTitle = readOptionalText(formData, "job_title");

    const { error } = await supabase
      .from("profiles")
      .update({
        business_unit_id: businessUnitId,
        is_active: isActive,
        job_title: jobTitle,
        location_id: locationId,
        professional_grade_id: professionalGradeId,
        system_role: systemRole
      })
      .eq("id", profileId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/people");
    successMessage = "User role and profile settings updated.";
  } catch (error) {
    redirectPeople(
      "error",
      error instanceof Error ? error.message : "Could not update the user profile."
    );
  }

  redirectPeople("success", successMessage);
}

export async function createAccessAssignment(formData: FormData) {
  let successMessage = "Access assignment created.";

  try {
    const { supabase, userId } = await ensurePortfolioManager();
    const profileId = readRequiredText(formData, "profile_id", "Profile");
    const combinedScope = readOptionalText(formData, "scope_ref");
    let scopeType = readOptionalText(formData, "scope_type");
    let scopeId = readOptionalText(formData, "scope_id");

    if (combinedScope && combinedScope.includes(":")) {
      const [combinedType, combinedId] = combinedScope.split(":");
      scopeType = combinedType;
      scopeId = combinedId;
    }

    if (!scopeType || !scopeId) {
      throw new Error("Scope target is required.");
    }

    const payload: {
      can_edit: boolean;
      created_by: string;
      profile_id: string;
      portfolio_id?: string;
      program_id?: string;
      project_id?: string;
    } = {
      can_edit: true,
      created_by: userId,
      profile_id: profileId
    };

    if (scopeType === "portfolio") {
      payload.portfolio_id = scopeId;
    } else if (scopeType === "program") {
      payload.program_id = scopeId;
    } else if (scopeType === "project") {
      payload.project_id = scopeId;
    } else {
      throw new Error("Scope is invalid.");
    }

    const { error } = await supabase.from("access_assignments").insert(payload);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/people");
    successMessage = "Context access granted.";
  } catch (error) {
    redirectPeople(
      "error",
      error instanceof Error ? error.message : "Could not create the access assignment."
    );
  }

  redirectPeople("success", successMessage);
}

export async function removeAccessAssignment(formData: FormData) {
  try {
    const { supabase } = await ensurePortfolioManager();
    const accessAssignmentId = readRequiredText(
      formData,
      "access_assignment_id",
      "Access assignment"
    );

    const { error } = await supabase
      .from("access_assignments")
      .delete()
      .eq("id", accessAssignmentId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/people");
  } catch (error) {
    redirectPeople(
      "error",
      error instanceof Error ? error.message : "Could not remove the access assignment."
    );
  }

  redirectPeople("success", "Context access removed.");
}
