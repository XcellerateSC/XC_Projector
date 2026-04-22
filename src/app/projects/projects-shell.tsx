import Link from "next/link";
import type { ReactNode } from "react";

import { AppFrame } from "@/components/app-frame";

type ProjectsSectionKey =
  | "overview"
  | "portfolios"
  | "programs"
  | "customers";

type ProjectsSectionItem = {
  href: string;
  key: ProjectsSectionKey;
  label: string;
};

type ProjectsShellProps = {
  activeSection: ProjectsSectionKey;
  eyebrow?: string;
  compactChrome?: boolean;
  counts: {
    customers: number;
    portfolios: number;
    programs: number;
    projects: number;
  };
  description: string;
  error?: string;
  isPortfolioManager: boolean;
  navItems: Parameters<typeof AppFrame>[0]["navItems"];
  sectionItems?: ProjectsSectionItem[];
  showSectionNav?: boolean;
  success?: string;
  title: string;
  userLabel?: string | null;
  children: ReactNode;
};

const managerSections = [
  { href: "/projects", key: "overview", label: "Project overview" },
  { href: "/projects/portfolios", key: "portfolios", label: "Portfolios" },
  { href: "/projects/programs", key: "programs", label: "Programs" },
  { href: "/projects/customers", key: "customers", label: "Customers" }
] satisfies ProjectsSectionItem[];

export function ProjectsShell({
  activeSection,
  eyebrow = "Projects",
  compactChrome = true,
  counts,
  description,
  error,
  isPortfolioManager,
  navItems,
  sectionItems,
  showSectionNav = true,
  success,
  title,
  userLabel,
  children
}: ProjectsShellProps) {
  const sections = sectionItems ?? (
    isPortfolioManager
      ? managerSections
      : managerSections.filter((section) => section.key === "overview")
  );

  return (
    <AppFrame
      actions={
        <div className="topbar-chip-row">
          <span className="topbar-chip">{counts.projects} projects</span>
          <span className="topbar-chip">{counts.portfolios} portfolios</span>
          <span className="topbar-chip">{counts.programs} programs</span>
          <span className="topbar-chip">{counts.customers} customers</span>
        </div>
      }
      contentClassName="app-content--fit-screen app-content--timesheet-blueprint"
      description={description}
      eyebrow={eyebrow}
      navItems={navItems}
      shellClassName="app-shell--fit-screen app-shell--timesheet-blueprint"
      topbarClassName={
        compactChrome
          ? "app-topbar--compact app-topbar--timesheet-blueprint"
          : "app-topbar--timesheet-blueprint"
      }
      title={title}
      userLabel={userLabel}
    >
      {error ? <p className="banner banner--error">{error}</p> : null}
      {success ? <p className="banner banner--success">{success}</p> : null}

      {showSectionNav && sections.length > 1 ? (
        <nav
          aria-label="Projects sections"
          className={`section-nav panel${compactChrome ? " section-nav--compact" : ""}`}
        >
          {sections.map((section) => (
            <Link
              className={`section-nav-item${section.key === activeSection ? " is-active" : ""}`}
              href={section.href}
              key={section.href}
            >
              {section.label}
            </Link>
          ))}
        </nav>
      ) : null}

      {children}
    </AppFrame>
  );
}
