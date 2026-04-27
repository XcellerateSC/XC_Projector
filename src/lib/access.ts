import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type CurrentProfile = {
  avatar_path: string | null;
  full_name: string | null;
  id: string;
  system_role: string | null;
};

type ProjectAccessAssignment = {
  can_edit: boolean | null;
  portfolio_id: string | null;
  program_id: string | null;
  project_id: string | null;
};

type ProjectAccessProject = {
  id: string;
  internal_project_lead_id: string | null;
  portfolio_id: string | null;
  program_id: string | null;
};

export async function requireSignedInUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return {
    supabase,
    user,
    userId: user.id
  };
}

export async function requireSignedInProfile() {
  const context = await requireSignedInUser();
  const { data: profile } = await context.supabase
    .from("profiles")
    .select("id, full_name, system_role, avatar_path")
    .eq("id", context.userId)
    .maybeSingle();

  if (!profile) {
    redirect("/login");
  }

  return {
    ...context,
    profile: profile as CurrentProfile
  };
}

export async function getProjectAccessContext(projectId: string) {
  const context = await requireSignedInProfile();
  const [{ data: project }, { data: scopedAssignments }, { data: directAssignments }] =
    await Promise.all([
      context.supabase
        .from("projects")
        .select("id, portfolio_id, program_id, internal_project_lead_id")
        .eq("id", projectId)
        .maybeSingle(),
      context.supabase
        .from("access_assignments")
        .select("portfolio_id, program_id, project_id, can_edit")
        .eq("profile_id", context.userId),
      context.supabase
        .from("project_positions")
        .select(
          `
            id,
            project_assignments!inner (
              id
            )
          `
        )
        .eq("project_id", projectId)
        .eq("project_assignments.profile_id", context.userId)
        .limit(1)
    ]);

  if (!project) {
    return null;
  }

  const projectRecord = project as ProjectAccessProject;
  const accessRows = (scopedAssignments as ProjectAccessAssignment[] | null) ?? [];
  const hasScopedAccess = accessRows.some(
    (assignment) =>
      assignment.project_id === projectId ||
      (!!projectRecord.program_id && assignment.program_id === projectRecord.program_id) ||
      (!!projectRecord.portfolio_id && assignment.portfolio_id === projectRecord.portfolio_id)
  );
  const hasScopedManageAccess = accessRows.some(
    (assignment) =>
      assignment.can_edit &&
      (assignment.project_id === projectId ||
        (!!projectRecord.program_id && assignment.program_id === projectRecord.program_id) ||
        (!!projectRecord.portfolio_id && assignment.portfolio_id === projectRecord.portfolio_id))
  );
  const hasDirectAssignment = ((directAssignments as { id: string }[] | null) ?? []).length > 0;
  const isPortfolioManager = context.profile.system_role === "portfolio_manager";
  const isProjectLead = projectRecord.internal_project_lead_id === context.userId;
  const canManage = isPortfolioManager || isProjectLead || hasScopedManageAccess;
  const canView = canManage || hasScopedAccess || hasDirectAssignment;

  return {
    ...context,
    canManage,
    canView,
    hasDirectAssignment,
    hasScopedAccess,
    project: projectRecord
  };
}
