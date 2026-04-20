import Link from "next/link";

import { createCustomer } from "../../actions";
import { loadProjectsWorkspace } from "../../project-data";
import { ProjectsShell } from "../../projects-shell";

type CustomerCreatePageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function CustomerCreatePage({
  searchParams
}: CustomerCreatePageProps) {
  const { error, success } = await searchParams;
  const workspace = await loadProjectsWorkspace();

  return (
    <ProjectsShell
      activeSection="customers"
      compactChrome
      counts={{
        customers: workspace.customerRows.length,
        portfolios: workspace.portfolioRows.length,
        programs: workspace.programRows.length,
        projects: workspace.projectRows.length
      }}
      description="Create a new customer from a focused screen, then continue directly in the clearer customer detail view."
      error={error}
      isPortfolioManager={workspace.isPortfolioManager}
      navItems={workspace.navItems}
      success={success}
      title="Create customer"
      userLabel={workspace.userLabel}
    >
      <section className="workspace-grid project-hub-grid">
        <article className="panel dashboard-card project-hub-list">
          <div className="card-kicker">Existing customers</div>
          <h2>Current customer list</h2>
          <p className="card-copy">
            Open an existing customer to maintain it, or add a new one on the
            right.
          </p>

          <div className="project-list project-list--overview">
            {workspace.customerRows.length ? (
              workspace.customerRows.map((customer) => (
                <article className="project-row project-row--overview" key={customer.id}>
                  <div className="project-row-main">
                    <div>
                      <h3 className="project-row-title">
                        <Link href={`/projects/customers/${customer.id}`}>{customer.name}</Link>
                      </h3>
                      <p>{customer.legal_name ?? "No legal name captured"}</p>
                    </div>
                    <span className={`pill ${customer.is_active ? "pill--strong" : "pill--missing"}`}>
                      {customer.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <div className="project-row project-row--empty">
                No customers yet. Create the first one from the panel on the
                right.
              </div>
            )}
          </div>
        </article>

        <div className="project-hub-side">
          <article className="panel dashboard-card">
            <div className="card-kicker">New customer</div>
            <h2>Add a customer record</h2>
            <p className="card-copy">
              Create the customer first. After saving, you will land directly in
              that customer&apos;s detail view.
            </p>

            {workspace.isPortfolioManager ? (
              <form action={createCustomer} className="inline-form">
                <input name="redirect_to" type="hidden" value="/projects/customers/create" />
                <label className="field">
                  <span>Customer name</span>
                  <input name="name" placeholder="Auto AG" required type="text" />
                </label>
                <label className="field">
                  <span>Legal name</span>
                  <input name="legal_name" placeholder="Auto AG Holding" type="text" />
                </label>
                <label className="field">
                  <span>Billing notes</span>
                  <input name="billing_notes" placeholder="Optional billing context" type="text" />
                </label>
                <button className="cta cta-primary" type="submit">
                  Create customer
                </button>
              </form>
            ) : (
              <p className="dashboard-inline-note">
                Customer maintenance is currently reserved for portfolio managers.
              </p>
            )}
          </article>
        </div>
      </section>
    </ProjectsShell>
  );
}
