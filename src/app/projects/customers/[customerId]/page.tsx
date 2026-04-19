import Link from "next/link";
import { notFound } from "next/navigation";

import {
  createClientUnit,
  setCustomerActiveState,
  updateClientUnit,
  updateCustomer
} from "../../actions";
import { loadProjectsWorkspace } from "../../project-data";
import { ProjectsShell } from "../../projects-shell";

type CustomerDetailPageProps = {
  params: Promise<{
    customerId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    section?: string;
    success?: string;
  }>;
};

export default async function CustomerDetailPage({
  params,
  searchParams
}: CustomerDetailPageProps) {
  const { customerId } = await params;
  const { error, section, success } = await searchParams;
  const workspace = await loadProjectsWorkspace();
  const selectedCustomer = workspace.customerRows.find(
    (customer) => customer.id === customerId
  );

  if (!selectedCustomer) {
    notFound();
  }

  const selectedUnits = workspace.clientUnitRows.filter(
    (unit) => unit.customer_id === selectedCustomer.id
  );
  const relatedProjects = workspace.projectRows.filter(
    (project) => project.customer_id === selectedCustomer.id
  );

  return (
    <ProjectsShell
      activeSection="customers"
      counts={{
        customers: workspace.customerRows.length,
        portfolios: workspace.portfolioRows.length,
        programs: workspace.programRows.length,
        projects: workspace.projectRows.length
      }}
      description="Customers also use the same master-detail layout so commercial setup follows the same workflow as portfolios and programs."
      error={error}
      isPortfolioManager={workspace.isPortfolioManager}
      navItems={workspace.navItems}
      success={success}
      title="Customer details"
      userLabel={workspace.userLabel}
    >
      <section className="workspace-grid project-hub-grid">
        <article className="panel dashboard-card project-hub-list">
          <div className="dashboard-card-head">
            <div>
              <div className="card-kicker">Customers</div>
              <h2>Select a customer</h2>
            </div>
            {workspace.isPortfolioManager ? (
              <Link className="cta cta-secondary" href="/projects/customers/create">
                Add customer
              </Link>
            ) : null}
          </div>
          <p className="card-copy">
            Choose the customer you want to maintain. The matching client units
            and customer setup appear on the right.
          </p>

          <div className="project-list project-list--overview">
            {workspace.customerRows.map((customer) => (
              <article
                className={`project-row project-row--overview${
                  customer.id === selectedCustomer.id ? " project-row--focus" : ""
                }`}
                key={customer.id}
              >
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
            ))}
          </div>
        </article>

        <div className="project-hub-side">
          <article className="panel dashboard-card">
            <div className="card-kicker">Edit customer</div>
            <h2>{selectedCustomer.name}</h2>
            <p className="card-copy">
              Maintain the customer record and commercial context on a dedicated
              detail view.
            </p>

            {workspace.isPortfolioManager ? (
              <>
                <form action={updateCustomer} className="inline-form">
                  <input name="customer_id" type="hidden" value={selectedCustomer.id} />
                  <input
                    name="redirect_to"
                    type="hidden"
                    value={`/projects/customers/${selectedCustomer.id}`}
                  />
                  <label className="field">
                    <span>Name</span>
                    <input defaultValue={selectedCustomer.name} name="name" required type="text" />
                  </label>
                  <label className="field">
                    <span>Legal name</span>
                    <input
                      defaultValue={selectedCustomer.legal_name ?? ""}
                      name="legal_name"
                      type="text"
                    />
                  </label>
                  <label className="field">
                    <span>Billing notes</span>
                    <input
                      defaultValue={selectedCustomer.billing_notes ?? ""}
                      name="billing_notes"
                      type="text"
                    />
                  </label>
                  <button className="cta cta-primary" type="submit">
                    Save customer
                  </button>
                </form>

                <form action={setCustomerActiveState} className="inline-form inline-form--divider">
                  <input name="customer_id" type="hidden" value={selectedCustomer.id} />
                  <input
                    name="next_is_active"
                    type="hidden"
                    value={selectedCustomer.is_active ? "false" : "true"}
                  />
                  <input
                    name="redirect_to"
                    type="hidden"
                    value={`/projects/customers/${selectedCustomer.id}`}
                  />
                  <button className="cta cta-secondary" type="submit">
                    {selectedCustomer.is_active ? "Deactivate customer" : "Reactivate customer"}
                  </button>
                </form>
              </>
            ) : (
              <p className="dashboard-inline-note">
                Customer maintenance is currently reserved for portfolio
                managers.
              </p>
            )}
          </article>

          <article className="panel dashboard-card">
            <div className="card-kicker">Client units</div>
            <h2>Units inside {selectedCustomer.name}</h2>
            <p className="card-copy">
              Keep the customer-specific client units together with the customer
              record.
            </p>

            {workspace.isPortfolioManager ? (
              <form action={createClientUnit} className="inline-form">
                <input name="customer_id" type="hidden" value={selectedCustomer.id} />
                <input
                  name="redirect_to"
                  type="hidden"
                  value={`/projects/customers/${selectedCustomer.id}`}
                />
                <label className="field">
                  <span>Client unit</span>
                  <input name="name" placeholder="Finance Department" required type="text" />
                </label>
                <label className="field">
                  <span>Description</span>
                  <input name="description" placeholder="Optional internal unit context" type="text" />
                </label>
                <button className="cta cta-secondary" type="submit">
                  Add client unit
                </button>
              </form>
            ) : null}

            <div className="management-stack">
              {selectedUnits.length ? (
                selectedUnits.map((unit) => (
                  <article
                    className={`project-row${section === "client-unit" ? " project-row--focus" : ""}`}
                    key={unit.id}
                  >
                    <div className="project-row-main">
                      <div>
                        <h3>{unit.name}</h3>
                        <p>{unit.description ?? "No description"}</p>
                      </div>
                    </div>

                    {workspace.isPortfolioManager ? (
                      <form action={updateClientUnit} className="inline-form inline-form--divider">
                        <input name="client_unit_id" type="hidden" value={unit.id} />
                        <input name="customer_id" type="hidden" value={selectedCustomer.id} />
                        <input
                          name="redirect_to"
                          type="hidden"
                          value={`/projects/customers/${selectedCustomer.id}`}
                        />
                        <label className="field">
                          <span>Client unit</span>
                          <input defaultValue={unit.name} name="name" required type="text" />
                        </label>
                        <label className="field">
                          <span>Description</span>
                          <input
                            defaultValue={unit.description ?? ""}
                            name="description"
                            type="text"
                          />
                        </label>
                        <button className="cta cta-secondary" type="submit">
                          Save client unit
                        </button>
                      </form>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="project-row project-row--empty">
                  No client units yet for this customer.
                </div>
              )}
            </div>
          </article>

          <article className="panel dashboard-card">
            <div className="card-kicker">Impact</div>
            <h2>Projects for this customer</h2>
            <div className="dashboard-list">
              <div className="dashboard-list-row">
                <div>
                  <strong>Assigned projects</strong>
                  <span>Projects currently linked to this customer</span>
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
