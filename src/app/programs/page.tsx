import { loadProjectsWorkspace } from "../projects/project-data";
import ProgramCreatePage from "../projects/programs/create/page";
import ProgramDetailPage from "../projects/programs/[programId]/page";

type ProgramsPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function ProgramsPage({ searchParams }: ProgramsPageProps) {
  const workspace = await loadProjectsWorkspace("programs");
  const firstProgram = workspace.programRows[0];

  if (firstProgram) {
    return (
      <ProgramDetailPage
        params={Promise.resolve({ programId: firstProgram.id })}
        searchParams={searchParams}
      />
    );
  }

  return <ProgramCreatePage searchParams={searchParams} />;
}
