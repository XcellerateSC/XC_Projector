import Link from "next/link";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { buildPrimaryNav } from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { updateFullName } from "../dashboard/actions";

type ProfilePageProps = {
  searchParams: Promise<{
    profileError?: string;
    profileSaved?: string;
  }>;
};

function buildInitials(name: string | null | undefined, email: string | null | undefined) {
  const source = name?.trim() || email?.trim() || "User";
  const parts = source
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "U";
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
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

  const displayName = profile?.full_name ?? user.email ?? "User";
  const initials = buildInitials(profile?.full_name, user.email);
  const navItems = buildPrimaryNav("dashboard");

  return (
    <AppFrame
      actions={
        <Link className="cta cta-secondary" href="/dashboard">
          Back to dashboard
        </Link>
      }
      description="This page is the home for personal self-service settings such as name, profile picture and later password management."
      eyebrow="Mein Profil"
      navItems={navItems}
      title={displayName}
      userLabel={displayName}
    >
      <section className="workspace-grid workspace-grid--two">
        <article className="panel dashboard-card dashboard-profile-card">
          <div className="dashboard-profile-top">
            <span className="dashboard-avatar">{initials}</span>
            <div>
              <div className="card-kicker">Personal profile</div>
              <h2>Visible identity</h2>
              <p className="card-copy">
                This area holds the personal information that is shown across
                the application.
              </p>
            </div>
          </div>

          <form action={updateFullName} className="inline-form">
            <input name="return_path" type="hidden" value="/profile" />
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
          <div className="card-kicker">Coming next</div>
          <h2>Self-service settings</h2>
          <div className="profile-placeholder-stack">
            <div className="profile-placeholder">
              <strong>Profile picture</strong>
              <span>The profile button is ready to evolve into an avatar entry point.</span>
            </div>
            <div className="profile-placeholder">
              <strong>Password</strong>
              <span>Password change and security settings can be added here in the next step.</span>
            </div>
            <div className="profile-placeholder">
              <strong>Personal preferences</strong>
              <span>Additional self-service preferences can be grouped here later.</span>
            </div>
          </div>
        </article>
      </section>
    </AppFrame>
  );
}
