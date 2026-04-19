import { redirect } from "next/navigation";

import { loadProjectsWorkspace } from "../project-data";

export default async function PortfoliosPage() {
  const workspace = await loadProjectsWorkspace();
  const firstPortfolio = workspace.portfolioRows[0];

  if (firstPortfolio) {
    redirect(`/projects/portfolios/${firstPortfolio.id}`);
  }

  redirect("/projects/portfolios/create");
}
