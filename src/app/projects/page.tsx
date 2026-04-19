import Link from "next/link";

import { createProject } from "./actions";
import {
  formatProjectBudget,
  formatProjectDate,
  loadProjectsWorkspace
} from "./project-data";
import { ProjectsShell } from "./projects-shell";

type ProjectsPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const { error, success } = await searchParams;
  const workspace = await loadProjectsWorkspace();
  const activeProjects = workspace.projectRows.filter(
    (project) => project.lifecycle_status === "active"
  ).length;

  return (
    <ProjectsShell
      activeSection="overview"
      counts={{
        customers: workspace.customerRows.length,
        portfolios: workspace.portfolioRows.length,
        programs: workspace.programRows.length,
        projects: workspace.projectRows.length
      }}
      description="Start from the live project list, then jump into the specific setup area only when you need to manage portfolios, programs, customers or create a new project."
      error={error}
      isPortfolioManager={workspace.isPortfolioManager}
      navItems={workspace.navItems}
      success={success}
      title="Project overview"
      userLabel={workspace.userLabel}
    >
      <section className="workspace-grid project-hub-grid">
        <article className="panel dashboard-card project-hub-list">
          <div className="dashboard-card-head">
            <div>
              <div className="card-kicker">Current projects</div>
              <h2>Delivery landscape</h2>
            </div>
            <span className="pill pill--strong">{activeProjects} active</span>
          </div>
          <p className="card-copy">
            Open an existing project to work inside the delivery detail. Use the
            management pages only when the structural setup around projects
            needs to change.
          </p>

          <div className="summary-strip">
            <div>
              <span>Projects</span>
              <strong>{workspace.projectRows.length}</strong>
            </div>
            <div>
              <span>Programs</span>
              <strong>{workspace.programRows.length}</strong>
            </div>
          </div>

          <div className="project-list project-list--overview">
            {workspace.projectRows.length ? (
              workspace.projectRows.map((project) => (
                <article className="project-row project-row--overview" key={project.id}>
                  <div className="project-row-main">
                    <div>
                      <h3 className="project-row-title">
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
                        {project.client_units?.name ? ` / ${project.client_units.name}` : ""}
                      </dd>
                    </div>
                    <div>
                      <dt>Project lead</dt>
                      <dd>{project.profiles?.full_name ?? "Not assigned"}</dd>
                    </div>
                    <div>
                      <dt>Timeline</dt>
                      <dd>
                        {formatProjectDate(project.start_date)} -{" "}
                        {formatProjectDate(project.end_date)}
                      </dd>
                    </div>
                    <div>
                      <dt>Budget</dt>
                      <dd>{formatProjectBudget(project.project_financials)}</dd>
                    </div>
                  </dl>
                </article>
              ))
            ) : (
              <div className="project-row project-row--empty">
                No projects yet. Create the first project from the dedicated
                project creation page.
              </div>
            )}
          </div>
        </article>

        <div className="project-hub-side">
          <article className="panel dashboard-card">
            <div className="card-kicker">New project</div>
            <h2>Create a project shell</h2>
            <p className="card-copy">
              The project overview keeps the current projects visible on the
              left. New project setup stays on the right so the workflow is
              consistent and easy to scan.
            </p>

            {workspace.isPortfolioManager ? (
              <form action={createProject} className="project-form-grid">
                <input name="redirect_to" type="hidden" value="/projects" />
                <label className="field">
                  <span>Portfolio</span>
                  <select name="portfolio_id" required>
                    <option value="">Select portfolio</option>
                    {workspace.portfolioRows.map((portfolio) => (
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
                    {workspace.programRows.map((program) => (
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
                    {workspace.customerRows.map((customer) => (
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
                    {workspace.clientUnitRows.map((unit) => (
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
                    {workspace.leadRows.map((lead) => (
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
                  <span>Description</span>
                  <textarea
                    name="description"
                    placeholder="Short operational description of the project"
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
              <p className="dashboard-inline-note">
                Project creation is currently reserved for portfolio managers.
              </p>
            )}
          </article>

          <article className="panel dashboard-card">
            <div className="card-kicker">Administration</div>
            <h2>Project setup areas</h2>
            <p className="card-copy">
              Structural setup lives on dedicated pages so each maintenance task
              has the same left-list/right-create pattern.
            </p>

            {workspace.isPortfolioManager ? (
              <div className="project-action-grid">
                <Link className="project-action-card" href="/projects/portfolios">
                  <strong>Manage portfolios</strong>
                  <span>Maintain the top-level portfolio structure used across projects and programs.</span>
                </Link>
                <Link className="project-action-card" href="/projects/programs">
                  <strong>Manage programs</strong>
                  <span>Organize project clusters and shared visibility layers inside portfolios.</span>
                </Link>
                <Link className="project-action-card" href="/projects/customers">
                  <strong>Manage customers</strong>
                  <span>Maintain customers and client units before assigning them to projects.</span>
                </Link>
              </div>
            ) : null}
          </article>
        </div>
      </section>
    </ProjectsShell>
  );
}
