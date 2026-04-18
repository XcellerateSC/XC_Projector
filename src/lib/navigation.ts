export type PrimaryNavKey = "dashboard" | "projects" | "timesheets" | "people" | "overview";

export function buildPrimaryNav(activeKey: PrimaryNavKey) {
  const items = [
    { key: "dashboard", href: "/dashboard", label: "Dashboard", shortLabel: "DB" },
    { key: "projects", href: "/projects", label: "Projects", shortLabel: "PR" },
    { key: "timesheets", href: "/timesheets", label: "Time", shortLabel: "TI" },
    { key: "people", href: "/people", label: "People", shortLabel: "PE" },
    { key: "overview", href: "/", label: "Overview", shortLabel: "OV" }
  ] as const;

  return items.map((item) => ({
    ...item,
    active: item.key === activeKey
  }));
}
