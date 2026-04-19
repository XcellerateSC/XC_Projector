import Link from "next/link";

import { createProgram } from "../../actions";
import { loadProjectsWorkspace } from "../../project-data";
import { ProjectsShell } from "../../projects-shell";

type ProgramCreatePageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function ProgramCreatePage({
  searchParams
}: ProgramCreatePageProps) {
  const { error, success } = await searchParams;
  const workspace = await loadProjectsWorkspace();

  return (
    <ProjectsShell
      activeSection="programs"
      compactChrome
      counts={{
        customers: workspace.customerRows.length,
        portfolios: workspace.portfolioRows.length,
        programs: workspace.programRows.length,
        projects: workspace.projectRows.length
      }}
      description="Create a program from a focused screen, then continue directly in the clearer program detail view."
      error={error}
      isPortfolioManager={workspace.isPortfolioManager}
      navItems={workspace.navItems}
      success={success}
      title="Create program"
      userLabel={workspace.userLabel}
    >
      <section className="workspace-grid project-hub-grid">
        <article className="panel dashboard-card project-hub-list">
          <div className="card-kicker">Existing programs</div>
          <h2>Current program list</h2>
          <p className="card-copy">
            Open an existing program to maintain it, or add a new one on the
            right.
          </p>

          <div className="project-list project-list--overview">
            {workspace.programRows.length ? (
              workspace.programRows.map((program) => (
                <article className="project-row project-row--overview" key={program.id}>
                  <div className="project-row-main">
                    <div>
                      <h3 className="project-row-title">
                        <Link href={`/projects/programs/${program.id}`}>{program.name}</Link>
                      </h3>
                      <p>
                        {(workspace.portfolioRows.find(
                          (portfolio) => portfolio.id === program.portfolio_id
                        )?.name ?? "Unknown portfolio") +
                          (program.code ? ` / ${program.code}` : "")}
                      </p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="project-row project-row--empty">
                No programs yet. Create the first one from the panel on the
                right.
              </div>
            )}
          </div>
        </article>

        <div className="project-hub-side">
          <article className="panel dashboard-card">
            <div className="card-kicker">New program</div>
            <h2>Add a shared program layer</h2>
            <p className="card-copy">
              Create the program first. After saving, you will land directly in
              that program&apos;s detail view.
            </p>

            {workspace.isPortfolioManager ? (
              <form action={createProgram} className="inline-form">
                <input name="redirect_to" type="hidden" value="/projects/programs/create" />
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
                  <span>Name</span>
                  <input name="name" placeholder="Finance Transformation" required type="text" />
                </label>
                <label className="field">
                  <span>Code</span>
                  <input name="code" placeholder="FIN-TRANS" type="text" />
                </label>
                <label className="field">
                  <span>Description</span>
                  <input name="description" placeholder="Optional program summary" type="text" />
                </label>
                <button className="cta cta-primary" type="submit">
                  Create program
                </button>
              </form>
            ) : (
              <p className="dashboard-inline-note">
                Program maintenance is currently reserved for portfolio managers.
              </p>
            )}
          </article>
        </div>
      </section>
    </ProjectsShell>
  );
}
