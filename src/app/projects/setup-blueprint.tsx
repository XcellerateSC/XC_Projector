import Link from "next/link";
import type { ReactNode } from "react";

type SetupMetric = {
  label: string;
  value: ReactNode;
};

type SetupSelectionPanelProps = {
  action?: ReactNode;
  children: ReactNode;
  subtitle: string;
  title: string;
};

type SetupSelectionLinkProps = {
  dotTone?: "good" | "muted" | "neutral" | "warn";
  href: string;
  selected?: boolean;
  subtitle: string;
  title: string;
  trailing?: ReactNode;
};

type SetupDetailPanelProps = {
  children: ReactNode;
  metrics?: SetupMetric[];
  status?: ReactNode;
  subtitle: string;
  title: string;
  titleLabel: string;
};

type SetupSectionProps = {
  children: ReactNode;
  label: string;
  meta?: string;
};

export function SetupWorkspace({
  children
}: {
  children: ReactNode;
}) {
  return <section className="setup-workspace">{children}</section>;
}

export function SetupSelectionPanel({
  action,
  children,
  subtitle,
  title
}: SetupSelectionPanelProps) {
  return (
    <aside className="panel setup-selection-panel">
      <div className="setup-selection-head">
        <div className="setup-selection-title">
          <span>{title}</span>
          <p>{subtitle}</p>
        </div>
        {action ? <div className="setup-selection-action">{action}</div> : null}
      </div>

      <div className="setup-selection-list">{children}</div>
    </aside>
  );
}

export function SetupSelectionLink({
  dotTone = "neutral",
  href,
  selected = false,
  subtitle,
  title,
  trailing
}: SetupSelectionLinkProps) {
  return (
    <Link
      className={`setup-selection-link${selected ? " is-selected" : ""}`}
      href={href}
      scroll={false}
    >
      <span className="setup-selection-indicator" />

      <div className="setup-selection-copy">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>

      <div className="setup-selection-meta">
        {trailing}
        <span
          aria-hidden="true"
          className={`setup-selection-dot setup-selection-dot--${dotTone}`}
        />
      </div>
    </Link>
  );
}

export function SetupDetailPanel({
  children,
  metrics = [],
  status,
  subtitle,
  title,
  titleLabel
}: SetupDetailPanelProps) {
  return (
    <article className="panel setup-detail-panel">
      <header className="setup-detail-header">
        <div className="setup-detail-copy">
          <div className="setup-status-title">
            <span>{titleLabel}</span>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
        </div>

        <div className="setup-detail-head-side">
          {metrics.length ? (
            <div className="setup-status-strip">
              {metrics.map((metric) => (
                <div key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>
          ) : null}

          {status ? <div className="setup-detail-actions">{status}</div> : null}
        </div>
      </header>

      <div className="setup-detail-scroll">{children}</div>
    </article>
  );
}

export function SetupSection({ children, label, meta }: SetupSectionProps) {
  return (
    <section className="setup-section">
      <div className="setup-section-head">
        <strong>{label}</strong>
        {meta ? <span>{meta}</span> : null}
      </div>

      {children}
    </section>
  );
}
