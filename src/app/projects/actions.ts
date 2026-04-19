"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionSuccess = "portfolio" | "program" | "customer" | "client-unit" | "project";

const allowedRedirectPaths = new Set([
  "/projects",
  "/projects/new",
  "/projects/portfolios",
  "/projects/portfolios/create",
  "/projects/programs",
  "/projects/programs/create",
  "/projects/customers",
  "/projects/customers/create"
]);

function isAllowedRedirectPath(value: string) {
  if (allowedRedirectPaths.has(value)) {
    return true;
  }

  return /^\/projects\/(portfolios|programs|customers)\/[0-9a-f-]+$/i.test(value);
}

function redirectWithMessage(
  redirectTo: string,
  kind: "error" | "success",
  message: string,
  success?: ActionSuccess
): never {
  const params = new URLSearchParams();
  params.set(kind, message);

  if (success) {
    params.set("section", success);
  }

  redirect(`${redirectTo}?${params.toString()}`);
}

function readRequiredText(formData: FormData, key: string, label: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    redirectWithMessage(readRedirectPath(formData), "error", `${label} is required.`);
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
    redirectWithMessage(readRedirectPath(formData), "error", `${key} must be a valid number.`);
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

function readBooleanString(formData: FormData, key: string, label: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || (value !== "true" && value !== "false")) {
    redirectWithMessage(readRedirectPath(formData), "error", `${label} is invalid.`);
  }

  return value === "true";
}

function readRedirectPath(formData: FormData) {
  const value = formData.get("redirect_to");

  if (typeof value !== "string") {
    return "/projects";
  }

  return isAllowedRedirectPath(value) ? value : "/projects";
}

function revalidateProjectPages() {
  revalidatePath("/projects");
  revalidatePath("/projects/new");
  revalidatePath("/projects/portfolios");
  revalidatePath("/projects/programs");
  revalidatePath("/projects/customers");
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
      "/projects",
      "error",
      "Only portfolio managers can create master data and projects."
    );
  }

  return { supabase, userId: user.id };
}

export async function createPortfolio(formData: FormData) {
  const { supabase } = await ensurePortfolioManager();
  const redirectTo = readRedirectPath(formData);
  const name = readRequiredText(formData, "name", "Portfolio name");
  const code = readOptionalText(formData, "code");
  const description = readOptionalText(formData, "description");

  const { data: portfolio, error } = await supabase
    .from("portfolios")
    .insert({
      name,
      code,
      description
    })
    .select("id")
    .single();

  if (error || !portfolio) {
    redirectWithMessage(redirectTo, "error", error?.message ?? "Could not create portfolio.");
  }

  revalidateProjectPages();

  if (redirectTo === "/projects/portfolios/create") {
    redirectWithMessage(
      `/projects/portfolios/${portfolio.id}`,
      "success",
      `Portfolio "${name}" created.`,
      "portfolio"
    );
  }

  redirectWithMessage(redirectTo, "success", `Portfolio "${name}" created.`, "portfolio");
}

export async function updatePortfolio(formData: FormData) {
  const { supabase } = await ensurePortfolioManager();
  const redirectTo = readRedirectPath(formData);
  const portfolioId = readRequiredText(formData, "portfolio_id", "Portfolio");
  const name = readRequiredText(formData, "name", "Portfolio name");
  const code = readOptionalText(formData, "code");
  const description = readOptionalText(formData, "description");

  const { error } = await supabase
    .from("portfolios")
    .update({
      code,
      description,
      name
    })
    .eq("id", portfolioId);

  if (error) {
    redirectWithMessage(redirectTo, "error", error.message);
  }

  revalidateProjectPages();
  redirectWithMessage(redirectTo, "success", `Portfolio "${name}" updated.`, "portfolio");
}

export async function createProgram(formData: FormData) {
  const { supabase } = await ensurePortfolioManager();
  const redirectTo = readRedirectPath(formData);
  const portfolioId = readRequiredText(formData, "portfolio_id", "Portfolio");
  const name = readRequiredText(formData, "name", "Program name");
  const code = readOptionalText(formData, "code");
  const description = readOptionalText(formData, "description");

  const { data: program, error } = await supabase
    .from("programs")
    .insert({
      portfolio_id: portfolioId,
      name,
      code,
      description
    })
    .select("id")
    .single();

  if (error || !program) {
    redirectWithMessage(redirectTo, "error", error?.message ?? "Could not create program.");
  }

  revalidateProjectPages();

  if (redirectTo === "/projects/programs/create") {
    redirectWithMessage(
      `/projects/programs/${program.id}`,
      "success",
      `Program "${name}" created.`,
      "program"
    );
  }

  redirectWithMessage(redirectTo, "success", `Program "${name}" created.`, "program");
}

export async function updateProgram(formData: FormData) {
  const { supabase } = await ensurePortfolioManager();
  const redirectTo = readRedirectPath(formData);
  const programId = readRequiredText(formData, "program_id", "Program");
  const portfolioId = readRequiredText(formData, "portfolio_id", "Portfolio");
  const name = readRequiredText(formData, "name", "Program name");
  const code = readOptionalText(formData, "code");
  const description = readOptionalText(formData, "description");

  const { error } = await supabase
    .from("programs")
    .update({
      code,
      description,
      name,
      portfolio_id: portfolioId
    })
    .eq("id", programId);

  if (error) {
    redirectWithMessage(redirectTo, "error", error.message);
  }

  revalidateProjectPages();
  redirectWithMessage(redirectTo, "success", `Program "${name}" updated.`, "program");
}

export async function createCustomer(formData: FormData) {
  const { supabase } = await ensurePortfolioManager();
  const redirectTo = readRedirectPath(formData);
  const name = readRequiredText(formData, "name", "Customer name");
  const legalName = readOptionalText(formData, "legal_name");
  const billingNotes = readOptionalText(formData, "billing_notes");

  const { data: customer, error } = await supabase
    .from("customers")
    .insert({
      name,
      legal_name: legalName,
      billing_notes: billingNotes
    })
    .select("id")
    .single();

  if (error || !customer) {
    redirectWithMessage(redirectTo, "error", error?.message ?? "Could not create customer.");
  }

  revalidateProjectPages();

  if (redirectTo === "/projects/customers/create") {
    redirectWithMessage(
      `/projects/customers/${customer.id}`,
      "success",
      `Customer "${name}" created.`,
      "customer"
    );
  }

  redirectWithMessage(redirectTo, "success", `Customer "${name}" created.`, "customer");
}

export async function updateCustomer(formData: FormData) {
  const { supabase } = await ensurePortfolioManager();
  const redirectTo = readRedirectPath(formData);
  const customerId = readRequiredText(formData, "customer_id", "Customer");
  const name = readRequiredText(formData, "name", "Customer name");
  const legalName = readOptionalText(formData, "legal_name");
  const billingNotes = readOptionalText(formData, "billing_notes");

  const { error } = await supabase
    .from("customers")
    .update({
      billing_notes: billingNotes,
      legal_name: legalName,
      name
    })
    .eq("id", customerId);

  if (error) {
    redirectWithMessage(redirectTo, "error", error.message);
  }

  revalidateProjectPages();
  redirectWithMessage(redirectTo, "success", `Customer "${name}" updated.`, "customer");
}

export async function setCustomerActiveState(formData: FormData) {
  const { supabase } = await ensurePortfolioManager();
  const redirectTo = readRedirectPath(formData);
  const customerId = readRequiredText(formData, "customer_id", "Customer");
  const isActive = readBooleanString(formData, "next_is_active", "Customer state");

  const { error } = await supabase
    .from("customers")
    .update({
      is_active: isActive
    })
    .eq("id", customerId);

  if (error) {
    redirectWithMessage(redirectTo, "error", error.message);
  }

  revalidateProjectPages();
  redirectWithMessage(
    redirectTo,
    "success",
    isActive ? "Customer reactivated." : "Customer deactivated.",
    "customer"
  );
}

export async function createClientUnit(formData: FormData) {
  const { supabase } = await ensurePortfolioManager();
  const redirectTo = readRedirectPath(formData);
  const customerId = readRequiredText(formData, "customer_id", "Customer");
  const name = readRequiredText(formData, "name", "Client unit name");
  const description = readOptionalText(formData, "description");

  const { error } = await supabase.from("client_units").insert({
    customer_id: customerId,
    name,
    description
  });

  if (error) {
    redirectWithMessage(redirectTo, "error", error.message);
  }

  revalidateProjectPages();
  redirectWithMessage(
    redirectTo,
    "success",
    `Client unit "${name}" created.`,
    "client-unit"
  );
}

export async function updateClientUnit(formData: FormData) {
  const { supabase } = await ensurePortfolioManager();
  const redirectTo = readRedirectPath(formData);
  const clientUnitId = readRequiredText(formData, "client_unit_id", "Client unit");
  const customerId = readRequiredText(formData, "customer_id", "Customer");
  const name = readRequiredText(formData, "name", "Client unit name");
  const description = readOptionalText(formData, "description");

  const { error } = await supabase
    .from("client_units")
    .update({
      customer_id: customerId,
      description,
      name
    })
    .eq("id", clientUnitId);

  if (error) {
    redirectWithMessage(redirectTo, "error", error.message);
  }

  revalidateProjectPages();
  redirectWithMessage(
    redirectTo,
    "success",
    `Client unit "${name}" updated.`,
    "client-unit"
  );
}

export async function createProject(formData: FormData) {
  const { supabase, userId } = await ensurePortfolioManager();
  const redirectTo = readRedirectPath(formData);
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
    redirectWithMessage(
      redirectTo,
      "error",
      projectError?.message ?? "Could not create project."
    );
  }

  const projectId = project.id;

  const { error: charterError } = await supabase.from("project_charters").insert({
    project_id: projectId,
    objective,
    scope_summary: scopeSummary,
    milestones_summary: milestonesSummary
  });

  if (charterError) {
    redirectWithMessage(redirectTo, "error", charterError.message);
  }

  const { error: financialError } = await supabase.from("project_financials").insert({
    project_id: projectId,
    declared_budget: declaredBudget,
    budget_notes: budgetNotes
  });

  if (financialError) {
    redirectWithMessage(redirectTo, "error", financialError.message);
  }

  revalidateProjectPages();
  redirectWithMessage(redirectTo, "success", `Project "${name}" created.`, "project");
}
