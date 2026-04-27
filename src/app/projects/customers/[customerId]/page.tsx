import Link from "next/link";
import { notFound } from "next/navigation";

import {
  SetupDetailPanel,
  SetupSection,
  SetupSelectionLink,
  SetupSelectionPanel,
  SetupWorkspace
} from "../../setup-blueprint";
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
  const workspace = await loadProjectsWorkspace("customers");
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
      eyebrow="Customers"
      compactChrome
      counts={{
        customers: workspace.customerRows.length,
        portfolios: workspace.portfolioRows.length,
        programs: workspace.programRows.length,
        projects: workspace.projectRows.length
      }}
      description="Customers now follow the same clean master-detail workspace as Time and People."
      error={error}
      isPortfolioManager={workspace.isPortfolioManager}
      navItems={workspace.navItems}
      showSectionNav={false}
      success={success}
      title="Customer Details"
      userLabel={workspace.userLabel}
    >
      <SetupWorkspace>
        <SetupSelectionPanel
          action={
            workspace.isPortfolioManager ? (
              <Link className="cta cta-secondary" href="/customers/create">
                Add customer
              </Link>
            ) : undefined
          }
          subtitle={`${workspace.customerRows.length} visible customers`}
          title="Customer Selection"
        >
          {workspace.customerRows.map((customer) => {
            const unitCount = workspace.clientUnitRows.filter(
              (unit) => unit.customer_id === customer.id
            ).length;

            return (
              <SetupSelectionLink
                dotTone={customer.is_active ? "good" : "muted"}
                href={`/customers/${customer.id}`}
                key={customer.id}
                selected={customer.id === selectedCustomer.id}
                subtitle={`${customer.legal_name ?? "No legal name"} · ${unitCount} units`}
                title={customer.name}
                trailing={<span className="tag">{unitCount}</span>}
              />
            );
          })}
        </SetupSelectionPanel>

        <SetupDetailPanel
          metrics={[
            { label: "Units", value: selectedUnits.length },
            { label: "Projects", value: relatedProjects.length },
            {
              label: "Status",
              value: selectedCustomer.is_active ? "Active" : "Inactive"
            }
          ]}
          status={
            <span
              className={`setup-state-chip ${selectedCustomer.is_active ? "is-good" : "is-muted"}`}
            >
              <span className="setup-state-chip-dot" />
              {selectedCustomer.is_active ? "Active" : "Inactive"}
            </span>
          }
          subtitle={
            selectedCustomer.legal_name ??
            selectedCustomer.billing_notes ??
            "Commercial customer record"
          }
          title={selectedCustomer.name}
          titleLabel="Customer Status"
        >
          <SetupSection label="Customer Profile" meta="Commercial master data">
            <article className="setup-entry-card">
              {workspace.isPortfolioManager ? (
                <>
                  <form action={updateCustomer} className="setup-form-grid setup-form-grid--customer">
                    <input name="customer_id" type="hidden" value={selectedCustomer.id} />
                    <input
                      name="redirect_to"
                      type="hidden"
                      value={`/customers/${selectedCustomer.id}`}
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

                  <form action={setCustomerActiveState} className="setup-divider-form">
                    <input name="customer_id" type="hidden" value={selectedCustomer.id} />
                    <input
                      name="next_is_active"
                      type="hidden"
                      value={selectedCustomer.is_active ? "false" : "true"}
                    />
                    <input
                      name="redirect_to"
                      type="hidden"
                      value={`/customers/${selectedCustomer.id}`}
                    />
                    <button className="cta cta-secondary" type="submit">
                      {selectedCustomer.is_active ? "Deactivate customer" : "Reactivate customer"}
                    </button>
                  </form>
                </>
              ) : (
                <p className="setup-empty-card">
                  Customer maintenance is currently reserved for portfolio managers.
                </p>
              )}
            </article>
          </SetupSection>

          <SetupSection label="Client Units" meta={`${selectedUnits.length} linked`}>
            {workspace.isPortfolioManager ? (
              <article className="setup-entry-card">
                <form action={createClientUnit} className="setup-form-grid setup-form-grid--portfolio">
                  <input name="customer_id" type="hidden" value={selectedCustomer.id} />
                  <input
                    name="redirect_to"
                    type="hidden"
                    value={`/customers/${selectedCustomer.id}`}
                  />
                  <label className="field">
                    <span>Client unit</span>
                    <input name="name" placeholder="Finance Department" required type="text" />
                  </label>
                  <label className="field">
                    <span>Description</span>
                    <input
                      name="description"
                      placeholder="Optional internal unit context"
                      type="text"
                    />
                  </label>
                  <div className="setup-form-actions">
                    <button className="cta cta-secondary" type="submit">
                      Add client unit
                    </button>
                  </div>
                </form>
              </article>
            ) : null}

            <div className="setup-entry-stack">
              {selectedUnits.length ? (
                selectedUnits.map((unit) => (
                  <article className="setup-entry-card" key={unit.id}>
                    <div className="setup-entry-copy">
                      <strong>{unit.name}</strong>
                      <span>{unit.description ?? "No description"}</span>
                    </div>

                    {workspace.isPortfolioManager ? (
                      <form
                        action={updateClientUnit}
                        className="setup-form-grid setup-form-grid--portfolio setup-divider-form"
                      >
                        <input name="client_unit_id" type="hidden" value={unit.id} />
                        <input name="customer_id" type="hidden" value={selectedCustomer.id} />
                        <input
                          name="redirect_to"
                          type="hidden"
                          value={`/customers/${selectedCustomer.id}${
                            section === "client-unit" ? "?section=client-unit" : ""
                          }`}
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
                        <div className="setup-form-actions">
                          <button className="cta cta-secondary" type="submit">
                            Save client unit
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </article>
                ))
              ) : (
                <article className="setup-entry-card setup-entry-card--empty">
                  No client units yet for this customer.
                </article>
              )}
            </div>
          </SetupSection>

          <SetupSection label="Impact" meta="Commercial usage">
            <div className="setup-impact-grid">
              <article className="setup-entry-card setup-impact-card">
                <div className="setup-impact-copy">
                  <strong>Assigned projects</strong>
                  <span>Projects currently linked to this customer</span>
                </div>
                <span className="pill">{relatedProjects.length}</span>
              </article>

              <article className="setup-entry-card setup-impact-card">
                <div className="setup-impact-copy">
                  <strong>Client units</strong>
                  <span>Commercial sub-structures maintained for this customer</span>
                </div>
                <span className="pill">{selectedUnits.length}</span>
              </article>
            </div>
          </SetupSection>
        </SetupDetailPanel>
      </SetupWorkspace>
    </ProjectsShell>
  );
}
