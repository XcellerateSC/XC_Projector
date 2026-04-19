import Link from "next/link";

import { createPortfolio } from "../../actions";
import { loadProjectsWorkspace } from "../../project-data";
import { ProjectsShell } from "../../projects-shell";

type PortfolioCreatePageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function PortfolioCreatePage({
  searchParams
}: PortfolioCreatePageProps) {
  const { error, success } = await searchParams;
  const workspace = await loadProjectsWorkspace();

  return (
    <ProjectsShell
      activeSection="portfolios"
      compactChrome
      counts={{
        customers: workspace.customerRows.length,
        portfolios: workspace.portfolioRows.length,
        programs: workspace.programRows.length,
        projects: workspace.projectRows.length
      }}
      description="Create a portfolio from a focused screen, then continue directly in the clearer portfolio detail view."
      error={error}
      isPortfolioManager={workspace.isPortfolioManager}
      navItems={workspace.navItems}
      success={success}
      title="Create portfolio"
      userLabel={workspace.userLabel}
    >
      <section className="workspace-grid project-hub-grid">
        <article className="panel dashboard-card project-hub-list">
          <div className="card-kicker">Existing portfolios</div>
          <h2>Current portfolio list</h2>
          <p className="card-copy">
            Open an existing portfolio to maintain it, or add a new one on the
            right.
          </p>

          <div className="project-list project-list--overview">
            {workspace.portfolioRows.length ? (
              workspace.portfolioRows.map((portfolio) => (
                <article className="project-row project-row--overview" key={portfolio.id}>
                  <div className="project-row-main">
                    <div>
                      <h3 className="project-row-title">
                        <Link href={`/projects/portfolios/${portfolio.id}`}>{portfolio.name}</Link>
                      </h3>
                      <p>{portfolio.code ?? "No portfolio code"}</p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="project-row project-row--empty">
                No portfolios yet. Create the first one from the panel on the
                right.
              </div>
            )}
          </div>
        </article>

        <div className="project-hub-side">
          <article className="panel dashboard-card">
            <div className="card-kicker">New portfolio</div>
            <h2>Add a top-level portfolio</h2>
            <p className="card-copy">
              Create the portfolio first. After saving, you will land directly
              in that portfolio&apos;s detail view.
            </p>

            {workspace.isPortfolioManager ? (
              <form action={createPortfolio} className="inline-form">
                <input name="redirect_to" type="hidden" value="/projects/portfolios/create" />
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
            ) : (
              <p className="dashboard-inline-note">
                Portfolio maintenance is currently reserved for portfolio managers.
              </p>
            )}
          </article>
        </div>
      </section>
    </ProjectsShell>
  );
}
