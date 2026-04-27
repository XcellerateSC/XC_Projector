import { loadProjectsWorkspace } from "../projects/project-data";
import PortfolioCreatePage from "../projects/portfolios/create/page";
import PortfolioDetailPage from "../projects/portfolios/[portfolioId]/page";

type PortfoliosPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function PortfoliosPage({ searchParams }: PortfoliosPageProps) {
  const workspace = await loadProjectsWorkspace("portfolio");
  const firstPortfolio = workspace.portfolioRows[0];

  if (firstPortfolio) {
    return (
      <PortfolioDetailPage
        params={Promise.resolve({ portfolioId: firstPortfolio.id })}
        searchParams={searchParams}
      />
    );
  }

  return <PortfolioCreatePage searchParams={searchParams} />;
}
