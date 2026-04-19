import Link from "next/link";
import type { ReactNode } from "react";

import { BrandLockup } from "@/components/brand-logo";
import type { PrimaryNavIcon } from "@/lib/navigation";

type AppFrameNavItem = {
  href: string;
  label: string;
  icon: PrimaryNavIcon;
  active?: boolean;
};

type AppFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  topbarClassName?: string;
  userLabel?: string | null;
  actions?: ReactNode;
  children: ReactNode;
  navItems: AppFrameNavItem[];
};

export function AppFrame({
  eyebrow,
  title,
  description,
  topbarClassName,
  userLabel,
  actions,
  children,
  navItems
}: AppFrameProps) {
  return (
    <div className="app-shell">
      <aside className="app-rail">
        <Link className="app-brand" href="/dashboard">
          <BrandLockup className="app-brand-lockup" priority size="sm" />
        </Link>

        <nav className="app-nav" aria-label="Primary">
          {navItems.map((item) => (
            <Link
              className={`app-nav-item${item.active ? " is-active" : ""}`}
              href={item.href}
              key={item.href}
            >
              <span className="app-nav-glyph">
                <NavIcon icon={item.icon} />
              </span>
              <span className="app-nav-text">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="app-rail-footer">
          <span className="app-rail-caption">Signed in</span>
          <strong>{userLabel ?? "Workspace user"}</strong>
        </div>
      </aside>

      <main className="app-main">
        <header className={`app-topbar panel${topbarClassName ? ` ${topbarClassName}` : ""}`}>
          <div className="app-topbar-copy">
            <span className="eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          <div className="app-topbar-actions">{actions}</div>
        </header>

        <section className="app-content">{children}</section>
      </main>
    </div>
  );
}

function NavIcon({ icon }: { icon: PrimaryNavIcon }) {
  switch (icon) {
    case "dashboard":
      return (
        <svg aria-hidden="true" className="app-nav-icon" viewBox="0 0 24 24">
          <path d="M4.5 4.5h6v6h-6zm9 0h6v9h-6zm-9 9h6v6h-6zm9 3h6v3h-6z" />
        </svg>
      );
    case "projects":
      return (
        <svg aria-hidden="true" className="app-nav-icon" viewBox="0 0 24 24">
          <path d="M4.5 7.5h6l1.5-2h7.5v11.5H4.5z" />
          <path d="M4.5 9.5h15" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case "timesheets":
      return (
        <svg aria-hidden="true" className="app-nav-icon" viewBox="0 0 24 24">
          <path d="M7 4.5v3M17 4.5v3" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          <path d="M5 7.5h14v11H5z" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 11h8M8 14.5h5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    case "people":
      return (
        <svg aria-hidden="true" className="app-nav-icon" viewBox="0 0 24 24">
          <path d="M12 12a3.25 3.25 0 1 0 0-6.5A3.25 3.25 0 0 0 12 12Z" />
          <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    case "overview":
      return (
        <svg aria-hidden="true" className="app-nav-icon" viewBox="0 0 24 24">
          <path d="M4.5 11.5 12 5l7.5 6.5v8H4.5z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
          <path d="M9.5 19.5v-4h5v4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    default:
      return null;
  }
}
