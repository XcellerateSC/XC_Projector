import { redirect } from "next/navigation";

import { loadProjectsWorkspace } from "../project-data";

export default async function ProgramsPage() {
  await loadProjectsWorkspace("programs");
  redirect("/programs");
}
