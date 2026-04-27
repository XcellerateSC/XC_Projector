import { loadProjectsWorkspace } from "../projects/project-data";
import CustomerCreatePage from "../projects/customers/create/page";
import CustomerDetailPage from "../projects/customers/[customerId]/page";

type CustomersPageProps = {
  searchParams: Promise<{
    error?: string;
    section?: string;
    success?: string;
  }>;
};

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const workspace = await loadProjectsWorkspace("customers");
  const firstCustomer = workspace.customerRows[0];

  if (firstCustomer) {
    return (
      <CustomerDetailPage
        params={Promise.resolve({ customerId: firstCustomer.id })}
        searchParams={searchParams}
      />
    );
  }

  return <CustomerCreatePage searchParams={searchParams} />;
}
