import Link from "next/link";

import {
  SetupDetailPanel,
  SetupSection,
  SetupSelectionLink,
  SetupSelectionPanel,
  SetupWorkspace
} from "../../setup-blueprint";
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
  const workspace = await loadProjectsWorkspace("customers");

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
      description="Create customers inside the same blueprint workspace used by the detail screens."
      error={error}
      isPortfolioManager={workspace.isPortfolioManager}
      navItems={workspace.navItems}
      showSectionNav={false}
      success={success}
      title="Create Customer"
      userLabel={workspace.userLabel}
    >
      <SetupWorkspace>
        <SetupSelectionPanel
          subtitle={`${workspace.customerRows.length} existing customers`}
          title="Customer Selection"
        >
          {workspace.customerRows.length ? (
            workspace.customerRows.map((customer) => {
              const unitCount = workspace.clientUnitRows.filter(
                (unit) => unit.customer_id === customer.id
              ).length;

              return (
                <SetupSelectionLink
                  dotTone={customer.is_active ? "good" : "muted"}
                  href={`/customers/${customer.id}`}
                  key={customer.id}
                  subtitle={`${customer.legal_name ?? "No legal name"} · ${unitCount} units`}
                  title={customer.name}
                  trailing={<span className="tag">{unitCount}</span>}
                />
              );
            })
          ) : (
            <article className="setup-entry-card setup-entry-card--empty">
              No customers yet. Create the first one from the panel on the right.
            </article>
          )}
        </SetupSelectionPanel>

        <SetupDetailPanel
          metrics={[
            { label: "Customers", value: workspace.customerRows.length },
            { label: "Projects", value: workspace.projectRows.length },
            { label: "Mode", value: "Create" }
          ]}
          status={
            <span className="setup-state-chip is-focus">
              <span className="setup-state-chip-dot" />
              New record
            </span>
          }
          subtitle="Add a commercial customer record, then continue directly in its detail workspace."
          title="Create customer"
          titleLabel="Customer Status"
        >
          <SetupSection label="New Customer" meta="Commercial master data">
            <article className="setup-entry-card">
              {workspace.isPortfolioManager ? (
                <form action={createCustomer} className="setup-form-grid setup-form-grid--customer">
                  <input name="redirect_to" type="hidden" value="/customers/create" />
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
                <p className="setup-empty-card">
                  Customer maintenance is currently reserved for portfolio managers.
                </p>
              )}
            </article>
          </SetupSection>

          <SetupSection label="Browse Existing" meta="Jump into an existing record">
            <div className="setup-entry-stack">
              {workspace.customerRows.length ? (
                workspace.customerRows.slice(0, 6).map((customer) => (
                  <article className="setup-entry-card setup-entry-card--row" key={customer.id}>
                    <div className="setup-entry-copy">
                      <strong>{customer.name}</strong>
                      <span>{customer.legal_name ?? "No legal name captured"}</span>
                    </div>
                    <Link className="cta cta-secondary" href={`/customers/${customer.id}`}>
                      Open
                    </Link>
                  </article>
                ))
              ) : (
                <article className="setup-entry-card setup-entry-card--empty">
                  No customer records exist yet.
                </article>
              )}
            </div>
          </SetupSection>
        </SetupDetailPanel>
      </SetupWorkspace>
    </ProjectsShell>
  );
}
