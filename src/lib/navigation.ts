export type PrimaryNavKey =
  | "dashboard"
  | "projects"
  | "portfolio"
  | "programs"
  | "customers"
  | "timesheets"
  | "people"
  | "overview";
export type PrimaryNavIcon =
  | "dashboard"
  | "projects"
  | "portfolio"
  | "programs"
  | "customers"
  | "timesheets"
  | "people"
  | "overview";

export function buildPrimaryNav(activeKey: PrimaryNavKey) {
  const items = [
    { key: "dashboard", href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { key: "projects", href: "/projects", label: "Projects", icon: "projects" },
    { key: "portfolio", href: "/portfolios", label: "Portfolio", icon: "portfolio" },
    { key: "programs", href: "/programs", label: "Programs", icon: "programs" },
    { key: "customers", href: "/customers", label: "Customers", icon: "customers" },
    { key: "timesheets", href: "/timesheets", label: "Time", icon: "timesheets" },
    { key: "people", href: "/people", label: "People", icon: "people" },
    { key: "overview", href: "/", label: "Overview", icon: "overview" }
  ] as const;

  return items.map((item) => ({
    ...item,
    active: item.key === activeKey
  }));
}
