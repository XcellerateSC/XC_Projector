import Link from "next/link";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { buildPrimaryNav } from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  createClientUnit,
  createCustomer,
  createPortfolio,
  createProgram,
  createProject
} from "./actions";

type ProjectsPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
    section?: string;
  }>;
};

type LookupRow = {
  id: string;
  name: string;
};

type ProjectLeadRow = {
  id: string;
  full_name: string;
  system_role: string;
};

type ProjectListRow = {
  id: string;
  name: string;
  code: string | null;
  lifecycle_status: string;
  start_date: string;
  end_date: string | null;
  portfolios: { name: string } | null;
  programs: { name: string } | null;
  customers: { name: string } | null;
  client_units: { name: string } | null;
  profiles: { full_name: string } | null;
  project_financials: { declared_budget: number | null; currency_code: string } | null;
};

function formatDate(date: string | null) {
  if (!date) {
    return "Open";
  }

  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(date));
}

function formatBudget(financials: ProjectListRow["project_financials"]) {
  if (!financials?.declared_budget) {
    return "No budget";
  }

  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: financials.currency_code
  }).format(financials.declared_budget);
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const { error, success, section } = await searchParams;
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

  const isPortfolioManager = profile?.system_role === "portfolio_manager";
  const navItems = buildPrimaryNav("projects");
  const portfolioRows = (portfolios as LookupRow[] | null) ?? [];
  const programRows =
    ((programs as ({ portfolio_id: string } & LookupRow)[] | null) ?? []).map((program) => ({
      ...program
    }));
  const customerRows = (customers as LookupRow[] | null) ?? [];
  const clientUnitRows =
    ((clientUnits as ({ customer_id: string } & LookupRow)[] | null) ?? []).map((unit) => ({
      ...unit
    }));
  const leadRows = (projectLeads as ProjectLeadRow[] | null) ?? [];
  const projectRows = (projects as ProjectListRow[] | null) ?? [];

  return (
    <AppFrame
      actions={
        <div className="topbar-chip-row">
          <span className="topbar-chip">{projectRows.length} projects</span>
          <span className="topbar-chip">{portfolioRows.length} portfolios</span>
          <span className="topbar-chip">{customerRows.length} customers</span>
        </div>
      }
      description="This is the first operational build slice: create the commercial and delivery context first, then create projects against the live portfolio, customer and charter model."
      eyebrow="Projects"
      navItems={navItems}
      title="Portfolio and project setup"
      userLabel={profile?.full_name ?? user.email}
    >
      {error ? <p className="banner banner--error">{error}</p> : null}
      {success ? <p className="banner banner--success">{success}</p> : null}

      <section className="workspace-grid workspace-grid--three">
        <article className="panel dashboard-card">
          <div className="card-kicker">Portfolio base</div>
          <h2>Portfolios</h2>
          <p className="card-copy">
            Create the top-level delivery containers that programs and direct
            projects can live under.
          </p>

          {isPortfolioManager ? (
            <form action={createPortfolio} className="inline-form">
              <label className="field">
                <span>Name</span>
                <input name="name" placeholder="Advisory Portfolio 2026" required type="text" />
              </label>
              <label className="field">
                <span>Code</span>
                <input name="code" placeholder="ADV-26" type="text" />
              </label>
              <label className="field">
                <span>Description</span>
                <input name="description" placeholder="Optional portfolio summary" type="text" />
              </label>
              <button className="cta cta-primary" type="submit">
                Create portfolio
              </button>
            </form>
          ) : null}

          <div className="tag-list">
            {portfolioRows.map((portfolio) => (
              <span
                className={`tag${section === "portfolio" ? " tag--focus" : ""}`}
                key={portfolio.id}
              >
                {portfolio.name}
              </span>
            ))}
          </div>
        </article>

        <article className="panel dashboard-card">
          <div className="card-kicker">Program layer</div>
          <h2>Programs</h2>
          <p className="card-copy">
            Use programs where multiple projects need one shared visibility
            layer inside a portfolio.
          </p>

          {isPortfolioManager ? (
            <form action={createProgram} className="inline-form">
              <label className="field">
                <span>Portfolio</span>
                <select name="portfolio_id" required>
                  <option value="">Select portfolio</option>
                  {portfolioRows.map((portfolio) => (
                    <option key={portfolio.id} value={portfolio.id}>
                      {portfolio.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Name</span>
                <input name="name" placeholder="Finance Transformation" required type="text" />
              </label>
              <label className="field">
                <span>Code</span>
                <input name="code" placeholder="FIN-TRANS" type="text" />
              </label>
              <button className="cta cta-primary" type="submit">
                Create program
              </button>
            </form>
          ) : null}

          <div className="tag-list">
            {programRows.map((program) => (
              <span className={`tag${section === "program" ? " tag--focus" : ""}`} key={program.id}>
                {program.name}
              </span>
            ))}
          </div>
        </article>

        <article className="panel dashboard-card">
          <div className="card-kicker">Client context</div>
          <h2>Customers and client units</h2>
          <p className="card-copy">
            Capture the enterprise customer first, then optional internal client
            units that commission the actual projects.
          </p>

          {isPortfolioManager ? (
            <div className="stacked-forms">
              <form action={createCustomer} className="inline-form">
                <label className="field">
                  <span>Customer name</span>
                  <input name="name" placeholder="Auto AG" required type="text" />
                </label>
                <label className="field">
                  <span>Legal name</span>
                  <input name="legal_name" placeholder="Auto AG Holding" type="text" />
                </label>
                <button className="cta cta-primary" type="submit">
                  Create customer
                </button>
              </form>

              <form action={createClientUnit} className="inline-form inline-form--divider">
                <label className="field">
                  <span>Customer</span>
                  <select name="customer_id" required>
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
                  <input name="name" placeholder="Finance Department" required type="text" />
                </label>
                <button className="cta cta-secondary" type="submit">
                  Add client unit
                </button>
              </form>
            </div>
          ) : null}

          <div className="tag-list">
            {customerRows.map((customer) => (
              <span className={`tag${section === "customer" ? " tag--focus" : ""}`} key={customer.id}>
                {customer.name}
              </span>
            ))}
          </div>
        </article>
      </section>

      <section className="workspace-grid workspace-grid--project">
        <article className="panel dashboard-card project-form-card">
          <div className="card-kicker">Project creation</div>
          <h2>Create a new project</h2>
          <p className="card-copy">
            This captures the delivery shell, the first charter statement and
            the high-level commercial baseline in one step.
          </p>

          {isPortfolioManager ? (
            <form action={createProject} className="project-form-grid">
              <label className="field">
                <span>Portfolio</span>
                <select name="portfolio_id" required>
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
                <select name="program_id">
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
                <select name="customer_id" required>
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
                <select name="client_unit_id">
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
                <input name="name" placeholder="Finance PMO rollout" required type="text" />
              </label>

              <label className="field">
                <span>Code</span>
                <input name="code" placeholder="FIN-PMO-26" type="text" />
              </label>

              <label className="field field--full">
                <span>Description</span>
                <textarea
                  name="description"
                  placeholder="Short operational description of the project"
                  rows={3}
                />
              </label>

              <label className="field field--full">
                <span>Objective</span>
                <textarea
                  name="objective"
                  placeholder="What does the project need to achieve?"
                  required
                  rows={3}
                />
              </label>

              <label className="field">
                <span>Start date</span>
                <input name="start_date" required type="date" />
              </label>

              <label className="field">
                <span>End date</span>
                <input name="end_date" type="date" />
              </label>

              <label className="field">
                <span>Internal PL</span>
                <select name="internal_project_lead_id">
                  <option value="">Optional lead</option>
                  {leadRows.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.full_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Declared budget</span>
                <input name="declared_budget" placeholder="50000" step="0.01" type="number" />
              </label>

              <label className="field field--full">
                <span>Scope summary</span>
                <textarea
                  name="scope_summary"
                  placeholder="Optional first scope note"
                  rows={3}
                />
              </label>

              <label className="field field--full">
                <span>Milestones</span>
                <textarea
                  name="milestones_summary"
                  placeholder="Optional milestone or phase summary"
                  rows={3}
                />
              </label>

              <label className="field field--full">
                <span>Budget notes</span>
                <textarea
                  name="budget_notes"
                  placeholder="Optional commercial context or assumptions"
                  rows={3}
                />
              </label>

              <div className="field field--full project-form-actions">
                <button className="cta cta-primary" type="submit">
                  Create project shell
                </button>
              </div>
            </form>
          ) : (
            <p className="card-copy">
              Project creation is currently reserved to portfolio managers in
              the MVP access model.
            </p>
          )}
        </article>

        <article className="panel dashboard-card project-list-card">
          <div className="card-kicker">Existing projects</div>
          <h2>Current delivery landscape</h2>
          <p className="card-copy">
            The first overview already shows the backbone we need later for
            staffing, timesheets, status and financial views.
          </p>

          <div className="project-list">
            {projectRows.length ? (
              projectRows.map((project) => (
                <article
                  className={`project-row${section === "project" ? " project-row--focus" : ""}`}
                  key={project.id}
                >
                  <div className="project-row-main">
                    <div>
                      <h3>
                        <Link href={`/projects/${project.id}`}>{project.name}</Link>
                      </h3>
                      <p>
                        {(project.portfolios?.name ?? "No portfolio") +
                          (project.programs?.name ? ` / ${project.programs.name}` : "")}
                      </p>
                    </div>
                    <span className="pill">
                      {project.lifecycle_status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <dl className="project-row-meta">
                    <div>
                      <dt>Customer</dt>
                      <dd>
                        {project.customers?.name ?? "No customer"}
                        {project.client_units?.name
                          ? ` / ${project.client_units.name}`
                          : ""}
                      </dd>
                    </div>
                    <div>
                      <dt>Project lead</dt>
                      <dd>{project.profiles?.full_name ?? "Not assigned"}</dd>
                    </div>
                    <div>
                      <dt>Timeline</dt>
                      <dd>
                        {formatDate(project.start_date)} - {formatDate(project.end_date)}
                      </dd>
                    </div>
                    <div>
                      <dt>Budget</dt>
                      <dd>{formatBudget(project.project_financials)}</dd>
                    </div>
                  </dl>
                </article>
              ))
            ) : (
              <div className="project-row project-row--empty">
                No projects yet. Create the first project shell from the form on
                the left.
              </div>
            )}
          </div>
        </article>
      </section>
    </AppFrame>
  );
}
