import { redirect } from "next/navigation";

import { loadProjectsWorkspace } from "../project-data";

export default async function PortfoliosPage() {
  await loadProjectsWorkspace("portfolio");
  redirect("/portfolios");
}
