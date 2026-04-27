import Link from "next/link";

import {
  SetupDetailPanel,
  SetupSection,
  SetupSelectionLink,
  SetupSelectionPanel,
  SetupWorkspace
} from "../../setup-blueprint";
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
  const workspace = await loadProjectsWorkspace("portfolio");

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
      description="Create a portfolio inside the same blueprint workspace used by portfolio detail pages."
      error={error}
      isPortfolioManager={workspace.isPortfolioManager}
      navItems={workspace.navItems}
      showSectionNav={false}
      success={success}
      title="Create Portfolio"
      userLabel={workspace.userLabel}
    >
      <SetupWorkspace>
        <SetupSelectionPanel
          subtitle={`${workspace.portfolioRows.length} existing portfolios`}
          title="Portfolio Selection"
        >
          {workspace.portfolioRows.length ? (
            workspace.portfolioRows.map((portfolio) => (
              <SetupSelectionLink
                href={`/portfolios/${portfolio.id}`}
                key={portfolio.id}
                subtitle={`${portfolio.code ?? "No code"} · ${
                  workspace.programRows.filter((program) => program.portfolio_id === portfolio.id)
                    .length
                } programs`}
                title={portfolio.name}
              />
            ))
          ) : (
            <article className="setup-entry-card setup-entry-card--empty">
              No portfolios yet. Create the first one from the panel on the right.
            </article>
          )}
        </SetupSelectionPanel>

        <SetupDetailPanel
          metrics={[
            { label: "Portfolios", value: workspace.portfolioRows.length },
            { label: "Programs", value: workspace.programRows.length },
            { label: "Mode", value: "Create" }
          ]}
          status={
            <span className="setup-state-chip is-focus">
              <span className="setup-state-chip-dot" />
              New record
            </span>
          }
          subtitle="Add a top-level delivery portfolio and continue directly in its detail workspace."
          title="Create portfolio"
          titleLabel="Portfolio Status"
        >
          <SetupSection label="New Portfolio" meta="Top-level container">
            <article className="setup-entry-card">
              {workspace.isPortfolioManager ? (
                <form action={createPortfolio} className="setup-form-grid setup-form-grid--portfolio">
                  <input name="redirect_to" type="hidden" value="/portfolios/create" />
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
                <p className="setup-empty-card">
                  Portfolio maintenance is currently reserved for portfolio managers.
                </p>
              )}
            </article>
          </SetupSection>

          <SetupSection label="Browse Existing" meta="Jump into an existing portfolio">
            <div className="setup-entry-stack">
              {workspace.portfolioRows.length ? (
                workspace.portfolioRows.slice(0, 6).map((portfolio) => (
                  <article className="setup-entry-card setup-entry-card--row" key={portfolio.id}>
                    <div className="setup-entry-copy">
                      <strong>{portfolio.name}</strong>
                      <span>{portfolio.code ?? "No portfolio code"}</span>
                    </div>
                    <Link className="cta cta-secondary" href={`/portfolios/${portfolio.id}`}>
                      Open
                    </Link>
                  </article>
                ))
              ) : (
                <article className="setup-entry-card setup-entry-card--empty">
                  No portfolios exist yet.
                </article>
              )}
            </div>
          </SetupSection>
        </SetupDetailPanel>
      </SetupWorkspace>
    </ProjectsShell>
  );
}
