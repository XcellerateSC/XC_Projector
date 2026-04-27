import Link from "next/link";

import { getIsoWeekNumber } from "@/lib/work-week";

import {
  formatHours,
  formatMoney,
  formatPercent,
  formatStatusLabel,
  type StatusSignal
} from "./project-hub-shared";

export type ProjectPerformanceWeekRow = {
  assignedHours: number;
  bookedHours: number;
  bookedValue: number;
  planHours: number;
  planValue: number;
  reportSignal: StatusSignal | null;
  reportState: "draft" | "submitted" | null;
  staffingCoveragePercent: number | null;
  timesheetCompletionPercent: number | null;
  weekStart: string;
};

type ProjectPerformanceProps = {
  currencyCode: string;
  declaredBudget: number;
  forecastValue: number;
  overviewHref: string;
  rows: readonly ProjectPerformanceWeekRow[];
  totalAssignedHours: number;
  totalBookedHours: number;
  totalBookedValue: number;
  totalPlannedHours: number;
  totalPlannedValue: number;
};

type ChartPoint = {
  x: number;
  y: number;
};

function formatWeekLabel(weekStart: string) {
  return `KW ${String(getIsoWeekNumber(weekStart)).padStart(2, "0")}`;
}

function average(values: Array<number | null>) {
  const usable = values.filter((value): value is number => value !== null);

  if (!usable.length) {
    return null;
  }

  return Math.round(usable.reduce((sum, value) => sum + value, 0) / usable.length);
}

function clampPercentWidth(value: number | null) {
  if (value === null) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

function formatCompactDelta(amount: number, currencyCode: string) {
  const abs = Math.abs(amount);
  const label = formatMoney(abs, currencyCode);
  return amount >= 0 ? `+${label}` : `-${label}`;
}

function buildLinePath(points: ChartPoint[]) {
  if (!points.length) {
    return "";
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function createSeriesPoints(values: number[], width: number, height: number, paddingX: number, paddingY: number) {
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  const maxValue = Math.max(...values, 1);
  const stepX = values.length > 1 ? chartWidth / (values.length - 1) : 0;

  return values.map((value, index) => ({
    x: paddingX + stepX * index,
    y: paddingY + chartHeight - (value / maxValue) * chartHeight
  }));
}

function renderMainChart(rows: readonly ProjectPerformanceWeekRow[]) {
  const width = 780;
  const height = 220;
  const paddingX = 22;
  const paddingTop = 16;
  const paddingBottom = 28;
  const values = rows.flatMap((row) => [row.planHours, row.assignedHours, row.bookedHours]);
  const maxValue = Math.max(...values, 1);
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingX * 2;
  const stepX = rows.length > 1 ? chartWidth / (rows.length - 1) : 0;
  const barWidth = Math.max(10, Math.min(28, chartWidth / Math.max(rows.length, 1) * 0.42));
  const planPoints = createSeriesPoints(rows.map((row) => row.planHours), width, height - paddingBottom + paddingTop, paddingX, paddingTop);
  const assignedPoints = createSeriesPoints(rows.map((row) => row.assignedHours), width, height - paddingBottom + paddingTop, paddingX, paddingTop);

  return (
    <svg aria-label="Plan versus booked hours" className="project-performance-chart" role="img" viewBox={`0 0 ${width} ${height}`}>
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = paddingTop + chartHeight - chartHeight * ratio;
        const value = Math.round(maxValue * ratio);

        return (
          <g key={ratio}>
            <line className="project-performance-grid-line" x1={paddingX} x2={width - paddingX} y1={y} y2={y} />
            <text className="project-performance-axis-label" x={paddingX - 2} y={y - 4}>
              {value}
            </text>
          </g>
        );
      })}

      {rows.map((row, index) => {
        const x = paddingX + stepX * index;
        const barHeight = (row.bookedHours / maxValue) * chartHeight;
        const y = paddingTop + chartHeight - barHeight;

        return (
          <g key={row.weekStart}>
            <rect
              className="project-performance-bar"
              height={Math.max(2, barHeight)}
              rx="4"
              width={barWidth}
              x={x - barWidth / 2}
              y={y}
            />
            <text className="project-performance-axis-label project-performance-axis-label--bottom" x={x} y={height - 8}>
              {formatWeekLabel(row.weekStart)}
            </text>
          </g>
        );
      })}

      <path className="project-performance-line project-performance-line--plan" d={buildLinePath(planPoints)} />
      <path
        className="project-performance-line project-performance-line--assigned"
        d={buildLinePath(assignedPoints)}
      />
    </svg>
  );
}

function renderBurnChart(rows: readonly ProjectPerformanceWeekRow[], declaredBudget: number) {
  const width = 420;
  const height = 180;
  const paddingX = 18;
  const paddingTop = 14;
  const paddingBottom = 24;
  let cumulativePlan = 0;
  let cumulativeBooked = 0;
  const cumulativePlanValues: number[] = [];
  const cumulativeBookedValues: number[] = [];

  for (const row of rows) {
    cumulativePlan += row.planValue;
    cumulativeBooked += row.bookedValue;
    cumulativePlanValues.push(cumulativePlan);
    cumulativeBookedValues.push(cumulativeBooked);
  }

  const values = [...cumulativePlanValues, ...cumulativeBookedValues, declaredBudget].filter(
    (value) => value > 0
  );
  const maxValue = Math.max(...values, 1);
  const chartHeight = height - paddingTop - paddingBottom;
  const planPoints = createSeriesPoints(cumulativePlanValues, width, height - paddingBottom + paddingTop, paddingX, paddingTop);
  const bookedPoints = createSeriesPoints(cumulativeBookedValues, width, height - paddingBottom + paddingTop, paddingX, paddingTop);
  const budgetY = declaredBudget > 0 ? paddingTop + chartHeight - (declaredBudget / maxValue) * chartHeight : null;

  return (
    <svg aria-label="Budget burn chart" className="project-performance-chart project-performance-chart--burn" role="img" viewBox={`0 0 ${width} ${height}`}>
      {[0, 0.5, 1].map((ratio) => {
        const y = paddingTop + chartHeight - chartHeight * ratio;

        return (
          <line
            className="project-performance-grid-line"
            key={ratio}
            x1={paddingX}
            x2={width - paddingX}
            y1={y}
            y2={y}
          />
        );
      })}

      {budgetY !== null ? (
        <line
          className="project-performance-threshold"
          x1={paddingX}
          x2={width - paddingX}
          y1={budgetY}
          y2={budgetY}
        />
      ) : null}
      <path className="project-performance-line project-performance-line--plan" d={buildLinePath(planPoints)} />
      <path className="project-performance-line project-performance-line--booked" d={buildLinePath(bookedPoints)} />
    </svg>
  );
}

export function ProjectPerformance({
  currencyCode,
  declaredBudget,
  forecastValue,
  overviewHref,
  rows,
  totalAssignedHours,
  totalBookedHours,
  totalBookedValue,
  totalPlannedHours,
  totalPlannedValue
}: ProjectPerformanceProps) {
  if (!rows.length) {
    return (
      <section className="project-performance-stack">
        <article className="panel dashboard-card project-performance-panel">
          <div className="project-section-head">
            <div>
              <div className="card-kicker">Performance</div>
              <h2>No performance data yet</h2>
            </div>
            <Link className="cta cta-secondary" href={overviewHref}>
              Back to overview
            </Link>
          </div>
          <div className="project-row project-row--empty">
            Planning weeks, assignments and booked time will surface here once the project starts moving.
          </div>
        </article>
      </section>
    );
  }

  const recentRows = rows.slice(-12);
  const latestRow = recentRows[recentRows.length - 1] ?? null;
  const averageCoverage = average(recentRows.map((row) => row.staffingCoveragePercent));
  const averageCompletion = average(recentRows.map((row) => row.timesheetCompletionPercent));
  const budgetUsedPercent = declaredBudget > 0 ? Math.round((totalBookedValue / declaredBudget) * 100) : null;
  const forecastDelta = declaredBudget > 0 ? forecastValue - declaredBudget : null;
  const forecastTone =
    forecastDelta === null ? "neutral" : forecastDelta > 0 ? "negative" : "positive";

  return (
    <section className="project-performance-stack">
      <article className="panel dashboard-card project-performance-panel">
        <div className="project-section-head">
          <div>
            <div className="card-kicker">Performance</div>
            <h2>Project reporting and finance view</h2>
          </div>
          <Link className="cta cta-secondary" href={overviewHref}>
            Back to overview
          </Link>
        </div>

        <div className="project-performance-summary">
          <article className="project-performance-stat">
            <span>Planned</span>
            <strong>{formatHours(totalPlannedHours)}</strong>
            <small>{formatMoney(totalPlannedValue, currencyCode)}</small>
          </article>
          <article className="project-performance-stat">
            <span>Assigned</span>
            <strong>{formatHours(totalAssignedHours)}</strong>
            <small>
              {totalPlannedHours > 0 ? `${Math.round((totalAssignedHours / totalPlannedHours) * 100)}% of plan` : "No plan"}
            </small>
          </article>
          <article className="project-performance-stat">
            <span>Booked</span>
            <strong>{formatHours(totalBookedHours)}</strong>
            <small>{formatMoney(totalBookedValue, currencyCode)}</small>
          </article>
          <article className="project-performance-stat">
            <span>Budget used</span>
            <strong>{budgetUsedPercent !== null ? `${budgetUsedPercent}%` : "n/a"}</strong>
            <small>{declaredBudget > 0 ? formatMoney(declaredBudget, currencyCode) : "No budget set"}</small>
          </article>
          <article className={`project-performance-stat project-performance-stat--${forecastTone}`}>
            <span>Forecast</span>
            <strong>{formatMoney(forecastValue, currencyCode)}</strong>
            <small>{forecastDelta !== null ? formatCompactDelta(forecastDelta, currencyCode) : "No budget baseline"}</small>
          </article>
          <article className="project-performance-stat">
            <span>Health</span>
            <strong>
              {averageCoverage !== null ? `${averageCoverage}% staffed` : "n/a"}
            </strong>
            <small>
              {averageCompletion !== null ? `${averageCompletion}% timesheets` : "No booking pattern yet"}
            </small>
          </article>
        </div>
      </article>

      <section className="project-performance-grid">
        <article className="panel dashboard-card project-performance-panel project-performance-panel--wide">
          <div className="project-section-head project-section-head--tight">
            <div>
              <div className="card-kicker">Hours trend</div>
              <h2>Plan vs assigned vs booked</h2>
            </div>
            <span className="pill">{recentRows.length} weeks</span>
          </div>

          <div className="project-performance-legend">
            <span><i className="project-performance-swatch project-performance-swatch--plan" /> Planned</span>
            <span><i className="project-performance-swatch project-performance-swatch--assigned" /> Assigned</span>
            <span><i className="project-performance-swatch project-performance-swatch--booked" /> Booked</span>
          </div>

          <div className="project-performance-chart-shell">{renderMainChart(recentRows)}</div>
        </article>

        <article className="panel dashboard-card project-performance-panel">
          <div className="project-section-head project-section-head--tight">
            <div>
              <div className="card-kicker">Budget burn</div>
              <h2>Cumulative value over time</h2>
            </div>
          </div>

          <div className="project-performance-legend project-performance-legend--compact">
            <span><i className="project-performance-swatch project-performance-swatch--plan" /> Planned value</span>
            <span><i className="project-performance-swatch project-performance-swatch--booked-line" /> Booked value</span>
            {declaredBudget > 0 ? (
              <span><i className="project-performance-swatch project-performance-swatch--budget" /> Budget</span>
            ) : null}
          </div>

          <div className="project-performance-chart-shell">{renderBurnChart(recentRows, declaredBudget)}</div>
        </article>

        <article className="panel dashboard-card project-performance-panel">
          <div className="project-section-head project-section-head--tight">
            <div>
              <div className="card-kicker">Execution health</div>
              <h2>Coverage and time capture</h2>
            </div>
          </div>

          <div className="project-performance-health-list">
            {recentRows.slice().reverse().map((row) => (
              <article className="project-performance-health-row" key={row.weekStart}>
                <div className="project-performance-health-head">
                  <strong>{formatWeekLabel(row.weekStart)}</strong>
                  <div className="project-performance-health-meta">
                    {row.reportSignal ? (
                      <span className="project-performance-health-chip">
                        <span className={`status-dot status-dot--${row.reportSignal}`} />
                        {formatStatusLabel(row.reportSignal)}
                      </span>
                    ) : null}
                    {row.reportState ? (
                      <span className="project-performance-health-chip">{row.reportState}</span>
                    ) : null}
                  </div>
                </div>

                <div className="project-performance-meter">
                  <span>Staffing</span>
                  <div className="project-performance-meter-track">
                    <span
                      className="project-performance-meter-fill project-performance-meter-fill--coverage"
                      style={{ width: `${clampPercentWidth(row.staffingCoveragePercent)}%` }}
                    />
                  </div>
                  <strong>{formatPercent(row.staffingCoveragePercent)}</strong>
                </div>

                <div className="project-performance-meter">
                  <span>Timesheets</span>
                  <div className="project-performance-meter-track">
                    <span
                      className="project-performance-meter-fill project-performance-meter-fill--timesheet"
                      style={{ width: `${clampPercentWidth(row.timesheetCompletionPercent)}%` }}
                    />
                  </div>
                  <strong>{formatPercent(row.timesheetCompletionPercent)}</strong>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>

      <article className="panel dashboard-card project-performance-panel">
        <div className="project-section-head project-section-head--tight">
          <div>
            <div className="card-kicker">Weekly detail</div>
            <h2>Compact delivery ledger</h2>
          </div>
          {latestRow ? <span className="pill">Latest {formatWeekLabel(latestRow.weekStart)}</span> : null}
        </div>

        <div className="project-performance-table">
          <div className="project-performance-table-row project-performance-table-row--head">
            <span>Week</span>
            <span>Plan</span>
            <span>Assigned</span>
            <span>Booked</span>
            <span>Delta</span>
            <span>Coverage</span>
            <span>Timesheets</span>
            <span>Status</span>
          </div>

          {recentRows.slice().reverse().map((row) => {
            const delta = row.bookedHours - row.planHours;

            return (
              <div className="project-performance-table-row" key={row.weekStart}>
                <strong>{formatWeekLabel(row.weekStart)}</strong>
                <span>{formatHours(row.planHours)}</span>
                <span>{formatHours(row.assignedHours)}</span>
                <span>{formatHours(row.bookedHours)}</span>
                <span className={delta > 0.5 ? "is-negative" : delta < -0.5 ? "is-positive" : ""}>
                  {delta >= 0 ? "+" : ""}
                  {formatHours(delta)}
                </span>
                <span>{formatPercent(row.staffingCoveragePercent)}</span>
                <span>{formatPercent(row.timesheetCompletionPercent)}</span>
                <span className="project-performance-status-cell">
                  {row.reportSignal ? <span className={`status-dot status-dot--${row.reportSignal}`} /> : null}
                  {row.reportState ?? "n/a"}
                </span>
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}
