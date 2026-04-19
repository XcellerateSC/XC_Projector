import Link from "next/link";

import { BrandLockup, BrandMark } from "@/components/brand-logo";

const platformPillars = [
  {
    body: "Structure portfolios, programs and projects in one connected operating model instead of spreading planning logic across disconnected files and handovers.",
    title: "Consistent portfolio structure"
  },
  {
    body: "Plan demand at position level, staff assignments transparently and preserve week-based history whenever responsibilities change.",
    title: "Transparent staffing"
  },
  {
    body: "Connect timesheets, status reporting and commercial visibility so operational and management views are based on the same underlying data.",
    title: "Integrated delivery reporting"
  }
];

const marketingStories = [
  {
    eyebrow: "For portfolio managers",
    title: "A clearer view across portfolios, programs and project health.",
    body: "See where delivery capacity is under pressure, where reporting is out of date and where commercial trends require attention."
  },
  {
    eyebrow: "For project leads",
    title: "One place for staffing demand, active delivery and reporting.",
    body: "Move from position planning to assignments, weekly status and delivery tracking without switching between isolated tools."
  },
  {
    eyebrow: "For teams",
    title: "Weekly execution with transparent expectations.",
    body: "Give consultants a clean structure for recording project time, internal time and complete weekly submissions."
  }
];

const spotlightLines = [
  "Portfolio and project planning with a consistent operating structure.",
  "Position-based staffing with transparent assignments and preserved history.",
  "Status, actuals and commercial signals connected in one reporting model."
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero hero--app">
        <div className="hero-stage panel">
          <div className="hero-stage-rail">
            <BrandMark className="hero-stage-mark" priority size={58} />
            <div className="hero-stage-orbit">
              <span className="hero-stage-dot is-active" />
              <span className="hero-stage-dot" />
              <span className="hero-stage-dot" />
            </div>
            <span className="hero-stage-rail-caption">Xcellerate Projector</span>
          </div>

          <div className="hero-stage-main">
            <div className="hero-stage-bar">
              <div className="hero-stage-copy">
                <BrandLockup className="hero-brand" kind="standalone" priority size="lg" />
                <span className="eyebrow">Consulting operations platform</span>
                <h1>Project planning, staffing and reporting in one operating platform.</h1>
                <p className="hero-lead">
                  Xcellerate Projector brings portfolio planning, transparent
                  staffing, weekly time capture and project steering into one
                  connected application for consulting teams.
                </p>

                <div className="cta-row">
                  <Link className="cta cta-primary" href="/login">
                    Sign in
                  </Link>
                  <a className="cta cta-secondary" href="#story">
                    See how it supports delivery
                  </a>
                </div>

                <div className="hero-proof-row">
                  <span>Designed for portfolio managers, project leads and consulting teams.</span>
                  <span>Built around planning transparency, staffing continuity and reliable weekly reporting.</span>
                </div>
              </div>

              <article className="panel hero-showcase">
                <div className="card-kicker">Operating model</div>
                <h2>One data model across planning, delivery and reporting.</h2>
                <p>
                  The platform is structured around the workflows that define
                  consulting execution: setting up the portfolio, staffing
                  positions, capturing weekly work and reporting project
                  progress with a shared operational view.
                </p>

                <div className="hero-showcase-list">
                  {spotlightLines.map((line) => (
                    <div className="hero-showcase-row" key={line}>
                      <span className="hero-showcase-bullet" />
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <div className="hero-editorial-grid">
              {platformPillars.map((pillar) => (
                <article className="panel editorial-card" key={pillar.title}>
                  <div className="card-kicker">Values</div>
                  <h2>{pillar.title}</h2>
                  <p>{pillar.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section section--editorial" id="story">
        <div className="section-header">
          <div>
            <h2>Made for the people who carry delivery quality</h2>
            <p>
              Xcellerate Projector is designed for the people who need a shared
              operational view across planning, staffing, execution and
              reporting.
            </p>
          </div>
        </div>

        <div className="story-grid">
          {marketingStories.map((story) => (
            <article className="panel story-card" key={story.title}>
              <span className="eyebrow eyebrow--ghost">{story.eyebrow}</span>
              <h3>{story.title}</h3>
              <p>{story.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>What the platform elevates</h2>
            <p>
              The product is built to make operational complexity easier to
              manage and easier to communicate across project and portfolio
              levels.
            </p>
          </div>
        </div>

        <div className="feature-grid feature-grid--marketing">
          <article className="panel feature-card feature-card--marketing">
            <span className="feature-index">01</span>
            <h3>Portfolio structure with consistent hierarchy</h3>
            <p>
              Maintain a clear structure across portfolios, programs, customers
              and projects so planning decisions are made on a stable base.
            </p>
          </article>

          <article className="panel feature-card feature-card--marketing">
            <span className="feature-index">02</span>
            <h3>Transparent staffing with position-based planning</h3>
            <p>
              Translate demand into assignments with week-based clarity, skill
              context and a traceable staffing history.
            </p>
          </article>

          <article className="panel feature-card feature-card--marketing">
            <span className="feature-index">03</span>
            <h3>Weekly time capture with clear submission logic</h3>
            <p>
              Give teams a clear path from active assignments to submitted
              weeks, internal time and complete weekly reporting.
            </p>
          </article>

          <article className="panel feature-card feature-card--marketing">
            <span className="feature-index">04</span>
            <h3>Reporting aligned with project and portfolio steering</h3>
            <p>
              Surface status, actuals and commercial signals in a form that
              supports regular steering across project and portfolio views.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <article className="panel landing-cta">
          <div>
            <span className="eyebrow">Xcellerate Projector</span>
            <h2>A shared operational view for consulting delivery.</h2>
            <p>
              Open the live workspace and continue shaping the application
              around transparent planning, staffing and reporting workflows.
            </p>
          </div>

          <div className="cta-row">
            <Link className="cta cta-primary" href="/login">
              Open workspace
            </Link>
            <a className="cta cta-secondary" href="#story">
              Review core workflows
            </a>
          </div>
        </article>
      </section>
    </main>
  );
}
