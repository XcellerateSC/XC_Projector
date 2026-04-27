import Link from "next/link";

import type { StatusSignal } from "./project-hub-shared";

export type ProjectCockpitAttentionRow = {
  href: string;
  key: string;
  label: string;
  summary: string;
  tone: "good" | "warn";
};

export type ProjectCockpitListRow = {
  actionLabel: string;
  href: string;
  id: string;
  signal?: StatusSignal | null;
  summary: string;
  title: string;
};

type ProjectCockpitProps = {
  attentionRows: readonly ProjectCockpitAttentionRow[];
  openPositions: number;
  positionCount: number;
  reportRows: readonly ProjectCockpitListRow[];
  staffingRows: readonly ProjectCockpitListRow[];
  statusHref: string;
};

export function ProjectCockpit({
  attentionRows,
  openPositions,
  positionCount,
  reportRows,
  staffingRows,
  statusHref
}: ProjectCockpitProps) {
  return (
    <section className="project-cockpit-grid">
      <article className="panel dashboard-card project-cockpit-panel">
        <div className="project-section-head project-section-head--tight">
          <div>
            <div className="card-kicker">Action queue</div>
            <h2>What needs attention</h2>
          </div>
          <span className="pill">{attentionRows.length} signals</span>
        </div>

        <div className="project-cockpit-list">
          {attentionRows.map((row) => (
            <Link className={`project-cockpit-row project-cockpit-row--${row.tone}`} href={row.href} key={row.key}>
              <div className="project-cockpit-copy">
                <strong>{row.label}</strong>
                <span>{row.summary}</span>
              </div>
              <span className="project-cockpit-action">Open</span>
            </Link>
          ))}
        </div>
      </article>

      <article className="panel dashboard-card project-cockpit-panel">
        <div className="project-section-head project-section-head--tight">
          <div>
            <div className="card-kicker">Recent reporting</div>
            <h2>Latest status signals</h2>
          </div>
          <Link className="cta cta-secondary" href={statusHref}>
            Open status
          </Link>
        </div>

        {reportRows.length ? (
          <div className="project-cockpit-list">
            {reportRows.map((row) => (
              <Link className="project-cockpit-row" href={row.href} key={row.id}>
                <div className="project-cockpit-copy">
                  <strong>
                    {row.signal ? <span className={`status-dot status-dot--${row.signal}`} /> : null}
                    <span>{row.title}</span>
                  </strong>
                  <span>{row.summary}</span>
                </div>
                <span className="project-cockpit-action">{row.actionLabel}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="project-row project-row--empty">No status reports yet.</div>
        )}
      </article>

      <article className="panel dashboard-card project-cockpit-panel">
        <div className="project-section-head project-section-head--tight">
          <div>
            <div className="card-kicker">Open staffing</div>
            <h2>Current gaps</h2>
          </div>
          <div className="project-cockpit-summary">
            <span>{positionCount} positions</span>
            <strong>{openPositions} open</strong>
          </div>
        </div>

        {staffingRows.length ? (
          <div className="project-cockpit-list">
            {staffingRows.map((row) => (
              <Link className="project-cockpit-row" href={row.href} key={row.id}>
                <div className="project-cockpit-copy">
                  <strong>{row.title}</strong>
                  <span>{row.summary}</span>
                </div>
                <span className="project-cockpit-action">{row.actionLabel}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="project-row project-row--empty">No open positions right now.</div>
        )}
      </article>
    </section>
  );
}
