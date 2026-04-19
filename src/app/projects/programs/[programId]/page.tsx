import Link from "next/link";
import { notFound } from "next/navigation";

import { updateProgram } from "../../actions";
import { loadProjectsWorkspace } from "../../project-data";
import { ProjectsShell } from "../../projects-shell";

type ProgramDetailPageProps = {
  params: Promise<{
    programId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    section?: string;
    success?: string;
  }>;
};

export default async function ProgramDetailPage({
  params,
  searchParams
}: ProgramDetailPageProps) {
  const { programId } = await params;
  const { error, success } = await searchParams;
  const workspace = await loadProjectsWorkspace();
  const selectedProgram = workspace.programRows.find((program) => program.id === programId);

  if (!selectedProgram) {
    notFound();
  }

  const relatedProjects = workspace.projectRows.filter(
    (project) => project.program_id === selectedProgram.id
  );

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
      description="Programs use the same master-detail pattern so structure maintenance feels the same across all project setup areas."
      error={error}
      isPortfolioManager={workspace.isPortfolioManager}
      navItems={workspace.navItems}
      success={success}
      title="Program details"
      userLabel={workspace.userLabel}
    >
      <section className="workspace-grid project-hub-grid">
        <article className="panel dashboard-card project-hub-list">
          <div className="dashboard-card-head">
            <div>
              <div className="card-kicker">Programs</div>
              <h2>Select a program</h2>
            </div>
            {workspace.isPortfolioManager ? (
              <Link className="cta cta-secondary" href="/projects/programs/create">
                Add program
              </Link>
            ) : null}
          </div>
          <p className="card-copy">
            Pick the program you want to maintain without losing the rest of the
            context.
          </p>

          <div className="project-list project-list--overview">
            {workspace.programRows.map((program) => (
              <article
                className={`project-row project-row--overview${
                  program.id === selectedProgram.id ? " project-row--focus" : ""
                }`}
                key={program.id}
              >
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
            ))}
          </div>
        </article>

        <div className="project-hub-side">
          <article className="panel dashboard-card">
            <div className="card-kicker">Edit program</div>
            <h2>{selectedProgram.name}</h2>
            <p className="card-copy">
              Adjust the portfolio assignment and the program naming without
              mixing it into the main project list.
            </p>

            {workspace.isPortfolioManager ? (
              <form action={updateProgram} className="inline-form">
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
              <p className="dashboard-inline-note">
                Program maintenance is currently reserved for portfolio
                managers.
              </p>
            )}
          </article>

          <article className="panel dashboard-card">
            <div className="card-kicker">Impact</div>
            <h2>Projects inside this program</h2>
            <div className="dashboard-list">
              <div className="dashboard-list-row">
                <div>
                  <strong>Assigned projects</strong>
                  <span>Projects currently grouped into this program</span>
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
