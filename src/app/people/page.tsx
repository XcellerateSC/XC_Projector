import Link from "next/link";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { formatProficiencyLabel } from "@/lib/skills";
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
import { SkillProfileForm } from "./skill-profile-form";

type PeoplePageProps = {
  searchParams: Promise<{
    error?: string;
    profile?: string;
    success?: string;
  }>;
};

type EmployeeSkillRow = {
  id: string;
  profile_id: string;
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
  profile_id: string;
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
};

type SkillCategoryRow = {
  id: string;
  name: string;
};

type SkillCatalogRow = {
  skill_category_id: string;
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
    const leftScore = left.proficiency_score ?? 0;
    const rightScore = right.proficiency_score ?? 0;

    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

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

function sortProfilesForDirectory(args: {
  profiles: EmployeeProfileRow[];
  currentProfileId: string;
}) {
  return [...args.profiles].sort((left, right) => {
    if (left.id === args.currentProfileId) {
      return -1;
    }

    if (right.id === args.currentProfileId) {
      return 1;
    }

    if (left.is_active !== right.is_active) {
      return left.is_active ? -1 : 1;
    }

    return left.full_name.localeCompare(right.full_name);
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

function formatRoleLabel(role: string) {
  return role.replaceAll("_", " ");
}

function buildSkillsByCategory(args: {
  categories: SkillCategoryRow[];
  skills: EmployeeSkillRow[];
}) {
  return args.categories.map((category) => ({
    category,
    skills: args.skills.filter(
      (skill) => skill.skills?.skill_categories?.name === category.name
    )
  }));
}

export default async function PeoplePage({ searchParams }: PeoplePageProps) {
  const { error, profile: selectedProfileParam, success } = await searchParams;
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
  ] = await Promise.all([
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
          skill_category_id,
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
  const skillRows = (skills as SkillCatalogRow[] | null) ?? [];
  const gradeRows = (professionalGrades as LookupEntityRow[] | null) ?? [];
  const businessUnitRows = (businessUnits as LookupEntityRow[] | null) ?? [];
  const locationRows = (locations as LookupEntityRow[] | null) ?? [];
  const portfolioRows = (portfolios as LookupEntityRow[] | null) ?? [];
  const programRows = (programs as ProgramLookupRow[] | null) ?? [];
  const projectLookupRows = (projects as ProjectLookupRow[] | null) ?? [];
  const isPortfolioManager = currentProfile?.system_role === "portfolio_manager";
  const currentProfileId = currentProfile?.id ?? user.id;
  const orderedProfileRows = sortProfilesForDirectory({
    currentProfileId,
    profiles: profileRows
  });
  const selectedProfile =
    orderedProfileRows.find((profile) => profile.id === selectedProfileParam) ??
    orderedProfileRows.find((profile) => profile.id === currentProfileId) ??
    orderedProfileRows[0] ??
    null;
  const orderedProfileIds = orderedProfileRows.map((profile) => profile.id);
  const [{ data: employeeSkills }, { data: accessAssignments }] = await Promise.all([
    orderedProfileIds.length
      ? supabase
          .from("employee_skills")
          .select(
            `
              id,
              profile_id,
              notes,
              proficiency_score,
              skills (
                id,
                name,
                skill_categories (
                  name
                )
              )
            `
          )
          .in("profile_id", orderedProfileIds)
      : Promise.resolve({ data: [] }),
    isPortfolioManager && orderedProfileIds.length
      ? supabase
          .from("access_assignments")
          .select(
            `
              id,
              profile_id,
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
            `
          )
          .in("profile_id", orderedProfileIds)
      : selectedProfile?.id === currentProfileId
        ? supabase
            .from("access_assignments")
            .select(
              `
                id,
                profile_id,
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
              `
            )
            .eq("profile_id", currentProfileId)
        : Promise.resolve({ data: [] })
  ]);
  const employeeSkillRows = (employeeSkills as EmployeeSkillRow[] | null) ?? [];
  const accessAssignmentRows = (accessAssignments as EmployeeAccessAssignmentRow[] | null) ?? [];
  const employeeSkillsByProfileId = new Map<string, EmployeeSkillRow[]>();
  const accessAssignmentsByProfileId = new Map<string, EmployeeAccessAssignmentRow[]>();

  for (const skill of employeeSkillRows) {
    const existingRows = employeeSkillsByProfileId.get(skill.profile_id) ?? [];
    existingRows.push(skill);
    employeeSkillsByProfileId.set(skill.profile_id, existingRows);
  }

  for (const assignment of accessAssignmentRows) {
    const existingRows = accessAssignmentsByProfileId.get(assignment.profile_id) ?? [];
    existingRows.push(assignment);
    accessAssignmentsByProfileId.set(assignment.profile_id, existingRows);
  }

  const activeProfileCount = orderedProfileRows.filter((profile) => profile.is_active).length;
  const profilesWithSkills = employeeSkillsByProfileId.size;
  const scopedGrantCount = accessAssignmentRows.length;
  const selectedSkills = selectedProfile
    ? sortEmployeeSkills(employeeSkillsByProfileId.get(selectedProfile.id) ?? [])
    : [];
  const selectedAccessAssignments = selectedProfile
    ? sortAccessAssignments(accessAssignmentsByProfileId.get(selectedProfile.id) ?? [])
    : [];
  const selectedSkillsByCategory = buildSkillsByCategory({
    categories: categoryRows,
    skills: selectedSkills
  });
  const canEditSelectedSkills =
    !!selectedProfile && (isPortfolioManager || selectedProfile.id === currentProfileId);

  return (
    <AppFrame
      actions={
        <div className="topbar-chip-row">
          <span className="topbar-chip">{orderedProfileRows.length} people</span>
          <span className="topbar-chip">{activeProfileCount} active</span>
          <span className="topbar-chip">{profilesWithSkills} with skills</span>
          <span className="topbar-chip">
            {
              orderedProfileRows.filter((profile) => profile.system_role === "project_lead")
                .length
            }{" "}
            leads
          </span>
          {isPortfolioManager ? (
            <span className="topbar-chip">{scopedGrantCount} grants</span>
          ) : null}
        </div>
      }
      description="Browse the roster on the left, then refine the selected profile on the right."
      eyebrow="People"
      navItems={navItems}
      title="Consulting roster"
      topbarClassName="app-topbar--compact"
      userLabel={currentProfile?.full_name ?? user.email}
    >
      {error ? <p className="banner banner--error">{error}</p> : null}
      {success ? <p className="banner banner--success">{success}</p> : null}

      <section className="workspace-grid workspace-grid--project people-workspace">
        <aside className="panel dashboard-card people-directory-panel">
          <div className="dashboard-card-head">
            <div>
              <div className="card-kicker">Team directory</div>
              <h2>Visible employees</h2>
            </div>
            <span className="pill">{orderedProfileRows.length}</span>
          </div>

          <div className="people-directory-list">
            {orderedProfileRows.map((profile) => {
              const skillCount = employeeSkillsByProfileId.get(profile.id)?.length ?? 0;
              const accessCount = accessAssignmentsByProfileId.get(profile.id)?.length ?? 0;

              return (
                <Link
                  className={`people-directory-row${
                    selectedProfile?.id === profile.id ? " is-selected" : ""
                  }${profile.id === currentProfileId ? " is-current" : ""}`}
                  href={`/people?profile=${profile.id}`}
                  key={profile.id}
                >
                  <div className="people-directory-copy">
                    <strong>{profile.full_name}</strong>
                    <span>
                      {profile.job_title ?? profile.professional_grades?.name ?? "No title yet"}
                    </span>
                  </div>
                  <div className="people-directory-meta">
                    <span className="tag">{skillCount} skills</span>
                    {isPortfolioManager ? <span className="tag">{accessCount} grants</span> : null}
                    <span
                      className={`people-directory-dot ${
                        profile.is_active
                          ? "people-directory-dot--active"
                          : "people-directory-dot--inactive"
                      }`}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </aside>

        <div className="people-main-stack people-main-stack--workspace">
          {selectedProfile ? (
            <>
              <article className="panel dashboard-card people-focus-card">
                <div className="people-focus-head">
                  <div className="people-focus-copy">
                    <div className="card-kicker">Selected profile</div>
                    <h2>{selectedProfile.full_name}</h2>
                  </div>
                  <div className="people-card-badges">
                    <span className="pill">{formatRoleLabel(selectedProfile.system_role)}</span>
                    <span
                      className={`pill ${
                        selectedProfile.is_active ? "pill--good" : "pill--missing"
                      }`}
                    >
                      {selectedProfile.is_active ? "Active" : "Inactive"}
                    </span>
                    {selectedProfile.id === currentProfileId ? (
                      <span className="tag tag--focus">My profile</span>
                    ) : null}
                  </div>
                </div>

                <dl className="people-profile-facts">
                  <div>
                    <dt>Role</dt>
                    <dd>{formatRoleLabel(selectedProfile.system_role)}</dd>
                  </div>
                  <div>
                    <dt>Business unit</dt>
                    <dd>{selectedProfile.business_units?.name ?? "Not assigned"}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{selectedProfile.email ?? "Not available"}</dd>
                  </div>
                  <div>
                    <dt>Skills</dt>
                    <dd>{selectedSkills.length}</dd>
                  </div>
                  <div>
                    <dt>Location</dt>
                    <dd>{selectedProfile.locations?.name ?? "Not assigned"}</dd>
                  </div>
                  <div>
                    <dt>Access grants</dt>
                    <dd>{selectedAccessAssignments.length}</dd>
                  </div>
                </dl>
              </article>

              <article className="panel dashboard-card people-editor-card">
                <div className="people-editor-scroll">
                  <section className="skill-section">
                    <div className="skill-section-head">
                      <strong>Skill profile</strong>
                      <span>{selectedSkills.length} captured</span>
                    </div>

                    {selectedSkills.length ? (
                      <div className="people-skill-grid">
                        {selectedSkillsByCategory.map(({ category, skills }) => (
                          <section className="people-skill-column" key={category.id}>
                            <div className="people-skill-column-head">
                              <strong>{category.name}</strong>
                              <span>{skills.length}</span>
                            </div>

                            <div className="people-skill-column-list">
                              {skills.length ? (
                                skills.map((employeeSkill) => (
                                  <div className="people-skill-row" key={employeeSkill.id}>
                                    <div className="skill-badge-copy">
                                      <strong>{employeeSkill.skills?.name ?? "Unknown skill"}</strong>
                                      <span>{formatProficiencyLabel(employeeSkill.proficiency_score)}</span>
                                    </div>

                                    {canEditSelectedSkills ? (
                                      <form action={removeEmployeeSkill}>
                                        <input
                                          name="employee_skill_id"
                                          type="hidden"
                                          value={employeeSkill.id}
                                        />
                                        <input
                                          name="profile_id"
                                          type="hidden"
                                          value={selectedProfile.id}
                                        />
                                        <button className="skill-remove" type="submit">
                                          Remove
                                        </button>
                                      </form>
                                    ) : null}
                                  </div>
                                ))
                              ) : (
                                <div className="skill-list-empty">No skills yet</div>
                              )}
                            </div>
                          </section>
                        ))}
                      </div>
                    ) : (
                      <div className="skill-list-empty">
                        No skills captured yet. Add the first one below to improve staffing
                        and matching visibility.
                      </div>
                    )}
                  </section>

                  {skillRows.length ? (
                    <section className="skill-section">
                      <div className="skill-section-head">
                        <strong>Assign skill</strong>
                        <span>Category and catalog skill</span>
                      </div>

                      <form action={saveEmployeeSkill} className="inline-form inline-form--row">
                        <SkillProfileForm
                          categories={categoryRows}
                          profileId={selectedProfile.id}
                          skills={skillRows.map((skill) => ({
                            categoryId: skill.skill_category_id,
                            categoryName: skill.skill_categories?.name ?? null,
                            id: skill.id,
                            name: skill.name
                          }))}
                        />
                        <button className="cta cta-primary" type="submit">
                          Assign skill
                        </button>
                      </form>
                    </section>
                  ) : null}

                  {isPortfolioManager ? (
                    <section className="skill-section">
                      <div className="skill-section-head">
                        <strong>Profile admin</strong>
                        <span>Role, status and profile data</span>
                      </div>

                      <form action={updateProfileAdmin} className="inline-form inline-form--compact">
                        <input name="profile_id" type="hidden" value={selectedProfile.id} />

                        <label className="field">
                          <span>System role</span>
                          <select
                            defaultValue={selectedProfile.system_role}
                            name="system_role"
                            required
                          >
                            <option value="employee">Employee</option>
                            <option value="project_lead">Project lead</option>
                            <option value="portfolio_manager">Portfolio manager</option>
                          </select>
                        </label>

                        <label className="field">
                          <span>Active state</span>
                          <select
                            defaultValue={selectedProfile.is_active ? "true" : "false"}
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
                            defaultValue={selectedProfile.professional_grade_id ?? ""}
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
                            defaultValue={selectedProfile.business_unit_id ?? ""}
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
                          <select
                            defaultValue={selectedProfile.location_id ?? ""}
                            name="location_id"
                          >
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
                            defaultValue={selectedProfile.job_title ?? ""}
                            name="job_title"
                            type="text"
                          />
                        </label>

                        <button className="cta cta-secondary" type="submit">
                          Save profile admin
                        </button>
                      </form>
                    </section>
                  ) : null}

                  {isPortfolioManager ? (
                    <section className="skill-section">
                      <div className="skill-section-head">
                        <strong>Context access</strong>
                        <span>{selectedAccessAssignments.length} grants</span>
                      </div>

                      {selectedAccessAssignments.length ? (
                        <div className="access-chip-list">
                          {selectedAccessAssignments.map((assignment) => (
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
                          No scoped access grants yet. Employees rely on their global role and
                          staffing visibility.
                        </div>
                      )}

                      <form action={createAccessAssignment} className="inline-form inline-form--compact">
                        <input name="profile_id" type="hidden" value={selectedProfile.id} />

                        <label className="field field--full">
                          <span>Add scope</span>
                          <select name="scope_ref" required>
                            <option value="">Select portfolio, program or project</option>
                            {portfolioRows.map((portfolio) => (
                              <option
                                key={`portfolio:${portfolio.id}`}
                                value={`portfolio:${portfolio.id}`}
                              >
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
                    </section>
                  ) : null}

                  <section className="skill-section">
                    <div className="skill-section-head">
                      <strong>Skill catalog</strong>
                      <span>{skillRows.length} active skills</span>
                    </div>

                    {isPortfolioManager ? (
                      <form action={createSkill} className="inline-form inline-form--row">
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
                          Add catalog entry
                        </button>
                      </form>
                    ) : (
                      <p className="card-copy">
                        Catalog changes stay with portfolio managers. You can still enrich your
                        own profile with the available skills.
                      </p>
                    )}

                    <div className="tag-list">
                      {categoryRows.map((category) => (
                        <span className="tag" key={category.id}>
                          {category.name}
                        </span>
                      ))}
                    </div>
                  </section>
                </div>
              </article>
            </>
          ) : (
            <article className="panel dashboard-card people-focus-card">
              <div className="card-kicker">People</div>
              <h2>No visible employee found</h2>
              <p className="card-copy">
                The roster is currently empty for this user. Once profiles are visible, they will
                appear in the left directory.
              </p>
            </article>
          )}
        </div>
      </section>
    </AppFrame>
  );
}
