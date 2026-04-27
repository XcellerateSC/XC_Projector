import Link from "next/link";

import { requireSignedInProfile } from "@/lib/access";
import { AppFrame } from "@/components/app-frame";
import { BlueprintPage } from "@/components/blueprint-page";
import { formatProficiencyLabel } from "@/lib/skills";
import { buildPrimaryNav } from "@/lib/navigation";

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

function formatProfileListMeta(args: {
  accessCount: number;
  isCurrentProfile: boolean;
  isPortfolioManager: boolean;
  profile: EmployeeProfileRow;
  skillCount: number;
}) {
  const parts = [
    args.profile.job_title ?? args.profile.professional_grades?.name ?? "No title yet",
    `${args.skillCount} skills`
  ];

  if (args.isPortfolioManager) {
    parts.push(`${args.accessCount} grants`);
  }

  if (args.isCurrentProfile) {
    parts.push("My profile");
  }

  return parts.join(" · ");
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
  const { profile: currentProfile, supabase, user } = await requireSignedInProfile();

  const [
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
  const populatedSkillGroups = selectedSkillsByCategory.filter(({ skills }) => skills.length > 0);
  const canEditSelectedSkills =
    !!selectedProfile && (isPortfolioManager || selectedProfile.id === currentProfileId);
  const leadCount = orderedProfileRows.filter((profile) => profile.system_role === "project_lead")
    .length;

  return (
    <AppFrame
      actions={
        <div className="topbar-chip-row">
          <span className="topbar-chip">{orderedProfileRows.length} people</span>
          <span className="topbar-chip">{activeProfileCount} active</span>
          <span className="topbar-chip">{profilesWithSkills} with skills</span>
          <span className="topbar-chip">{leadCount} leads</span>
          {isPortfolioManager ? (
            <span className="topbar-chip">{scopedGrantCount} grants</span>
          ) : null}
        </div>
      }
      contentClassName="app-content--fit-screen app-content--timesheet-blueprint app-content--blueprint-page"
      description="Select a consultant and manage profile, skills and access in one compact workspace."
      eyebrow="Consulting Roster"
      navItems={navItems}
      shellClassName="app-shell--fit-screen app-shell--timesheet-blueprint"
      title="People"
      topbarClassName="app-topbar--compact app-topbar--timesheet-blueprint"
      userLabel={currentProfile?.full_name ?? user.email}
    >
      <BlueprintPage
        notices={
          <>
            {error ? <p className="banner banner--error">{error}</p> : null}
            {success ? <p className="banner banner--success">{success}</p> : null}
          </>
        }
      >
        <section className="people-app">
          <div className="setup-workspace people-shell">
          <aside className="panel setup-selection-panel">
            <div className="setup-selection-head">
              <div className="setup-selection-title">
                <span>People Selection</span>
                <p>{orderedProfileRows.length} visible employees</p>
              </div>
            </div>

            <div className="setup-selection-list">
              {orderedProfileRows.map((profile) => {
                const skillCount = employeeSkillsByProfileId.get(profile.id)?.length ?? 0;
                const accessCount = accessAssignmentsByProfileId.get(profile.id)?.length ?? 0;

                return (
                  <Link
                    className={`setup-selection-link${
                      selectedProfile?.id === profile.id ? " is-selected" : ""
                    }${profile.id === currentProfileId ? " is-current" : ""}`}
                    href={`/people?profile=${profile.id}`}
                    key={profile.id}
                    scroll={false}
                  >
                    <span className="setup-selection-indicator" />

                    <div className="setup-selection-copy">
                      <strong>{profile.full_name}</strong>
                      <span>
                        {formatProfileListMeta({
                          accessCount,
                          isCurrentProfile: profile.id === currentProfileId,
                          isPortfolioManager,
                          profile,
                          skillCount
                        })}
                      </span>
                    </div>

                    <span
                      aria-hidden="true"
                      className={`setup-selection-dot ${
                        profile.is_active
                          ? "setup-selection-dot--good"
                          : "setup-selection-dot--muted"
                      }`}
                    />
                  </Link>
                );
              })}
            </div>
          </aside>

          <div className="people-main">
            {selectedProfile ? (
              <article className="panel setup-detail-panel">
                <header className="setup-detail-header">
                  <div className="setup-detail-copy">
                    <div className="setup-status-title">
                      <span>Profile Status</span>
                      <h2>{selectedProfile.full_name}</h2>
                      <p>
                        {selectedProfile.job_title ??
                          selectedProfile.professional_grades?.name ??
                          formatRoleLabel(selectedProfile.system_role)}
                        {selectedProfile.email ? ` · ${selectedProfile.email}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="setup-detail-head-side">
                    <div className="setup-status-strip">
                      <div>
                        <span>Role</span>
                        <strong>{formatRoleLabel(selectedProfile.system_role)}</strong>
                      </div>
                      <div>
                        <span>Skills</span>
                        <strong>{selectedSkills.length}</strong>
                      </div>
                      <div>
                        <span>Location</span>
                        <strong>{selectedProfile.locations?.name ?? "Not assigned"}</strong>
                      </div>
                      <div>
                        <span>Access</span>
                        <strong>{selectedAccessAssignments.length}</strong>
                      </div>
                    </div>

                    <div className="setup-detail-actions">
                      <span
                        className={`people-state-chip ${
                          selectedProfile.is_active ? "is-active" : "is-inactive"
                        }`}
                      >
                        <span className="people-state-chip-dot" />
                        {selectedProfile.is_active ? "Active" : "Inactive"}
                      </span>
                      {selectedProfile.id === currentProfileId ? (
                        <span className="people-state-chip is-focus">My profile</span>
                      ) : null}
                    </div>
                  </div>
                </header>

                <div className="setup-detail-scroll">
                  <section className="people-section">
                    <div className="setup-section-head">
                      <strong>Profile</strong>
                      <span>Core identity and staffing context</span>
                    </div>

                    <article className="people-entry-card people-profile-card">
                      <dl className="people-profile-grid">
                        <div>
                          <dt>Email</dt>
                          <dd>{selectedProfile.email ?? "Not available"}</dd>
                        </div>
                        <div>
                          <dt>Business unit</dt>
                          <dd>{selectedProfile.business_units?.name ?? "Not assigned"}</dd>
                        </div>
                        <div>
                          <dt>Professional grade</dt>
                          <dd>{selectedProfile.professional_grades?.name ?? "Not assigned"}</dd>
                        </div>
                        <div>
                          <dt>Location</dt>
                          <dd>{selectedProfile.locations?.name ?? "Not assigned"}</dd>
                        </div>
                        <div>
                          <dt>Job title</dt>
                          <dd>{selectedProfile.job_title ?? "Not assigned"}</dd>
                        </div>
                        <div>
                          <dt>Access grants</dt>
                          <dd>{selectedAccessAssignments.length}</dd>
                        </div>
                      </dl>
                    </article>
                  </section>

                  <section className="people-section">
                    <div className="setup-section-head">
                      <strong>Skill Profile</strong>
                      <span>{selectedSkills.length} captured</span>
                    </div>

                    {populatedSkillGroups.length ? (
                      <div className="people-skill-category-grid">
                        {populatedSkillGroups.map(({ category, skills }) => (
                          <section className="people-entry-card people-skill-card" key={category.id}>
                            <div className="people-skill-card-head">
                              <strong>{category.name}</strong>
                              <span>{skills.length}</span>
                            </div>

                            <div className="people-skill-list">
                              {skills.map((employeeSkill) => (
                                <div className="people-skill-item" key={employeeSkill.id}>
                                  <div className="people-skill-copy">
                                    <strong>{employeeSkill.skills?.name ?? "Unknown skill"}</strong>
                                    <span>
                                      {formatProficiencyLabel(employeeSkill.proficiency_score)}
                                    </span>
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
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>
                    ) : (
                      <article className="people-entry-card people-entry-card--empty">
                        No skills captured yet. Add the first one below to improve staffing and
                        matching visibility.
                      </article>
                    )}
                  </section>

                {skillRows.length ? (
                  <section className="people-section">
                    <div className="setup-section-head">
                      <strong>Assign Skill</strong>
                      <span>Category, catalog skill and proficiency</span>
                    </div>

                      <article className="people-entry-card">
                        <form
                          action={saveEmployeeSkill}
                          className="people-form-grid people-form-grid--skill"
                        >
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
                      </article>
                    </section>
                  ) : null}

                {isPortfolioManager ? (
                  <section className="people-section">
                    <div className="setup-section-head">
                      <strong>Profile Admin</strong>
                      <span>Role, status and profile metadata</span>
                    </div>

                      <article className="people-entry-card">
                        <form
                          action={updateProfileAdmin}
                          className="people-form-grid people-form-grid--admin"
                        >
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

                          <div className="people-form-actions people-form-actions--full">
                            <button className="cta cta-secondary" type="submit">
                              Save profile admin
                            </button>
                          </div>
                        </form>
                      </article>
                    </section>
                  ) : null}

                {isPortfolioManager ? (
                  <section className="people-section">
                    <div className="setup-section-head">
                      <strong>Context Access</strong>
                      <span>{selectedAccessAssignments.length} grants</span>
                    </div>

                      {selectedAccessAssignments.length ? (
                        <div className="people-entry-stack">
                          {selectedAccessAssignments.map((assignment) => (
                            <article className="people-entry-card people-access-card" key={assignment.id}>
                              <div className="people-access-copy">
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
                            </article>
                          ))}
                        </div>
                      ) : (
                        <article className="people-entry-card people-entry-card--empty">
                          No scoped access grants yet. Employees rely on their global role and
                          staffing visibility.
                        </article>
                      )}

                      <article className="people-entry-card">
                        <form
                          action={createAccessAssignment}
                          className="people-form-grid people-form-grid--access"
                        >
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

                          <div className="people-form-actions people-form-actions--full">
                            <button className="cta cta-secondary" type="submit">
                              Grant access
                            </button>
                          </div>
                        </form>
                      </article>
                    </section>
                  ) : null}

                <section className="people-section">
                  <div className="setup-section-head">
                    <strong>Skill Catalog</strong>
                    <span>{skillRows.length} active skills</span>
                  </div>

                    {isPortfolioManager ? (
                      <article className="people-entry-card">
                        <form
                          action={createSkill}
                          className="people-form-grid people-form-grid--catalog"
                        >
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
                      </article>
                    ) : (
                      <article className="people-entry-card people-entry-card--empty">
                        Catalog changes stay with portfolio managers. You can still enrich your own
                        profile with the available skills.
                      </article>
                    )}

                    <div className="people-tag-list">
                      {categoryRows.map((category) => (
                        <span className="tag" key={category.id}>
                          {category.name}
                        </span>
                      ))}
                    </div>
                  </section>
                </div>
              </article>
            ) : (
              <article className="panel setup-detail-panel people-detail-panel--empty">
                <div className="setup-detail-scroll">
                  <section className="people-section">
                    <div className="setup-section-head">
                      <strong>People</strong>
                      <span>No visible employee found</span>
                    </div>

                    <article className="people-entry-card people-entry-card--empty">
                      The roster is currently empty for this user. Once profiles are visible, they
                      will appear in the left selection list.
                    </article>
                  </section>
                </div>
              </article>
            )}
          </div>
          </div>
        </section>
      </BlueprintPage>
    </AppFrame>
  );
}
