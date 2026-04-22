import Link from "next/link";

import {
  SetupDetailPanel,
  SetupSection,
  SetupSelectionLink,
  SetupSelectionPanel,
  SetupWorkspace
} from "../../setup-blueprint";
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
  const workspace = await loadProjectsWorkspace("portfolio");

  return (
    <ProjectsShell
      activeSection="programs"
      eyebrow="Portfolios & Programs"
      compactChrome
      counts={{
        customers: workspace.customerRows.length,
        portfolios: workspace.portfolioRows.length,
        programs: workspace.programRows.length,
        projects: workspace.projectRows.length
      }}
      description="Create a program inside the same blueprint workspace used by program detail pages."
      error={error}
      isPortfolioManager={workspace.isPortfolioManager}
      navItems={workspace.navItems}
      sectionItems={[
        { href: "/projects/portfolios", key: "portfolios", label: "Portfolios" },
        { href: "/projects/programs", key: "programs", label: "Programs" }
      ]}
      success={success}
      title="Create Program"
      userLabel={workspace.userLabel}
    >
      <SetupWorkspace>
        <SetupSelectionPanel
          subtitle={`${workspace.programRows.length} existing programs`}
          title="Program Selection"
        >
          {workspace.programRows.length ? (
            workspace.programRows.map((program) => {
              const portfolioName =
                workspace.portfolioRows.find((portfolio) => portfolio.id === program.portfolio_id)
                  ?.name ?? "Unknown portfolio";

              return (
                <SetupSelectionLink
                  href={`/projects/programs/${program.id}`}
                  key={program.id}
                  subtitle={`${portfolioName}${program.code ? ` · ${program.code}` : ""}`}
                  title={program.name}
                />
              );
            })
          ) : (
            <article className="setup-entry-card setup-entry-card--empty">
              No programs yet. Create the first one from the panel on the right.
            </article>
          )}
        </SetupSelectionPanel>

        <SetupDetailPanel
          metrics={[
            { label: "Programs", value: workspace.programRows.length },
            { label: "Portfolios", value: workspace.portfolioRows.length },
            { label: "Mode", value: "Create" }
          ]}
          status={
            <span className="setup-state-chip is-focus">
              <span className="setup-state-chip-dot" />
              New record
            </span>
          }
          subtitle="Add a shared program layer beneath a portfolio and continue in its detail workspace."
          title="Create program"
          titleLabel="Program Status"
        >
          <SetupSection label="New Program" meta="Shared delivery layer">
            <article className="setup-entry-card">
              {workspace.isPortfolioManager ? (
                <form action={createProgram} className="setup-form-grid setup-form-grid--program">
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
                <p className="setup-empty-card">
                  Program maintenance is currently reserved for portfolio managers.
                </p>
              )}
            </article>
          </SetupSection>

          <SetupSection label="Browse Existing" meta="Jump into an existing program">
            <div className="setup-entry-stack">
              {workspace.programRows.length ? (
                workspace.programRows.slice(0, 6).map((program) => {
                  const portfolioName =
                    workspace.portfolioRows.find(
                      (portfolio) => portfolio.id === program.portfolio_id
                    )?.name ?? "Unknown portfolio";

                  return (
                    <article className="setup-entry-card setup-entry-card--row" key={program.id}>
                      <div className="setup-entry-copy">
                        <strong>{program.name}</strong>
                        <span>
                          {portfolioName}
                          {program.code ? ` · ${program.code}` : ""}
                        </span>
                      </div>
                      <Link className="cta cta-secondary" href={`/projects/programs/${program.id}`}>
                        Open
                      </Link>
                    </article>
                  );
                })
              ) : (
                <article className="setup-entry-card setup-entry-card--empty">
                  No programs exist yet.
                </article>
              )}
            </div>
          </SetupSection>
        </SetupDetailPanel>
      </SetupWorkspace>
    </ProjectsShell>
  );
}
