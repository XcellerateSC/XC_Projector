import Link from "next/link";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { BlueprintPage } from "@/components/blueprint-page";
import {
  PROFILE_AVATAR_BUCKET,
  buildProfileInitials,
  formatSystemRoleLabel
} from "@/lib/profile";
import { buildPrimaryNav } from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { updateFullName } from "../dashboard/actions";
import {
  SetupDetailPanel,
  SetupSection,
  SetupSelectionPanel,
  SetupWorkspace
} from "../projects/setup-blueprint";
import { removeProfileAvatar, uploadProfileAvatar } from "./actions";

type ProfilePageProps = {
  searchParams: Promise<{
    avatarError?: string;
    avatarRemoved?: string;
    avatarSaved?: string;
    profileError?: string;
    profileSaved?: string;
  }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const { avatarError, avatarRemoved, avatarSaved, profileError, profileSaved } =
    await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, system_role, email, avatar_path")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.full_name ?? user.email ?? "User";
  const initials = buildProfileInitials(profile?.full_name, user.email);
  const roleLabel = formatSystemRoleLabel(profile?.system_role);
  const avatarUrl = profile?.avatar_path
    ? supabase.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(profile.avatar_path).data.publicUrl
    : null;
  const navItems = buildPrimaryNav("overview").map((item) => ({
    ...item,
    active: false
  }));

  return (
    <AppFrame
      actions={
        <Link className="cta cta-secondary" href="/dashboard">
          Back to dashboard
        </Link>
      }
      contentClassName="app-content--fit-screen app-content--timesheet-blueprint app-content--blueprint-page"
      description="Keep your visible identity up to date and manage your personal self-service settings."
      eyebrow="Profile"
      navItems={navItems}
      shellClassName="app-shell--fit-screen app-shell--timesheet-blueprint"
      topbarClassName="app-topbar--compact app-topbar--timesheet-blueprint"
      title="My Profile"
      userLabel={displayName}
    >
      <BlueprintPage>
        <SetupWorkspace>
          <SetupSelectionPanel
            subtitle={`${roleLabel} · ${profile?.email ?? user.email}`}
            title="Profile Media"
          >
            <article className="setup-entry-card dashboard-blueprint-profile-card dashboard-blueprint-profile-card--large">
              <div className="dashboard-profile-top">
                <span className="dashboard-avatar dashboard-avatar--large">
                  {avatarUrl ? (
                    <img
                      alt={`${displayName} profile picture`}
                      className="dashboard-avatar-image"
                      height="72"
                      src={avatarUrl}
                      width="72"
                    />
                  ) : (
                    initials
                  )}
                </span>
                <div className="setup-entry-copy">
                  <strong>{displayName}</strong>
                  <span>{avatarUrl ? "Custom picture uploaded" : "Initials placeholder active"}</span>
                </div>
              </div>
            </article>

            <article className="setup-entry-card">
              <div className="setup-entry-copy">
                <strong>Profile picture</strong>
                <span>
                  Upload a square image to replace the placeholder initials in the navigation and
                  profile views.
                </span>
              </div>
            </article>

            <form action={uploadProfileAvatar} className="setup-entry-card dashboard-blueprint-form-card">
              <label className="field">
                <span>Choose image</span>
                <input accept="image/png,image/jpeg,image/webp,image/gif" name="avatar" type="file" />
              </label>
              {avatarError ? <p className="form-error">{avatarError}</p> : null}
              {avatarSaved ? <p className="form-success">Your profile picture was updated.</p> : null}
              {avatarRemoved ? <p className="form-success">Your profile picture was removed.</p> : null}
              <div className="profile-action-row">
                <button className="cta cta-primary" type="submit">
                  Upload picture
                </button>
              </div>
            </form>

            <form action={removeProfileAvatar} className="profile-action-row">
              <button className="cta cta-secondary" type="submit">
                Remove picture
              </button>
            </form>
          </SetupSelectionPanel>

          <SetupDetailPanel
            metrics={[
              { label: "Role", value: roleLabel },
              { label: "Avatar", value: avatarUrl ? "Custom" : "Placeholder" },
              { label: "Status", value: "Active" }
            ]}
            status={
              <span className="setup-state-chip is-focus">
                <span className="setup-state-chip-dot" />
                Profile
              </span>
            }
            subtitle="Keep your visible identity current so it appears correctly across staffing, time and project views."
            title="Account Details"
            titleLabel="Profile Status"
          >
            <SetupSection label="Visible Identity" meta="Shared app identity">
              <article className="setup-entry-card">
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
            </SetupSection>

            <SetupSection label="Profile Facts" meta="Current account context">
              <article className="setup-entry-card">
                <dl className="kv-list">
                  <div>
                    <dt>Role</dt>
                    <dd>{roleLabel}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{profile?.email ?? user.email ?? "No email available"}</dd>
                  </div>
                  <div>
                    <dt>Avatar status</dt>
                    <dd>{avatarUrl ? "Custom picture uploaded" : "Initials placeholder active"}</dd>
                  </div>
                </dl>
              </article>
            </SetupSection>
          </SetupDetailPanel>
        </SetupWorkspace>
      </BlueprintPage>
    </AppFrame>
  );
}
