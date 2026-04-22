import Link from "next/link";
import { notFound } from "next/navigation";

import {
  SetupDetailPanel,
  SetupSection,
  SetupSelectionLink,
  SetupSelectionPanel,
  SetupWorkspace
} from "../../setup-blueprint";
import { updateProgram } from "../../actions";
import { loadProjectsWorkspace } from "../../project-data";
import { ProjectsShell } from "../../projects-shell";

type ProgramDetailPageProps = {
  params: Promise<{
    programId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function ProgramDetailPage({
  params,
  searchParams
}: ProgramDetailPageProps) {
  const { programId } = await params;
  const { error, success } = await searchParams;
  const workspace = await loadProjectsWorkspace("portfolio");
  const selectedProgram = workspace.programRows.find((program) => program.id === programId);

  if (!selectedProgram) {
    notFound();
  }

  const relatedProjects = workspace.projectRows.filter(
    (project) => project.program_id === selectedProgram.id
  );
  const parentPortfolio =
    workspace.portfolioRows.find((portfolio) => portfolio.id === selectedProgram.portfolio_id)
      ?.name ?? "Unknown portfolio";

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
      description="Programs now use the same blueprint workspace pattern as the refreshed Time and People pages."
      error={error}
      isPortfolioManager={workspace.isPortfolioManager}
      navItems={workspace.navItems}
      sectionItems={[
        { href: "/projects/portfolios", key: "portfolios", label: "Portfolios" },
        { href: "/projects/programs", key: "programs", label: "Programs" }
      ]}
      success={success}
      title="Program Details"
      userLabel={workspace.userLabel}
    >
      <SetupWorkspace>
        <SetupSelectionPanel
          action={
            workspace.isPortfolioManager ? (
              <Link className="cta cta-secondary" href="/projects/programs/create">
                Add program
              </Link>
            ) : undefined
          }
          subtitle={`${workspace.programRows.length} visible programs`}
          title="Program Selection"
        >
          {workspace.programRows.map((program) => {
            const portfolioName =
              workspace.portfolioRows.find((portfolio) => portfolio.id === program.portfolio_id)
                ?.name ?? "Unknown portfolio";

            return (
              <SetupSelectionLink
                href={`/projects/programs/${program.id}`}
                key={program.id}
                selected={program.id === selectedProgram.id}
                subtitle={`${portfolioName}${program.code ? ` · ${program.code}` : ""}`}
                title={program.name}
                trailing={
                  <span className="tag">
                    {
                      workspace.projectRows.filter((project) => project.program_id === program.id)
                        .length
                    }
                  </span>
                }
              />
            );
          })}
        </SetupSelectionPanel>

        <SetupDetailPanel
          metrics={[
            { label: "Portfolio", value: parentPortfolio },
            { label: "Projects", value: relatedProjects.length },
            { label: "Code", value: selectedProgram.code ?? "Open" }
          ]}
          status={
            <span className="setup-state-chip is-focus">
              <span className="setup-state-chip-dot" />
              Program
            </span>
          }
          subtitle={selectedProgram.description ?? "Shared delivery layer beneath the portfolio"}
          title={selectedProgram.name}
          titleLabel="Program Status"
        >
          <SetupSection label="Program Profile" meta="Program container data">
            <article className="setup-entry-card">
              {workspace.isPortfolioManager ? (
                <form action={updateProgram} className="setup-form-grid setup-form-grid--program">
                  <input name="program_id" type="hidden" value={selectedProgram.id} />
                  <input
                    name="redirect_to"
                    type="hidden"
                    value={`/projects/programs/${selectedProgram.id}`}
                  />
                  <label className="field">
                    <span>Portfolio</span>
                    <select defaultValue={selectedProgram.portfolio_id} name="portfolio_id" required>
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
                    <input defaultValue={selectedProgram.name} name="name" required type="text" />
                  </label>
                  <label className="field">
                    <span>Code</span>
                    <input defaultValue={selectedProgram.code ?? ""} name="code" type="text" />
                  </label>
                  <label className="field">
                    <span>Description</span>
                    <input
                      defaultValue={selectedProgram.description ?? ""}
                      name="description"
                      type="text"
                    />
                  </label>
                  <button className="cta cta-primary" type="submit">
                    Save program
                  </button>
                </form>
              ) : (
                <p className="setup-empty-card">
                  Program maintenance is currently reserved for portfolio managers.
                </p>
              )}
            </article>
          </SetupSection>

          <SetupSection label="Contained Projects" meta={`${relatedProjects.length} linked`}>
            <div className="setup-entry-stack">
              {relatedProjects.length ? (
                relatedProjects.map((project) => (
                  <article className="setup-entry-card setup-entry-card--row" key={project.id}>
                    <div className="setup-entry-copy">
                      <strong>{project.name}</strong>
                      <span>{project.code ?? project.lifecycle_status}</span>
                    </div>
                    <Link className="cta cta-secondary" href={`/projects/${project.id}`}>
                      Open
                    </Link>
                  </article>
                ))
              ) : (
                <article className="setup-entry-card setup-entry-card--empty">
                  No projects currently grouped into this program.
                </article>
              )}
            </div>
          </SetupSection>

          <SetupSection label="Impact" meta="Delivery footprint">
            <div className="setup-impact-grid">
              <article className="setup-entry-card setup-impact-card">
                <div className="setup-impact-copy">
                  <strong>Assigned projects</strong>
                  <span>Projects currently grouped into this program</span>
                </div>
                <span className="pill">{relatedProjects.length}</span>
              </article>

              <article className="setup-entry-card setup-impact-card">
                <div className="setup-impact-copy">
                  <strong>Parent portfolio</strong>
                  <span>Program hierarchy reference</span>
                </div>
                <span className="tag">{parentPortfolio}</span>
              </article>
            </div>
          </SetupSection>
        </SetupDetailPanel>
      </SetupWorkspace>
    </ProjectsShell>
  );
}
