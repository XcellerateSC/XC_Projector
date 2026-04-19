import Link from "next/link";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import {
  formatProficiencyLabel,
  formatSkillOptionLabel,
  type SkillOption
} from "@/lib/skills";
import { buildPrimaryNav } from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  createAccessAssignment,
  createSkill,
  removeAccessAssignment,
  removeEmployeeSkill,
  saveEmployeeSkill,
  updateProfileAdmin
} from "./actions";

type PeoplePageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

type EmployeeSkillRow = {
  id: string;
  notes: string | null;
  proficiency_score: number | null;
  skills: {
    id: string;
    name: string;
    skill_categories: {
      name: string;
    } | null;
  } | null;
};

type EmployeeAccessAssignmentRow = {
  id: string;
  portfolio_id: string | null;
  program_id: string | null;
  project_id: string | null;
  portfolios: {
    name: string;
  } | null;
  programs: {
    name: string;
  } | null;
  projects: {
    name: string;
  } | null;
};

type EmployeeProfileRow = {
  id: string;
  full_name: string;
  email: string | null;
  system_role: string;
  professional_grade_id: string | null;
  business_unit_id: string | null;
  location_id: string | null;
  job_title: string | null;
  is_active: boolean;
  professional_grades: { name: string } | null;
  business_units: { name: string } | null;
  locations: { name: string } | null;
  employee_skills: EmployeeSkillRow[] | null;
  access_assignments: EmployeeAccessAssignmentRow[] | null;
};

type SkillCategoryRow = {
  id: string;
  name: string;
};

type SkillCatalogRow = {
  id: string;
  name: string;
  skill_categories: {
    name: string;
  } | null;
};

type LookupEntityRow = {
  id: string;
  name: string;
};

type ProgramLookupRow = {
  id: string;
  name: string;
  portfolio_id: string;
};

type ProjectLookupRow = {
  id: string;
  name: string;
  portfolio_id: string;
  program_id: string | null;
};

function sortEmployeeSkills(skillRows: EmployeeSkillRow[]) {
  return [...skillRows].sort((left, right) => {
    const leftCategory = left.skills?.skill_categories?.name ?? "";
    const rightCategory = right.skills?.skill_categories?.name ?? "";

    if (leftCategory !== rightCategory) {
      return leftCategory.localeCompare(rightCategory);
    }

    return (left.skills?.name ?? "").localeCompare(right.skills?.name ?? "");
  });
}

function sortAccessAssignments(accessRows: EmployeeAccessAssignmentRow[]) {
  return [...accessRows].sort((left, right) => {
    const leftLabel =
      left.portfolios?.name ?? left.programs?.name ?? left.projects?.name ?? "";
    const rightLabel =
      right.portfolios?.name ?? right.programs?.name ?? right.projects?.name ?? "";

    return leftLabel.localeCompare(rightLabel);
  });
}

function formatAccessAssignmentLabel(access: EmployeeAccessAssignmentRow) {
  if (access.portfolios?.name) {
    return `Portfolio / ${access.portfolios.name}`;
  }

  if (access.programs?.name) {
    return `Program / ${access.programs.name}`;
  }

  if (access.projects?.name) {
    return `Project / ${access.projects.name}`;
  }

  return "Unknown access scope";
}

export default async function PeoplePage({ searchParams }: PeoplePageProps) {
  const { error, success } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: currentProfile },
    { data: profiles },
    { data: skillCategories },
    { data: skills },
    { data: professionalGrades },
    { data: businessUnits },
    { data: locations },
    { data: portfolios },
    { data: programs },
    { data: projects }
  ] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, system_role")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select(
          `
            id,
            full_name,
            email,
            system_role,
            professional_grade_id,
            business_unit_id,
            location_id,
            job_title,
            is_active,
            professional_grades (
              name
            ),
            business_units (
              name
            ),
            locations (
              name
            ),
            employee_skills (
              id,
              notes,
              proficiency_score,
              skills (
                id,
                name,
                skill_categories (
                  name
                )
              )
            ),
            access_assignments (
              id,
              portfolio_id,
              program_id,
              project_id,
              portfolios (
                name
              ),
              programs (
                name
              ),
              projects (
                name
              )
            )
          `
        )
        .order("full_name", { ascending: true }),
      supabase
        .from("skill_categories")
        .select("id, name")
        .order("sort_order", { ascending: true }),
      supabase
        .from("skills")
        .select(
          `
            id,
            name,
            skill_categories (
              name
            )
          `
        )
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("professional_grades")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase.from("business_units").select("id, name").order("name", { ascending: true }),
      supabase.from("locations").select("id, name").order("name", { ascending: true }),
      supabase.from("portfolios").select("id, name").order("name", { ascending: true }),
      supabase
        .from("programs")
        .select("id, name, portfolio_id")
        .order("name", { ascending: true }),
      supabase
        .from("projects")
        .select("id, name, portfolio_id, program_id")
        .order("name", { ascending: true })
    ]);

  const navItems = buildPrimaryNav("people");
  const profileRows = (profiles as EmployeeProfileRow[] | null) ?? [];
  const categoryRows = (skillCategories as SkillCategoryRow[] | null) ?? [];
  const skillRows = ((skills as SkillCatalogRow[] | null) ?? []).map(
    (skill): SkillOption => ({
      categoryName: skill.skill_categories?.name ?? null,
      id: skill.id,
      name: skill.name
    })
  );
  const gradeRows = (professionalGrades as LookupEntityRow[] | null) ?? [];
  const businessUnitRows = (businessUnits as LookupEntityRow[] | null) ?? [];
  const locationRows = (locations as LookupEntityRow[] | null) ?? [];
  const portfolioRows = (portfolios as LookupEntityRow[] | null) ?? [];
  const programRows = (programs as ProgramLookupRow[] | null) ?? [];
  const projectLookupRows = (projects as ProjectLookupRow[] | null) ?? [];
  const isPortfolioManager = currentProfile?.system_role === "portfolio_manager";
  const profilesWithSkills = profileRows.filter(
    (profile) => (profile.employee_skills ?? []).length > 0
  ).length;

  return (
    <AppFrame
      actions={
        <Link className="cta cta-secondary" href="/dashboard">
          Back to dashboard
        </Link>
      }
      description="The directory now doubles as the capability layer for staffing. Skill data entered here is reused directly in project-level match hints."
      eyebrow="People"
      navItems={navItems}
      title="Visible consulting roster"
      userLabel={currentProfile?.full_name ?? user.email}
    >
      {error ? <p className="banner banner--error">{error}</p> : null}
      {success ? <p className="banner banner--success">{success}</p> : null}

      <section className="workspace-grid workspace-grid--three">
        <article className="panel people-summary-card">
          <div className="card-kicker">Directory stats</div>
          <h2>{profileRows.length} people currently visible</h2>
          <p className="card-copy">
            Profiles stay open-company, while skills now feed directly into the
            staffing experience on project detail pages.
          </p>
          <div className="summary-strip">
            <div>
              <span>Total profiles</span>
              <strong>{profileRows.length}</strong>
            </div>
            <div>
              <span>Profiles with skills</span>
              <strong>{profilesWithSkills}</strong>
            </div>
          </div>
        </article>

        <article className="panel people-summary-card">
          <div className="card-kicker">Skill catalog</div>
          <h2>{skillRows.length} active skills available</h2>
          <p className="card-copy">
            Portfolio managers can extend the reusable skill catalog here. The
            seeded categories already reflect the product design.
          </p>

          {isPortfolioManager ? (
            <form action={createSkill} className="inline-form">
              <label className="field">
                <span>Category</span>
                <select name="skill_category_id" required>
                  <option value="">Select category</option>
                  {categoryRows.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Skill name</span>
                <input name="name" placeholder="Scrum Mastery" required type="text" />
              </label>

              <label className="field">
                <span>Description</span>
                <input
                  name="description"
                  placeholder="Optional explanation or scope note"
                  type="text"
                />
              </label>

              <button className="cta cta-primary" type="submit">
                Add skill to catalog
              </button>
            </form>
          ) : (
            <p className="card-copy">
              Catalog changes stay with portfolio managers. You can still enrich
              your own profile with the available skills below.
            </p>
          )}

          <div className="tag-list">
            {categoryRows.map((category) => (
              <span className="tag" key={category.id}>
                {category.name}
              </span>
            ))}
          </div>
        </article>

        <article className="panel people-summary-card">
          <div className="card-kicker">Skill profile</div>
          <h2>Add or update a profile skill</h2>
          <p className="card-copy">
            Re-using the same skill updates the recorded proficiency, so this
            form works as both first capture and later refinement.
          </p>

          {skillRows.length ? (
            <form action={saveEmployeeSkill} className="inline-form">
              {isPortfolioManager ? (
                <label className="field">
                  <span>Employee</span>
                  <select name="profile_id" required>
                    <option value="">Select employee</option>
                    {profileRows.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.full_name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <input name="profile_id" type="hidden" value={currentProfile?.id ?? user.id} />
              )}

              <label className="field">
                <span>Skill</span>
                <select name="skill_id" required>
                  <option value="">Select skill</option>
                  {skillRows.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {formatSkillOptionLabel(skill)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Proficiency</span>
                <select defaultValue="3" name="proficiency_score" required>
                  <option value="1">1 - Awareness</option>
                  <option value="2">2 - Working</option>
                  <option value="3">3 - Independent</option>
                  <option value="4">4 - Advanced</option>
                  <option value="5">5 - Expert</option>
                </select>
              </label>

              <label className="field">
                <span>Notes</span>
                <input
                  name="notes"
                  placeholder="Optional experience detail or context"
                  type="text"
                />
              </label>

              <button className="cta cta-primary" type="submit">
                Save profile skill
              </button>
            </form>
          ) : (
            <p className="card-copy">
              No active skills exist yet. Create the first catalog skill first,
              then attach it to a profile.
            </p>
          )}
        </article>

        {isPortfolioManager ? (
          <article className="panel people-summary-card">
            <div className="card-kicker">Role admin</div>
            <h2>System roles and context access</h2>
            <p className="card-copy">
              Portfolio managers can now manage both the global system role and
              the scoped access grants that make project leads operationally
              useful inside the app.
            </p>
            <div className="summary-strip">
              <div>
                <span>Project leads</span>
                <strong>
                  {
                    profileRows.filter((profile) => profile.system_role === "project_lead")
                      .length
                  }
                </strong>
              </div>
              <div>
                <span>Scoped grants</span>
                <strong>
                  {profileRows.reduce(
                    (sum, profile) => sum + (profile.access_assignments?.length ?? 0),
                    0
                  )}
                </strong>
              </div>
            </div>
          </article>
        ) : null}
      </section>

      <section className="people-grid people-grid--list">
        {profileRows.map((profile) => {
          const sortedSkills = sortEmployeeSkills(profile.employee_skills ?? []);
          const sortedAccessAssignments = sortAccessAssignments(
            profile.access_assignments ?? []
          );
          const canEditSkills =
            isPortfolioManager || profile.id === (currentProfile?.id ?? user.id);

          return (
            <article className="panel people-card" key={profile.id}>
              <div>
                <div className="people-card-top">
                  <div>
                    <h2>{profile.full_name}</h2>
                    <p>
                      {profile.job_title ??
                        profile.professional_grades?.name ??
                        "No title yet"}
                    </p>
                  </div>
                  <span className="pill">
                    {profile.system_role.replaceAll("_", " ")}
                  </span>
                </div>

                {isPortfolioManager ? (
                  <div className="skill-section">
                    <div className="skill-section-head">
                      <strong>Role and profile admin</strong>
                      <span>{profile.is_active ? "Active user" : "Inactive user"}</span>
                    </div>

                    <form action={updateProfileAdmin} className="inline-form">
                      <input name="profile_id" type="hidden" value={profile.id} />

                      <label className="field">
                        <span>System role</span>
                        <select defaultValue={profile.system_role} name="system_role" required>
                          <option value="employee">Employee</option>
                          <option value="project_lead">Project lead</option>
                          <option value="portfolio_manager">Portfolio manager</option>
                        </select>
                      </label>

                      <label className="field">
                        <span>Active state</span>
                        <select
                          defaultValue={profile.is_active ? "true" : "false"}
                          name="is_active"
                          required
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </label>

                      <label className="field">
                        <span>Professional grade</span>
                        <select
                          defaultValue={profile.professional_grade_id ?? ""}
                          name="professional_grade_id"
                        >
                          <option value="">Not assigned</option>
                          {gradeRows.map((grade) => (
                            <option key={grade.id} value={grade.id}>
                              {grade.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field">
                        <span>Business unit</span>
                        <select
                          defaultValue={profile.business_unit_id ?? ""}
                          name="business_unit_id"
                        >
                          <option value="">Not assigned</option>
                          {businessUnitRows.map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unit.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field">
                        <span>Location</span>
                        <select defaultValue={profile.location_id ?? ""} name="location_id">
                          <option value="">Not assigned</option>
                          {locationRows.map((location) => (
                            <option key={location.id} value={location.id}>
                              {location.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field">
                        <span>Job title</span>
                        <input
                          defaultValue={profile.job_title ?? ""}
                          name="job_title"
                          type="text"
                        />
                      </label>

                      <button className="cta cta-secondary" type="submit">
                        Save user admin
                      </button>
                    </form>
                  </div>
                ) : null}

                <div className="skill-section">
                  <div className="skill-section-head">
                    <strong>Skill profile</strong>
                    <span>{sortedSkills.length} captured</span>
                  </div>

                  {sortedSkills.length ? (
                    <div className="skill-badge-list">
                      {sortedSkills.map((employeeSkill) => (
                        <div className="skill-badge" key={employeeSkill.id}>
                          <div className="skill-badge-copy">
                            <strong>{employeeSkill.skills?.name ?? "Unknown skill"}</strong>
                            <span>
                              {(employeeSkill.skills?.skill_categories?.name ??
                                "Uncategorized") +
                                ` / ${formatProficiencyLabel(employeeSkill.proficiency_score)}`}
                            </span>
                          </div>

                          {canEditSkills ? (
                            <form action={removeEmployeeSkill}>
                              <input name="employee_skill_id" type="hidden" value={employeeSkill.id} />
                              <input name="profile_id" type="hidden" value={profile.id} />
                              <button className="skill-remove" type="submit">
                                Remove
                              </button>
                            </form>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="skill-list-empty">
                      No skills captured yet. Add the first one from the editor
                      above to unlock better staffing hints.
                    </div>
                  )}
                </div>

                {isPortfolioManager ? (
                  <div className="skill-section">
                    <div className="skill-section-head">
                      <strong>Context access</strong>
                      <span>{sortedAccessAssignments.length} grants</span>
                    </div>

                    {sortedAccessAssignments.length ? (
                      <div className="access-chip-list">
                        {sortedAccessAssignments.map((assignment) => (
                          <div className="access-chip" key={assignment.id}>
                            <div className="skill-badge-copy">
                              <strong>{formatAccessAssignmentLabel(assignment)}</strong>
                              <span>Scoped management visibility</span>
                            </div>

                            <form action={removeAccessAssignment}>
                              <input
                                name="access_assignment_id"
                                type="hidden"
                                value={assignment.id}
                              />
                              <button className="skill-remove" type="submit">
                                Remove
                              </button>
                            </form>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="skill-list-empty">
                        No scoped access grants yet. Employees rely only on
                        their global role and staffing visibility.
                      </div>
                    )}

                    <form action={createAccessAssignment} className="inline-form inline-form--divider">
                      <input name="profile_id" type="hidden" value={profile.id} />

                      <label className="field field--full">
                        <span>Add scope</span>
                        <select name="scope_ref" required>
                          <option value="">Select portfolio, program or project</option>
                          {portfolioRows.map((portfolio) => (
                            <option key={`portfolio:${portfolio.id}`} value={`portfolio:${portfolio.id}`}>
                              {`Portfolio / ${portfolio.name}`}
                            </option>
                          ))}
                          {programRows.map((program) => (
                            <option key={`program:${program.id}`} value={`program:${program.id}`}>
                              {`Program / ${program.name}`}
                            </option>
                          ))}
                          {projectLookupRows.map((project) => (
                            <option key={`project:${project.id}`} value={`project:${project.id}`}>
                              {`Project / ${project.name}`}
                            </option>
                          ))}
                        </select>
                      </label>

                      <button className="cta cta-secondary" type="submit">
                        Grant access
                      </button>
                    </form>
                  </div>
                ) : null}
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
          );
        })}
      </section>
    </AppFrame>
  );
}
