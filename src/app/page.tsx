const productDomains = [
  {
    id: "01",
    title: "Portfolio Planning",
    body: "Create portfolios, programs and projects with charter data, staffing demand and week-based capacity planning."
  },
  {
    id: "02",
    title: "Position-Based Staffing",
    body: "Model demand as plan positions first, then fill them with concrete people over time without losing reporting continuity."
  },
  {
    id: "03",
    title: "Weekly Delivery Tracking",
    body: "Capture actual hours per assignment and internal time account, then submit a full weekly picture against target capacity."
  },
  {
    id: "04",
    title: "Status And Financial Views",
    body: "Track project health, compare plan versus actual, and surface staffing risks and commercial signals for PLs and PMs."
  }
];

const operatingViews = [
  {
    title: "Employee Workspace",
    bullets: [
      "See active assignments and upcoming staffing weeks.",
      "Track project and internal hours against weekly target capacity.",
      "Submit one complete week once project and internal time add up."
    ]
  },
  {
    title: "Project Lead Control",
    bullets: [
      "Manage project positions, staffing and over-allocation warnings.",
      "See who has submitted weekly time and where billing overrides are needed.",
      "Publish one status report per week and keep comments open afterward."
    ]
  },
  {
    title: "Portfolio Oversight",
    bullets: [
      "Monitor stale status reports, open staffing demand and overloaded people.",
      "Review plan-versus-actual capacity and financial trends.",
      "Act as the admin role for master data, permissions and employment capacity."
    ]
  }
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero hero--app">
        <div className="hero-stage panel">
          <div className="hero-stage-rail">
            <div className="hero-stage-mark">XC</div>
            <span className="hero-stage-dot is-active" />
            <span className="hero-stage-dot" />
            <span className="hero-stage-dot" />
          </div>

          <div className="hero-stage-main">
            <div className="hero-stage-bar">
              <div>
                <span className="eyebrow">XC Projector</span>
                <h1>Modern consulting operations, built like a product.</h1>
              </div>

              <div className="cta-row">
                <a className="cta cta-primary" href="/login">
                  Sign in
                </a>
                <a className="cta cta-secondary" href="#domains">
                  View product areas
                </a>
              </div>
            </div>

            <div className="hero-stage-grid">
              <article className="panel hero-stage-card hero-stage-card--lead">
                <div className="card-kicker">Platform direction</div>
                <h2>From planning to delivery intelligence</h2>
                <p>
                  Positions, assignments, weekly time, project health and
                  commercial visibility are now modeled end to end, with
                  Supabase and Next.js already wired underneath.
                </p>
                <div className="stat-grid">
                  <div className="stat-card">
                    <strong>3</strong>
                    <span>system roles with context-based access</span>
                  </div>
                  <div className="stat-card">
                    <strong>1</strong>
                    <span>weekly submission unit per employee</span>
                  </div>
                  <div className="stat-card">
                    <strong>40h</strong>
                    <span>default 100% capacity baseline</span>
                  </div>
                </div>
              </article>

              <article className="panel hero-stage-card">
                <div className="card-kicker">Signals</div>
                <div className="signal-list">
                  <div className="signal">
                    <span>Over-allocation stays possible, but visible.</span>
                    <span className="signal-badge">Warn</span>
                  </div>
                  <div className="signal">
                    <span>Budget data is isolated from employee-safe project views.</span>
                    <span className="signal-badge">Secure</span>
                  </div>
                  <div className="signal">
                    <span>Reported hours and billable overrides stay separate.</span>
                    <span className="signal-badge">Audit</span>
                  </div>
                </div>
              </article>

              <article className="panel hero-stage-card">
                <div className="card-kicker">Foundation snapshot</div>
                <div className="metric-row">
                  <div className="metric">
                    <strong>Planning</strong>
                    <span>Position-based demand with explicit weekly rows</span>
                  </div>
                  <div className="metric">
                    <strong>Staffing</strong>
                    <span>Historized assignments across real consultants</span>
                  </div>
                  <div className="metric">
                    <strong>Reporting</strong>
                    <span>Status, actuals and billing logic on one model</span>
                  </div>
                  <div className="metric">
                    <strong>Auth</strong>
                    <span>Live Supabase login, dashboard and people directory</span>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="domains">
        <div className="section-header">
          <div>
            <h2>Product domains</h2>
            <p>
              The app scaffold is intentionally aligned to the business model we
              designed, so the first implementation slices can follow the same
              structure without a later re-org.
            </p>
          </div>
        </div>

        <div className="feature-grid">
          {productDomains.map((domain) => (
            <article className="panel feature-card" key={domain.id}>
              <span className="feature-index">{domain.id}</span>
              <h3>{domain.title}</h3>
              <p>{domain.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="ops">
        <div className="section-header">
          <div>
            <h2>Operating views</h2>
            <p>
              The UX will diverge by responsibility, but all views sit on top
              of the same weekly planning, staffing and reporting engine.
            </p>
          </div>
        </div>

        <div className="ops-grid">
          {operatingViews.map((view) => (
            <article className="panel ops-card" key={view.title}>
              <h3>{view.title}</h3>
              <ul>
                {view.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <div className="footer-note">
        Supabase environment variables are expected in `.env.local`. The next
        implementation step is connecting the existing Supabase project,
        bootstrapping profiles and then landing the first project/people CRUD
        slices.
      </div>
    </main>
  );
}
