import Link from "next/link";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { buildPrimaryNav } from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type EmployeeProfileRow = {
  id: string;
  full_name: string;
  email: string | null;
  system_role: string;
  job_title: string | null;
  professional_grades: { name: string } | null;
  business_units: { name: string } | null;
  locations: { name: string } | null;
};

export default async function PeoplePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      `
        id,
        full_name,
        email,
        system_role,
        job_title,
        professional_grades (
          name
        ),
        business_units (
          name
        ),
        locations (
          name
        )
      `
    )
    .order("full_name", { ascending: true });

  const navItems = buildPrimaryNav("people");

  return (
    <AppFrame
      actions={
        <Link className="cta cta-secondary" href="/dashboard">
          Back to dashboard
        </Link>
      }
      description="The directory follows the open-company rule from the product design: authenticated users can see who is in the organization and where capability data still needs enrichment."
      eyebrow="People"
      navItems={navItems}
      title="Visible consulting roster"
      userLabel={user.email}
    >
      <section className="workspace-grid workspace-grid--two">
        <article className="panel people-summary-card">
          <div className="card-kicker">Directory stats</div>
          <h2>{profiles?.length ?? 0} people currently visible</h2>
          <p className="card-copy">
            This view will later grow into the richer employee profile area
            with full personal master data, skills, certifications and staffing
            context.
          </p>
          <div className="summary-strip">
            <div>
              <span>Total profiles</span>
              <strong>{profiles?.length ?? 0}</strong>
            </div>
            <div>
              <span>Open profile enrichment</span>
              <strong>
                {
                  (profiles as EmployeeProfileRow[] | null)?.filter(
                    (profile) =>
                      !profile.professional_grades?.name ||
                      !profile.business_units?.name ||
                      !profile.locations?.name
                  ).length
                }
              </strong>
            </div>
          </div>
        </article>

        <article className="panel people-summary-card">
          <div className="card-kicker">Direction</div>
          <h2>What comes next here</h2>
          <ul>
            <li>Real employee master data with first and last name</li>
            <li>PM-managed profile enrichment and role administration</li>
            <li>Skill, certification and staffing context on profile detail</li>
          </ul>
        </article>
      </section>

      <section className="people-grid people-grid--list">
        {(profiles as EmployeeProfileRow[] | null)?.map((profile) => (
          <article className="panel people-card" key={profile.id}>
            <div className="people-card-top">
              <div>
                <h2>{profile.full_name}</h2>
                <p>{profile.job_title ?? profile.professional_grades?.name ?? "No title yet"}</p>
              </div>
              <span className="pill">{profile.system_role.replaceAll("_", " ")}</span>
            </div>

            <dl className="people-meta">
              <div>
                <dt>Email</dt>
                <dd>{profile.email ?? "Not available"}</dd>
              </div>
              <div>
                <dt>Business Unit</dt>
                <dd>{profile.business_units?.name ?? "Not assigned"}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{profile.locations?.name ?? "Not assigned"}</dd>
              </div>
              <div>
                <dt>Grade</dt>
                <dd>{profile.professional_grades?.name ?? "Not assigned"}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>
    </AppFrame>
  );
}
