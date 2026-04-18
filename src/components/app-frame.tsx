import Link from "next/link";
import type { ReactNode } from "react";

type AppFrameNavItem = {
  href: string;
  label: string;
  shortLabel: string;
  active?: boolean;
};

type AppFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  userLabel?: string | null;
  actions?: ReactNode;
  children: ReactNode;
  navItems: AppFrameNavItem[];
};

export function AppFrame({
  eyebrow,
  title,
  description,
  userLabel,
  actions,
  children,
  navItems
}: AppFrameProps) {
  return (
    <div className="app-shell">
      <aside className="app-rail">
        <div className="app-brand">
          <div className="app-brand-mark">XC</div>
          <div className="app-brand-copy">
            <strong>XC Projector</strong>
            <span>Consulting operations</span>
          </div>
        </div>

        <nav className="app-nav" aria-label="Primary">
          {navItems.map((item) => (
            <Link
              className={`app-nav-item${item.active ? " is-active" : ""}`}
              href={item.href}
              key={item.href}
            >
              <span className="app-nav-glyph">{item.shortLabel}</span>
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
        <header className="app-topbar panel">
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
