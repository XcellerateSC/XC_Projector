import { redirect } from "next/navigation";

import { loadProjectsWorkspace } from "../project-data";

export default async function ProgramsPage() {
  const workspace = await loadProjectsWorkspace();
  const firstProgram = workspace.programRows[0];

  if (firstProgram) {
    redirect(`/projects/programs/${firstProgram.id}`);
  }

  redirect("/projects/programs/create");
}
