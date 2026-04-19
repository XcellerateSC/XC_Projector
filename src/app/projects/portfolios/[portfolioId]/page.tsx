import Link from "next/link";
import { notFound } from "next/navigation";

import { updatePortfolio } from "../../actions";
import { loadProjectsWorkspace } from "../../project-data";
import { ProjectsShell } from "../../projects-shell";

type PortfolioDetailPageProps = {
  params: Promise<{
    portfolioId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    section?: string;
    success?: string;
  }>;
};

export default async function PortfolioDetailPage({
  params,
  searchParams
}: PortfolioDetailPageProps) {
  const { portfolioId } = await params;
  const { error, success } = await searchParams;
  const workspace = await loadProjectsWorkspace();
  const selectedPortfolio = workspace.portfolioRows.find(
    (portfolio) => portfolio.id === portfolioId
  );

  if (!selectedPortfolio) {
    notFound();
  }

  const relatedPrograms = workspace.programRows.filter(
    (program) => program.portfolio_id === selectedPortfolio.id
  );
  const relatedProjects = workspace.projectRows.filter(
    (project) => project.portfolio_id === selectedPortfolio.id
  );

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
      description="Portfolios follow the same master-detail pattern: existing items on the left, selected item maintenance on the right."
      error={error}
      isPortfolioManager={workspace.isPortfolioManager}
      navItems={workspace.navItems}
      success={success}
      title="Portfolio details"
      userLabel={workspace.userLabel}
    >
      <section className="workspace-grid project-hub-grid">
        <article className="panel dashboard-card project-hub-list">
          <div className="dashboard-card-head">
            <div>
              <div className="card-kicker">Portfolios</div>
              <h2>Select a portfolio</h2>
            </div>
            {workspace.isPortfolioManager ? (
              <Link className="cta cta-secondary" href="/projects/portfolios/create">
                Add portfolio
              </Link>
            ) : null}
          </div>
          <p className="card-copy">
            Choose the portfolio you want to review or edit.
          </p>

          <div className="project-list project-list--overview">
            {workspace.portfolioRows.map((portfolio) => (
              <article
                className={`project-row project-row--overview${
                  portfolio.id === selectedPortfolio.id ? " project-row--focus" : ""
                }`}
                key={portfolio.id}
              >
                <div className="project-row-main">
                  <div>
                    <h3 className="project-row-title">
                      <Link href={`/projects/portfolios/${portfolio.id}`}>{portfolio.name}</Link>
                    </h3>
                    <p>{portfolio.code ?? "No portfolio code"}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>

        <div className="project-hub-side">
          <article className="panel dashboard-card">
            <div className="card-kicker">Edit portfolio</div>
            <h2>{selectedPortfolio.name}</h2>
            <p className="card-copy">
              Update the top-level delivery container and keep its code and
              description aligned.
            </p>

            {workspace.isPortfolioManager ? (
              <form action={updatePortfolio} className="inline-form">
                <input name="portfolio_id" type="hidden" value={selectedPortfolio.id} />
                <input
                  name="redirect_to"
                  type="hidden"
                  value={`/projects/portfolios/${selectedPortfolio.id}`}
                />
                <label className="field">
                  <span>Name</span>
                  <input defaultValue={selectedPortfolio.name} name="name" required type="text" />
                </label>
                <label className="field">
                  <span>Code</span>
                  <input defaultValue={selectedPortfolio.code ?? ""} name="code" type="text" />
                </label>
                <label className="field">
                  <span>Description</span>
                  <input
                    defaultValue={selectedPortfolio.description ?? ""}
                    name="description"
                    type="text"
                  />
                </label>
                <button className="cta cta-primary" type="submit">
                  Save portfolio
                </button>
              </form>
            ) : (
              <p className="dashboard-inline-note">
                Portfolio maintenance is currently reserved for portfolio
                managers.
              </p>
            )}
          </article>

          <article className="panel dashboard-card">
            <div className="card-kicker">Impact</div>
            <h2>What sits inside this portfolio</h2>
            <div className="dashboard-list">
              <div className="dashboard-list-row">
                <div>
                  <strong>Programs</strong>
                  <span>Program structures currently assigned here</span>
                </div>
                <span className="pill">{relatedPrograms.length}</span>
              </div>
              <div className="dashboard-list-row">
                <div>
                  <strong>Projects</strong>
                  <span>Projects currently grouped into this portfolio</span>
                </div>
                <span className="pill">{relatedProjects.length}</span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </ProjectsShell>
  );
}
