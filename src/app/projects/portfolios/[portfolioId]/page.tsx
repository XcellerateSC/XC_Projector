import Link from "next/link";
import { notFound } from "next/navigation";

import {
  SetupDetailPanel,
  SetupSection,
  SetupSelectionLink,
  SetupSelectionPanel,
  SetupWorkspace
} from "../../setup-blueprint";
import { updatePortfolio } from "../../actions";
import { loadProjectsWorkspace } from "../../project-data";
import { ProjectsShell } from "../../projects-shell";

type PortfolioDetailPageProps = {
  params: Promise<{
    portfolioId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function PortfolioDetailPage({
  params,
  searchParams
}: PortfolioDetailPageProps) {
  const { portfolioId } = await params;
  const { error, success } = await searchParams;
  const workspace = await loadProjectsWorkspace("portfolio");
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
      eyebrow="Portfolios"
      compactChrome
      counts={{
        customers: workspace.customerRows.length,
        portfolios: workspace.portfolioRows.length,
        programs: workspace.programRows.length,
        projects: workspace.projectRows.length
      }}
      description="Portfolios now use the same compact blueprint workspace as the redesigned Time and People areas."
      error={error}
      isPortfolioManager={workspace.isPortfolioManager}
      navItems={workspace.navItems}
      showSectionNav={false}
      success={success}
      title="Portfolio Details"
      userLabel={workspace.userLabel}
    >
      <SetupWorkspace>
        <SetupSelectionPanel
          action={
            workspace.isPortfolioManager ? (
              <Link className="cta cta-secondary" href="/portfolios/create">
                Add portfolio
              </Link>
            ) : undefined
          }
          subtitle={`${workspace.portfolioRows.length} visible portfolios`}
          title="Portfolio Selection"
        >
          {workspace.portfolioRows.map((portfolio) => (
            <SetupSelectionLink
              href={`/portfolios/${portfolio.id}`}
              key={portfolio.id}
              selected={portfolio.id === selectedPortfolio.id}
              subtitle={`${portfolio.code ?? "No code"} · ${
                workspace.programRows.filter((program) => program.portfolio_id === portfolio.id)
                  .length
              } programs`}
              title={portfolio.name}
              trailing={
                <span className="tag">
                  {
                    workspace.projectRows.filter((project) => project.portfolio_id === portfolio.id)
                      .length
                  }
                </span>
              }
            />
          ))}
        </SetupSelectionPanel>

        <SetupDetailPanel
          metrics={[
            { label: "Programs", value: relatedPrograms.length },
            { label: "Projects", value: relatedProjects.length },
            { label: "Code", value: selectedPortfolio.code ?? "Open" }
          ]}
          status={
            <span className="setup-state-chip is-focus">
              <span className="setup-state-chip-dot" />
              Portfolio
            </span>
          }
          subtitle={selectedPortfolio.description ?? "Top-level delivery container"}
          title={selectedPortfolio.name}
          titleLabel="Portfolio Status"
        >
          <SetupSection label="Portfolio Profile" meta="Core container data">
            <article className="setup-entry-card">
              {workspace.isPortfolioManager ? (
                <form action={updatePortfolio} className="setup-form-grid setup-form-grid--portfolio">
                  <input name="portfolio_id" type="hidden" value={selectedPortfolio.id} />
                  <input
                    name="redirect_to"
                    type="hidden"
                    value={`/portfolios/${selectedPortfolio.id}`}
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
                <p className="setup-empty-card">
                  Portfolio maintenance is currently reserved for portfolio managers.
                </p>
              )}
            </article>
          </SetupSection>

          <SetupSection label="Contained Programs" meta={`${relatedPrograms.length} linked`}>
            <div className="setup-entry-stack">
              {relatedPrograms.length ? (
                relatedPrograms.map((program) => (
                  <article className="setup-entry-card setup-entry-card--row" key={program.id}>
                    <div className="setup-entry-copy">
                      <strong>{program.name}</strong>
                      <span>{program.code ?? "No code"}</span>
                    </div>
                    <Link className="cta cta-secondary" href={`/programs/${program.id}`}>
                      Open
                    </Link>
                  </article>
                ))
              ) : (
                <article className="setup-entry-card setup-entry-card--empty">
                  No programs currently assigned to this portfolio.
                </article>
              )}
            </div>
          </SetupSection>

          <SetupSection label="Impact" meta="Delivery footprint">
            <div className="setup-impact-grid">
              <article className="setup-entry-card setup-impact-card">
                <div className="setup-impact-copy">
                  <strong>Programs</strong>
                  <span>Program structures currently assigned here</span>
                </div>
                <span className="pill">{relatedPrograms.length}</span>
              </article>

              <article className="setup-entry-card setup-impact-card">
                <div className="setup-impact-copy">
                  <strong>Projects</strong>
                  <span>Projects currently grouped into this portfolio</span>
                </div>
                <span className="pill">{relatedProjects.length}</span>
              </article>
            </div>
          </SetupSection>
        </SetupDetailPanel>
      </SetupWorkspace>
    </ProjectsShell>
  );
}
