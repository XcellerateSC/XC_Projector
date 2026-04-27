import { redirect } from "next/navigation";

import { ProjectHubPage } from "./[projectId]/page";
import { loadProjectsWorkspace } from "./project-data";

type ProjectsPageProps = {
  searchParams: Promise<{
    error?: string;
    project?: string;
    rail?: string;
    reportWeek?: string;
    section?: string;
    success?: string;
  }>;
};

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const { error, project, rail, reportWeek, section, success } = await searchParams;

  let projectId = project;

  if (!projectId) {
    const workspace = await loadProjectsWorkspace("projects");
    projectId = workspace.projectRows[0]?.id;
  }

  if (!projectId) {
    redirect("/projects/new");
  }

  return ProjectHubPage({
    params: Promise.resolve({ projectId }),
    searchParams: Promise.resolve({
      error,
      rail,
      reportWeek,
      section,
      success
    })
  });
}
