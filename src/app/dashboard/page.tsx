import Link from "next/link";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { buildPrimaryNav } from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { logout } from "../login/actions";
import { updateFullName } from "./actions";

type DashboardPageProps = {
  searchParams: Promise<{
    profileError?: string;
    profileSaved?: string;
  }>;
};

export default async function DashboardPage({
  searchParams
}: DashboardPageProps) {
  const { profileError, profileSaved } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, system_role")
    .eq("id", user.id)
    .maybeSingle();

  const navItems = buildPrimaryNav("dashboard");

  return (
    <AppFrame
      actions={
        <form action={logout}>
          <button className="cta cta-secondary" type="submit">
            Sign out
          </button>
        </form>
      }
      description="Your authenticated control surface is now live. Next we will turn these placeholders into project, staffing and time workflows on top of the connected Supabase model."
      eyebrow="Workspace"
      navItems={navItems}
      title={`Welcome back, ${profile?.full_name ?? user.email ?? "User"}`}
      userLabel={profile?.full_name ?? user.email}
    >
      <section className="workspace-grid workspace-grid--three">
        <article className="panel dashboard-card dashboard-card--hero">
          <div className="card-kicker">Session</div>
          <h2>Session snapshot</h2>
          <dl className="kv-list">
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{profile?.system_role ?? "profile missing"}</dd>
            </div>
            <div>
              <dt>User ID</dt>
              <dd>{user.id}</dd>
            </div>
          </dl>
        </article>

        <article className="panel dashboard-card">
          <div className="card-kicker">Profile</div>
          <h2>Your profile name</h2>
          <p className="card-copy">
            The first login can fall back to the email prefix. You can set the
            proper display name here and it will be reflected in the app.
          </p>
          <form action={updateFullName} className="inline-form">
            <label className="field">
              <span>Full name</span>
              <input
                defaultValue={profile?.full_name ?? ""}
                name="full_name"
                placeholder="First name Last name"
                required
                type="text"
              />
            </label>
            {profileError ? <p className="form-error">{profileError}</p> : null}
            {profileSaved ? (
              <p className="form-success">Your display name was updated.</p>
            ) : null}
            <button className="cta cta-primary" type="submit">
              Save name
            </button>
          </form>
        </article>

        <article className="panel dashboard-card">
          <div className="card-kicker">Roadmap</div>
          <h2>Immediate next slices</h2>
          <ul>
            <li>Profile bootstrap and employee directory</li>
            <li>Portfolio, program and project creation</li>
            <li>Position planning and staffing workflow</li>
            <li>Weekly timesheets with internal time accounts</li>
          </ul>
        </article>

        <article className="panel dashboard-card dashboard-card--wide">
          <div className="card-kicker">Repository</div>
          <h2>Repository anchors</h2>
          <ul>
            <li>
              <Link href="/">{`/`}</Link> for the product shell
            </li>
            <li>
              <Link href="/projects">/projects</Link> for portfolio and project setup
            </li>
            <li>
              <Link href="/timesheets">/timesheets</Link> for weekly time capture and submit
            </li>
            <li>
              <Link href="/people">/people</Link> for the first authenticated directory view
            </li>
            <li>
              Supabase migrations under <code>supabase/migrations</code>
            </li>
            <li>
              Product design docs under <code>docs/</code>
            </li>
          </ul>
        </article>
      </section>
    </AppFrame>
  );
}
