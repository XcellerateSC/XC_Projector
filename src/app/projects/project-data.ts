import { redirect } from "next/navigation";

import { buildPrimaryNav } from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PortfolioRow = {
  code: string | null;
  description: string | null;
  id: string;
  name: string;
};

export type ProgramRow = {
  code: string | null;
  description: string | null;
  id: string;
  name: string;
  portfolio_id: string;
};

export type CustomerRow = {
  billing_notes: string | null;
  id: string;
  is_active: boolean;
  legal_name: string | null;
  name: string;
};

export type ClientUnitRow = {
  customer_id: string;
  description: string | null;
  id: string;
  name: string;
};

export type ProjectLeadRow = {
  full_name: string;
  id: string;
  system_role: string;
};

export type ProjectListRow = {
  code: string | null;
  end_date: string | null;
  id: string;
  lifecycle_status: string;
  name: string;
  portfolio_id: string | null;
  program_id: string | null;
  customer_id: string | null;
  client_unit_id: string | null;
  start_date: string;
  client_units: { name: string } | null;
  customers: { name: string } | null;
  portfolios: { name: string } | null;
  profiles: { full_name: string } | null;
  programs: { name: string } | null;
  project_financials: { currency_code: string; declared_budget: number | null } | null;
};

type ProfileSummary = {
  full_name: string | null;
  system_role: string | null;
};

export type ProjectsWorkspace = {
  clientUnitRows: ClientUnitRow[];
  customerRows: CustomerRow[];
  isPortfolioManager: boolean;
  leadRows: ProjectLeadRow[];
  navItems: ReturnType<typeof buildPrimaryNav>;
  portfolioRows: PortfolioRow[];
  profile: ProfileSummary | null;
  programRows: ProgramRow[];
  projectRows: ProjectListRow[];
  userLabel: string | null;
};

export function formatProjectDate(date: string | null) {
  if (!date) {
    return "Open";
  }

  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(date));
}

export function formatProjectBudget(financials: ProjectListRow["project_financials"]) {
  if (!financials?.declared_budget) {
    return "No budget";
  }

  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: financials.currency_code
  }).format(financials.declared_budget);
}

export async function loadProjectsWorkspace(): Promise<ProjectsWorkspace> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: profile },
    { data: portfolios },
    { data: programs },
    { data: customers },
    { data: clientUnits },
    { data: projectLeads },
    { data: projects }
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, system_role")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("portfolios")
      .select("id, name, code, description")
      .order("name", { ascending: true }),
    supabase
      .from("programs")
      .select("id, name, code, description, portfolio_id")
      .order("name", { ascending: true }),
    supabase
      .from("customers")
      .select("id, name, legal_name, billing_notes, is_active")
      .order("name", { ascending: true }),
    supabase
      .from("client_units")
      .select("id, name, customer_id, description")
      .order("name", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name, system_role")
      .in("system_role", ["project_lead", "portfolio_manager"])
      .order("full_name", { ascending: true }),
    supabase
      .from("projects")
      .select(
        `
          id,
          name,
          code,
          lifecycle_status,
          portfolio_id,
          program_id,
          customer_id,
          client_unit_id,
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
          project_financials (
            declared_budget,
            currency_code
          )
        `
      )
      .order("created_at", { ascending: false })
  ]);

  return {
    clientUnitRows: (clientUnits as ClientUnitRow[] | null) ?? [],
    customerRows: (customers as CustomerRow[] | null) ?? [],
    isPortfolioManager: profile?.system_role === "portfolio_manager",
    leadRows: (projectLeads as ProjectLeadRow[] | null) ?? [],
    navItems: buildPrimaryNav("projects"),
    portfolioRows: (portfolios as PortfolioRow[] | null) ?? [],
    profile: (profile as ProfileSummary | null) ?? null,
    programRows: (programs as ProgramRow[] | null) ?? [],
    projectRows: (projects as ProjectListRow[] | null) ?? [],
    userLabel: profile?.full_name ?? user.email ?? null
  };
}
