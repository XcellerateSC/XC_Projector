import { redirect } from "next/navigation";

import { loadProjectsWorkspace } from "../project-data";

export default async function CustomersPage() {
  await loadProjectsWorkspace("customers");
  redirect("/customers");
}
