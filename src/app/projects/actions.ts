"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionSuccess = "portfolio" | "program" | "customer" | "client-unit" | "project";

function redirectWithMessage(
  kind: "error" | "success",
  message: string,
  success?: ActionSuccess
): never {
  const params = new URLSearchParams();
  params.set(kind, message);

  if (success) {
    params.set("section", success);
  }

  redirect(`/projects?${params.toString()}`);
}

function readRequiredText(formData: FormData, key: string, label: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    redirectWithMessage("error", `${label} is required.`);
  }

  return value.trim();
}

function readOptionalText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readOptionalNumber(formData: FormData, key: string) {
  const value = readOptionalText(formData, key);

  if (!value) {
    return null;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    redirectWithMessage("error", `${key} must be a valid number.`);
  }

  return parsed;
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

async function ensurePortfolioManager() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("system_role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.system_role !== "portfolio_manager") {
    redirectWithMessage(
      "error",
      "Only portfolio managers can create master data and projects."
    );
  }

  return { supabase, userId: user.id };
}

export async function createPortfolio(formData: FormData) {
  const { supabase } = await ensurePortfolioManager();
  const name = readRequiredText(formData, "name", "Portfolio name");
  const code = readOptionalText(formData, "code");
  const description = readOptionalText(formData, "description");

  const { error } = await supabase.from("portfolios").insert({
    name,
    code,
    description
  });

  if (error) {
    redirectWithMessage("error", error.message);
  }

  revalidatePath("/projects");
  redirectWithMessage("success", `Portfolio "${name}" created.`, "portfolio");
}

export async function createProgram(formData: FormData) {
  const { supabase } = await ensurePortfolioManager();
  const portfolioId = readRequiredText(formData, "portfolio_id", "Portfolio");
  const name = readRequiredText(formData, "name", "Program name");
  const code = readOptionalText(formData, "code");
  const description = readOptionalText(formData, "description");

  const { error } = await supabase.from("programs").insert({
    portfolio_id: portfolioId,
    name,
    code,
    description
  });

  if (error) {
    redirectWithMessage("error", error.message);
  }

  revalidatePath("/projects");
  redirectWithMessage("success", `Program "${name}" created.`, "program");
}

export async function createCustomer(formData: FormData) {
  const { supabase } = await ensurePortfolioManager();
  const name = readRequiredText(formData, "name", "Customer name");
  const legalName = readOptionalText(formData, "legal_name");
  const billingNotes = readOptionalText(formData, "billing_notes");

  const { error } = await supabase.from("customers").insert({
    name,
    legal_name: legalName,
    billing_notes: billingNotes
  });

  if (error) {
    redirectWithMessage("error", error.message);
  }

  revalidatePath("/projects");
  redirectWithMessage("success", `Customer "${name}" created.`, "customer");
}

export async function createClientUnit(formData: FormData) {
  const { supabase } = await ensurePortfolioManager();
  const customerId = readRequiredText(formData, "customer_id", "Customer");
  const name = readRequiredText(formData, "name", "Client unit name");
  const description = readOptionalText(formData, "description");

  const { error } = await supabase.from("client_units").insert({
    customer_id: customerId,
    name,
    description
  });

  if (error) {
    redirectWithMessage("error", error.message);
  }

  revalidatePath("/projects");
  redirectWithMessage("success", `Client unit "${name}" created.`, "client-unit");
}

export async function createProject(formData: FormData) {
  const { supabase, userId } = await ensurePortfolioManager();
  const portfolioId = readRequiredText(formData, "portfolio_id", "Portfolio");
  const customerId = readRequiredText(formData, "customer_id", "Customer");
  const name = readRequiredText(formData, "name", "Project name");
  const objective = readRequiredText(formData, "objective", "Objective");
  const startDate = readRequiredText(formData, "start_date", "Start date");
  const programId = readOptionalUuid(formData, "program_id");
  const clientUnitId = readOptionalUuid(formData, "client_unit_id");
  const code = readOptionalText(formData, "code");
  const description = readOptionalText(formData, "description");
  const endDate = readOptionalText(formData, "end_date");
  const internalProjectLeadId = readOptionalUuid(formData, "internal_project_lead_id");
  const declaredBudget = readOptionalNumber(formData, "declared_budget");
  const budgetNotes = readOptionalText(formData, "budget_notes");
  const scopeSummary = readOptionalText(formData, "scope_summary");
  const milestonesSummary = readOptionalText(formData, "milestones_summary");

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      portfolio_id: portfolioId,
      program_id: programId,
      customer_id: customerId,
      client_unit_id: clientUnitId,
      name,
      code,
      description,
      internal_project_lead_id: internalProjectLeadId,
      start_date: startDate,
      end_date: endDate,
      created_by: userId
    })
    .select("id")
    .single();

  if (projectError || !project) {
    redirectWithMessage("error", projectError?.message ?? "Could not create project.");
  }

  const projectId = project.id;

  const { error: charterError } = await supabase.from("project_charters").insert({
    project_id: projectId,
    objective,
    scope_summary: scopeSummary,
    milestones_summary: milestonesSummary
  });

  if (charterError) {
    redirectWithMessage("error", charterError.message);
  }

  const { error: financialError } = await supabase.from("project_financials").insert({
    project_id: projectId,
    declared_budget: declaredBudget,
    budget_notes: budgetNotes
  });

  if (financialError) {
    redirectWithMessage("error", financialError.message);
  }

  revalidatePath("/projects");
  redirectWithMessage("success", `Project "${name}" created.`, "project");
}
