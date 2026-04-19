import { redirect } from "next/navigation";

import { loadProjectsWorkspace } from "../project-data";

export default async function CustomersPage() {
  const workspace = await loadProjectsWorkspace();
  const firstCustomer = workspace.customerRows[0];

  if (firstCustomer) {
    redirect(`/projects/customers/${firstCustomer.id}`);
  }

  redirect("/projects/customers/create");
}
