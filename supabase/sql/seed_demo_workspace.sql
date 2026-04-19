-- Demo workspace seed for Xcellerate Projector
--
-- Scope:
-- - existing portfolio manager user (your real login)
-- - 2 project leads
-- - 3 senior consultants
-- - 4 consultants
-- - 5 demo projects with mixed planning, staffing, timesheet and reporting states
--
-- Recommended usage:
-- 1. Keep your real PM user as the existing portfolio manager.
-- 2. Create the 9 demo users in Supabase Auth with scripts/create-demo-users.mjs.
-- 3. Replace only the PM email placeholder below.
-- 4. Run this SQL file in the Supabase SQL editor.
--
-- Important:
-- - This seed is intentionally scoped to DEMO-* data.
-- - It resets selected data for the demo users only, not for your real PM account.

begin;

do $$
declare
  pm_email text := 'stefan.schmid@xcellerate.ch';

  pl_1_email text := 'demo.pl1@xcellerate-projector.local';
  pl_2_email text := 'demo.pl2@xcellerate-projector.local';
  senior_consultant_1_email text := 'demo.sc1@xcellerate-projector.local';
  senior_consultant_2_email text := 'demo.sc2@xcellerate-projector.local';
  senior_consultant_3_email text := 'demo.sc3@xcellerate-projector.local';
  consultant_1_email text := 'demo.c1@xcellerate-projector.local';
  consultant_2_email text := 'demo.c2@xcellerate-projector.local';
  consultant_3_email text := 'demo.c3@xcellerate-projector.local';
  consultant_4_email text := 'demo.c4@xcellerate-projector.local';

  current_week_start date := date_trunc('week', current_date)::date;
  previous_week_start date := current_week_start - 7;
  next_week_start date := current_week_start + 7;

  pm_id uuid;
  pl_1_id uuid;
  pl_2_id uuid;
  senior_consultant_1_id uuid;
  senior_consultant_2_id uuid;
  senior_consultant_3_id uuid;
  consultant_1_id uuid;
  consultant_2_id uuid;
  consultant_3_id uuid;
  consultant_4_id uuid;

  business_unit_consulting_id uuid;
  business_unit_data_id uuid;
  business_unit_strategy_id uuid;
  location_zurich_id uuid;
  location_basel_id uuid;
  location_bern_id uuid;

  grade_manager_id uuid;
  grade_project_leader_id uuid;
  grade_senior_consultant_id uuid;
  grade_consultant_id uuid;

  category_functional_id uuid;
  category_it_id uuid;

  skill_s4_id uuid;
  skill_change_id uuid;
  skill_project_steering_id uuid;
  skill_data_migration_id uuid;
  skill_power_bi_id uuid;
  skill_business_analysis_id uuid;
  skill_pmo_id uuid;

  internal_admin_id uuid;
  internal_training_id uuid;

  portfolio_demo_id uuid;
  program_demo_id uuid;
  customer_alpine_id uuid;
  customer_helvetic_id uuid;
  customer_novus_id uuid;
  client_unit_transformation_id uuid;
  client_unit_data_id uuid;
  client_unit_commercial_id uuid;

  project_s4_id uuid;
  project_data_id uuid;
  project_ops_id uuid;
  project_pmo_id uuid;
  project_cip_id uuid;

  position_s4_arch_id uuid;
  position_s4_change_id uuid;
  position_s4_cutover_id uuid;
  position_data_migration_id uuid;
  position_data_bi_id uuid;
  position_ops_quality_id uuid;
  position_cip_business_id uuid;
  position_cip_reporting_id uuid;
  position_cip_pmo_id uuid;
  position_cip_support_id uuid;

  assignment_s4_arch_sc1_id uuid;
  assignment_s4_change_c1_id uuid;
  assignment_data_migration_sc2_id uuid;
  assignment_data_bi_sc1_id uuid;
  assignment_ops_quality_sc2_id uuid;
  assignment_cip_business_c2_id uuid;
  assignment_cip_reporting_c3_id uuid;
  assignment_cip_pmo_sc3_id uuid;
  assignment_cip_support_c4_id uuid;

  timesheet_sc1_previous_id uuid;
  timesheet_sc1_current_id uuid;
  timesheet_sc2_previous_id uuid;
  timesheet_sc2_current_id uuid;
  timesheet_sc3_current_id uuid;
  timesheet_c1_current_id uuid;
  timesheet_c2_current_id uuid;
  timesheet_c3_current_id uuid;
  timesheet_c4_current_id uuid;

  report_s4_previous_id uuid;
  report_data_current_id uuid;
  report_ops_current_id uuid;
  report_cip_current_id uuid;
begin
  select id into pm_id
  from public.profiles
  where email = pm_email;

  select id into pl_1_id
  from public.profiles
  where email = pl_1_email;

  select id into pl_2_id
  from public.profiles
  where email = pl_2_email;

  select id into senior_consultant_1_id
  from public.profiles
  where email = senior_consultant_1_email;

  select id into senior_consultant_2_id
  from public.profiles
  where email = senior_consultant_2_email;

  select id into senior_consultant_3_id
  from public.profiles
  where email = senior_consultant_3_email;

  select id into consultant_1_id
  from public.profiles
  where email = consultant_1_email;

  select id into consultant_2_id
  from public.profiles
  where email = consultant_2_email;

  select id into consultant_3_id
  from public.profiles
  where email = consultant_3_email;

  select id into consultant_4_id
  from public.profiles
  where email = consultant_4_email;

  if pm_id is null then
    raise exception 'Portfolio manager profile not found for email %', pm_email;
  end if;

  if pl_1_id is null or pl_2_id is null then
    raise exception 'One or more demo project lead profiles are missing. Run the demo user script first.';
  end if;

  if senior_consultant_1_id is null
    or senior_consultant_2_id is null
    or senior_consultant_3_id is null
    or consultant_1_id is null
    or consultant_2_id is null
    or consultant_3_id is null
    or consultant_4_id is null then
    raise exception 'One or more demo consultant profiles are missing. Run the demo user script first.';
  end if;

  delete from public.weekly_timesheets
  where profile_id in (
    pl_1_id,
    pl_2_id,
    senior_consultant_1_id,
    senior_consultant_2_id,
    senior_consultant_3_id,
    consultant_1_id,
    consultant_2_id,
    consultant_3_id,
    consultant_4_id
  )
    and week_start in (previous_week_start, current_week_start);

  delete from public.access_assignments
  where profile_id in (
    pl_1_id,
    pl_2_id,
    senior_consultant_1_id,
    senior_consultant_2_id,
    senior_consultant_3_id,
    consultant_1_id,
    consultant_2_id,
    consultant_3_id,
    consultant_4_id
  );

  delete from public.employee_skills
  where profile_id in (
    pl_1_id,
    pl_2_id,
    senior_consultant_1_id,
    senior_consultant_2_id,
    senior_consultant_3_id,
    consultant_1_id,
    consultant_2_id,
    consultant_3_id,
    consultant_4_id
  );

  delete from public.employment_capacity_history
  where profile_id in (
    pl_1_id,
    pl_2_id,
    senior_consultant_1_id,
    senior_consultant_2_id,
    senior_consultant_3_id,
    consultant_1_id,
    consultant_2_id,
    consultant_3_id,
    consultant_4_id
  );

  delete from public.projects
  where code in ('DEMO-S4', 'DEMO-DATA', 'DEMO-OPS', 'DEMO-PMO', 'DEMO-CIP');

  delete from public.programs
  where code = 'DEMO-DIGI';

  delete from public.client_units
  where name in ('Transformation Office', 'Data and Analytics', 'Commercial Excellence');

  delete from public.customers
  where name in ('Alpine Manufacturing Group', 'Helvetic Energy', 'Novus Retail');

  delete from public.portfolios
  where code = 'DEMO';

  insert into public.business_units (name, description)
  values
    ('Consulting', 'General consulting delivery organization.'),
    ('Data and Analytics', 'Analytics and data engineering delivery team.'),
    ('Strategy and Transformation', 'Transformation and PMO delivery team.')
  on conflict (name) do update
  set description = excluded.description;

  insert into public.locations (name, description)
  values
    ('Zurich', 'Zurich office'),
    ('Basel', 'Basel office'),
    ('Bern', 'Bern office')
  on conflict (name) do update
  set description = excluded.description;

  select id into business_unit_consulting_id
  from public.business_units
  where name = 'Consulting';

  select id into business_unit_data_id
  from public.business_units
  where name = 'Data and Analytics';

  select id into business_unit_strategy_id
  from public.business_units
  where name = 'Strategy and Transformation';

  select id into location_zurich_id
  from public.locations
  where name = 'Zurich';

  select id into location_basel_id
  from public.locations
  where name = 'Basel';

  select id into location_bern_id
  from public.locations
  where name = 'Bern';

  select id into grade_manager_id
  from public.professional_grades
  where name = 'Manager';

  select id into grade_project_leader_id
  from public.professional_grades
  where name = 'Project Leader';

  select id into grade_senior_consultant_id
  from public.professional_grades
  where name = 'Senior Consultant';

  select id into grade_consultant_id
  from public.professional_grades
  where name = 'Consultant';

  if grade_manager_id is null
    or grade_project_leader_id is null
    or grade_senior_consultant_id is null
    or grade_consultant_id is null then
    raise exception 'Expected professional grades are missing.';
  end if;

  update public.profiles
  set
    system_role = 'portfolio_manager',
    professional_grade_id = coalesce(professional_grade_id, grade_manager_id),
    business_unit_id = coalesce(business_unit_id, business_unit_strategy_id),
    location_id = coalesce(location_id, location_zurich_id),
    job_title = coalesce(job_title, 'Portfolio Manager')
  where id = pm_id;

  update public.profiles
  set
    full_name = 'Lena Fischer',
    system_role = 'project_lead',
    professional_grade_id = grade_project_leader_id,
    business_unit_id = business_unit_strategy_id,
    location_id = location_zurich_id,
    job_title = 'Project Lead'
  where id = pl_1_id;

  update public.profiles
  set
    full_name = 'David Meier',
    system_role = 'project_lead',
    professional_grade_id = grade_project_leader_id,
    business_unit_id = business_unit_strategy_id,
    location_id = location_bern_id,
    job_title = 'Project Lead'
  where id = pl_2_id;

  update public.profiles
  set
    full_name = 'Alex Weber',
    system_role = 'employee',
    professional_grade_id = grade_senior_consultant_id,
    business_unit_id = business_unit_consulting_id,
    location_id = location_basel_id,
    job_title = 'Senior Consultant'
  where id = senior_consultant_1_id;

  update public.profiles
  set
    full_name = 'Sam Keller',
    system_role = 'employee',
    professional_grade_id = grade_senior_consultant_id,
    business_unit_id = business_unit_data_id,
    location_id = location_zurich_id,
    job_title = 'Senior Consultant'
  where id = senior_consultant_2_id;

  update public.profiles
  set
    full_name = 'Nora Baumann',
    system_role = 'employee',
    professional_grade_id = grade_senior_consultant_id,
    business_unit_id = business_unit_strategy_id,
    location_id = location_bern_id,
    job_title = 'Senior Consultant'
  where id = senior_consultant_3_id;

  update public.profiles
  set
    full_name = 'Mia Roth',
    system_role = 'employee',
    professional_grade_id = grade_consultant_id,
    business_unit_id = business_unit_consulting_id,
    location_id = location_zurich_id,
    job_title = 'Consultant'
  where id = consultant_1_id;

  update public.profiles
  set
    full_name = 'Luca Steiner',
    system_role = 'employee',
    professional_grade_id = grade_consultant_id,
    business_unit_id = business_unit_consulting_id,
    location_id = location_basel_id,
    job_title = 'Consultant'
  where id = consultant_2_id;

  update public.profiles
  set
    full_name = 'Eva Brunner',
    system_role = 'employee',
    professional_grade_id = grade_consultant_id,
    business_unit_id = business_unit_data_id,
    location_id = location_zurich_id,
    job_title = 'Consultant'
  where id = consultant_3_id;

  update public.profiles
  set
    full_name = 'Jonas Frei',
    system_role = 'employee',
    professional_grade_id = grade_consultant_id,
    business_unit_id = business_unit_strategy_id,
    location_id = location_bern_id,
    job_title = 'Consultant'
  where id = consultant_4_id;

  insert into public.employment_capacity_history (
    profile_id,
    capacity_percent,
    valid_from,
    valid_to,
    notes
  )
  values
    (pl_1_id, 100, current_week_start - 120, null, 'Demo baseline'),
    (pl_2_id, 100, current_week_start - 120, null, 'Demo baseline'),
    (senior_consultant_1_id, 100, current_week_start - 120, null, 'Full-time demo consultant'),
    (senior_consultant_2_id, 80, current_week_start - 120, null, 'Part-time demo consultant for overcapacity signal'),
    (senior_consultant_3_id, 100, current_week_start - 120, null, 'Full-time demo consultant'),
    (consultant_1_id, 100, current_week_start - 120, null, 'Full-time demo consultant'),
    (consultant_2_id, 100, current_week_start - 120, null, 'Full-time demo consultant'),
    (consultant_3_id, 100, current_week_start - 120, null, 'Full-time demo consultant'),
    (consultant_4_id, 100, current_week_start - 120, null, 'Full-time demo consultant');

  select id into category_functional_id
  from public.skill_categories
  where name = 'Functional Experience';

  select id into category_it_id
  from public.skill_categories
  where name = 'IT Applications';

  if category_functional_id is null or category_it_id is null then
    raise exception 'Expected skill categories are missing.';
  end if;

  insert into public.skills (skill_category_id, name, description, is_active)
  values
    (category_functional_id, 'SAP S/4HANA', 'ERP transformation delivery experience.', true),
    (category_functional_id, 'Change Management', 'Stakeholder and adoption management.', true),
    (category_functional_id, 'Project Steering', 'Planning, reporting and governance.', true),
    (category_functional_id, 'Business Analysis', 'Requirements shaping and process analysis.', true),
    (category_functional_id, 'PMO Setup', 'Governance, cadence and reporting setup.', true),
    (category_it_id, 'Data Migration', 'Migration planning and execution.', true),
    (category_it_id, 'Power BI', 'Dashboarding and reporting implementation.', true)
  on conflict (skill_category_id, name) do update
  set
    description = excluded.description,
    is_active = excluded.is_active;

  select id into skill_s4_id
  from public.skills
  where skill_category_id = category_functional_id
    and name = 'SAP S/4HANA';

  select id into skill_change_id
  from public.skills
  where skill_category_id = category_functional_id
    and name = 'Change Management';

  select id into skill_project_steering_id
  from public.skills
  where skill_category_id = category_functional_id
    and name = 'Project Steering';

  select id into skill_business_analysis_id
  from public.skills
  where skill_category_id = category_functional_id
    and name = 'Business Analysis';

  select id into skill_pmo_id
  from public.skills
  where skill_category_id = category_functional_id
    and name = 'PMO Setup';

  select id into skill_data_migration_id
  from public.skills
  where skill_category_id = category_it_id
    and name = 'Data Migration';

  select id into skill_power_bi_id
  from public.skills
  where skill_category_id = category_it_id
    and name = 'Power BI';

  insert into public.employee_skills (profile_id, skill_id, proficiency_score, notes)
  values
    (pl_1_id, skill_project_steering_id, 5, 'Program and project governance.'),
    (pl_1_id, skill_change_id, 4, 'Experienced in transformation communication.'),
    (pl_2_id, skill_project_steering_id, 4, 'Owns pilot governance and steering.'),
    (pl_2_id, skill_business_analysis_id, 4, 'Strong business-facing project delivery.'),
    (senior_consultant_1_id, skill_s4_id, 4, 'Supports ERP rollout and design alignment.'),
    (senior_consultant_1_id, skill_power_bi_id, 3, 'Supports KPI and dashboard views.'),
    (senior_consultant_2_id, skill_data_migration_id, 5, 'Leads migration planning and execution.'),
    (senior_consultant_2_id, skill_power_bi_id, 4, 'Supports reporting and analytics delivery.'),
    (senior_consultant_3_id, skill_pmo_id, 4, 'Experienced in PMO setup and coordination.'),
    (senior_consultant_3_id, skill_business_analysis_id, 3, 'Supports structured business analysis.'),
    (consultant_1_id, skill_change_id, 3, 'Supports change and communication tasks.'),
    (consultant_2_id, skill_business_analysis_id, 4, 'Business-facing analysis and workshop preparation.'),
    (consultant_3_id, skill_power_bi_id, 4, 'Builds and adapts dashboard content.'),
    (consultant_4_id, skill_pmo_id, 3, 'Supports tracking and PMO administration.')
  on conflict (profile_id, skill_id) do update
  set
    proficiency_score = excluded.proficiency_score,
    notes = excluded.notes;

  insert into public.portfolios (name, code, description, is_active)
  values ('Demo Portfolio', 'DEMO', 'Dedicated demo portfolio for realistic walkthrough data.', true)
  returning id into portfolio_demo_id;

  insert into public.programs (portfolio_id, name, code, description, is_active)
  values (
    portfolio_demo_id,
    'Digital Transformation',
    'DEMO-DIGI',
    'Shared demo program for planning, staffing, reporting and dashboard walkthroughs.',
    true
  )
  returning id into program_demo_id;

  insert into public.customers (name, legal_name, billing_notes, is_active)
  values
    ('Alpine Manufacturing Group', 'Alpine Manufacturing Group AG', 'Demo customer for ERP transformation.', true)
  returning id into customer_alpine_id;

  insert into public.customers (name, legal_name, billing_notes, is_active)
  values
    ('Helvetic Energy', 'Helvetic Energy AG', 'Demo customer for analytics and data use cases.', true)
  returning id into customer_helvetic_id;

  insert into public.customers (name, legal_name, billing_notes, is_active)
  values
    ('Novus Retail', 'Novus Retail AG', 'Demo customer for business-facing pilot initiatives.', true)
  returning id into customer_novus_id;

  insert into public.client_units (customer_id, name, description)
  values
    (customer_alpine_id, 'Transformation Office', 'Sponsors ERP rollout and PMO workstreams.')
  returning id into client_unit_transformation_id;

  insert into public.client_units (customer_id, name, description)
  values
    (customer_helvetic_id, 'Data and Analytics', 'Owns migration and reporting initiatives.')
  returning id into client_unit_data_id;

  insert into public.client_units (customer_id, name, description)
  values
    (customer_novus_id, 'Commercial Excellence', 'Owns customer insights and pilot enablement.')
  returning id into client_unit_commercial_id;

  insert into public.access_assignments (profile_id, program_id, can_edit, created_by)
  values
    (pl_1_id, program_demo_id, true, pm_id)
  on conflict do nothing;

  insert into public.projects (
    portfolio_id,
    program_id,
    customer_id,
    client_unit_id,
    name,
    code,
    description,
    lifecycle_status,
    internal_project_lead_id,
    start_date,
    end_date,
    created_by
  )
  values (
    portfolio_demo_id,
    program_demo_id,
    customer_alpine_id,
    client_unit_transformation_id,
    'S/4 Rollout Wave 1',
    'DEMO-S4',
    'ERP rollout with one open planning/staffing signal.',
    'active',
    pl_1_id,
    current_week_start - 56,
    current_week_start + 84,
    pm_id
  )
  returning id into project_s4_id;

  insert into public.projects (
    portfolio_id,
    program_id,
    customer_id,
    client_unit_id,
    name,
    code,
    description,
    lifecycle_status,
    internal_project_lead_id,
    start_date,
    end_date,
    created_by
  )
  values (
    portfolio_demo_id,
    program_demo_id,
    customer_helvetic_id,
    client_unit_data_id,
    'Data Platform Migration',
    'DEMO-DATA',
    'Active migration project with a current draft report.',
    'active',
    pl_1_id,
    current_week_start - 42,
    current_week_start + 70,
    pm_id
  )
  returning id into project_data_id;

  insert into public.projects (
    portfolio_id,
    program_id,
    customer_id,
    client_unit_id,
    name,
    code,
    description,
    lifecycle_status,
    internal_project_lead_id,
    start_date,
    end_date,
    created_by
  )
  values (
    portfolio_demo_id,
    program_demo_id,
    customer_helvetic_id,
    client_unit_data_id,
    'Operational Reporting Stabilization',
    'DEMO-OPS',
    'Short-term support project used for the overcapacity example.',
    'active',
    pl_1_id,
    current_week_start - 21,
    current_week_start + 35,
    pm_id
  )
  returning id into project_ops_id;

  insert into public.projects (
    portfolio_id,
    program_id,
    customer_id,
    client_unit_id,
    name,
    code,
    description,
    lifecycle_status,
    internal_project_lead_id,
    start_date,
    end_date,
    created_by
  )
  values (
    portfolio_demo_id,
    program_demo_id,
    customer_alpine_id,
    client_unit_transformation_id,
    'PMO Transition Support',
    'DEMO-PMO',
    'Planned PMO setup project without positions yet.',
    'planned',
    pl_1_id,
    current_week_start - 7,
    current_week_start + 63,
    pm_id
  )
  returning id into project_pmo_id;

  insert into public.projects (
    portfolio_id,
    program_id,
    customer_id,
    client_unit_id,
    name,
    code,
    description,
    lifecycle_status,
    internal_project_lead_id,
    start_date,
    end_date,
    created_by
  )
  values (
    portfolio_demo_id,
    program_demo_id,
    customer_novus_id,
    client_unit_commercial_id,
    'Customer Insights Pilot',
    'DEMO-CIP',
    'Business-facing pilot with healthy green signals.',
    'active',
    pl_2_id,
    current_week_start - 14,
    current_week_start + 42,
    pm_id
  )
  returning id into project_cip_id;

  insert into public.access_assignments (profile_id, project_id, can_edit, created_by)
  values
    (pl_2_id, project_cip_id, true, pm_id)
  on conflict do nothing;

  insert into public.project_charters (project_id, objective, scope_summary, milestones_summary, phases_summary)
  values
    (
      project_s4_id,
      'Deliver the first rollout wave of the S/4 program.',
      'Template alignment, fit-gap review and rollout preparation.',
      'Design complete, test readiness, cutover preparation.',
      'Design, build, test, deploy.'
    ),
    (
      project_data_id,
      'Migrate the analytics platform into the new target architecture.',
      'Migration planning, reporting continuity and dashboard transition.',
      'Migration plan approved, pilot migration, reporting handover.',
      'Assessment, migration, stabilization.'
    ),
    (
      project_ops_id,
      'Stabilize the reporting stack and remove operational bottlenecks.',
      'Issue backlog cleanup, defect handling and reporting fixes.',
      'Backlog triage, defect closure, handover.',
      'Triage, remediation, handover.'
    ),
    (
      project_pmo_id,
      'Prepare the PMO transition for the next transformation phase.',
      'Planning, governance setup and cadence design.',
      'Governance baseline, reporting template, kickoff.',
      'Setup, transition, kickoff.'
    ),
    (
      project_cip_id,
      'Deliver a first customer insights pilot with a stable reporting cadence.',
      'Business requirement shaping, pilot dashboards and steering setup.',
      'Pilot scope agreed, first release, business review.',
      'Setup, pilot, review.'
    );

  insert into public.project_financials (project_id, declared_budget, currency_code, budget_notes)
  values
    (project_s4_id, 420000, 'CHF', 'Demo budget for rollout wave 1'),
    (project_data_id, 280000, 'CHF', 'Demo budget for migration and stabilization'),
    (project_ops_id, 95000, 'CHF', 'Demo budget for short-term stabilization'),
    (project_pmo_id, 150000, 'CHF', 'Demo budget for PMO setup'),
    (project_cip_id, 120000, 'CHF', 'Demo budget for the pilot scope');

  insert into public.project_positions (
    project_id,
    title,
    professional_grade_id,
    description,
    start_date,
    end_date,
    rate_unit,
    rate_amount,
    currency_code,
    is_active
  )
  values
    (
      project_s4_id,
      'Solution Architect',
      grade_senior_consultant_id,
      'Owns solution design and rollout readiness.',
      current_week_start - 42,
      current_week_start + 42,
      'hourly',
      180,
      'CHF',
      true
    )
  returning id into position_s4_arch_id;

  insert into public.project_positions (
    project_id,
    title,
    professional_grade_id,
    description,
    start_date,
    end_date,
    rate_unit,
    rate_amount,
    currency_code,
    is_active
  )
  values
    (
      project_s4_id,
      'Change Manager',
      grade_consultant_id,
      'Supports communication and stakeholder enablement.',
      current_week_start - 14,
      current_week_start + 42,
      'hourly',
      145,
      'CHF',
      true
    )
  returning id into position_s4_change_id;

  insert into public.project_positions (
    project_id,
    title,
    professional_grade_id,
    description,
    start_date,
    end_date,
    rate_unit,
    rate_amount,
    currency_code,
    is_active
  )
  values
    (
      project_s4_id,
      'Cutover Support',
      grade_consultant_id,
      'Still open to demonstrate an active unstaffed position.',
      current_week_start,
      current_week_start + 28,
      'hourly',
      135,
      'CHF',
      true
    )
  returning id into position_s4_cutover_id;

  insert into public.project_positions (
    project_id,
    title,
    professional_grade_id,
    description,
    start_date,
    end_date,
    rate_unit,
    rate_amount,
    currency_code,
    is_active
  )
  values
    (
      project_data_id,
      'Data Migration Lead',
      grade_senior_consultant_id,
      'Leads migration execution and readiness planning.',
      current_week_start - 28,
      current_week_start + 56,
      'hourly',
      170,
      'CHF',
      true
    )
  returning id into position_data_migration_id;

  insert into public.project_positions (
    project_id,
    title,
    professional_grade_id,
    description,
    start_date,
    end_date,
    rate_unit,
    rate_amount,
    currency_code,
    is_active
  )
  values
    (
      project_data_id,
      'BI Enablement Analyst',
      grade_senior_consultant_id,
      'Supports dashboard migration and KPI continuity.',
      current_week_start - 21,
      current_week_start + 56,
      'hourly',
      155,
      'CHF',
      true
    )
  returning id into position_data_bi_id;

  insert into public.project_positions (
    project_id,
    title,
    professional_grade_id,
    description,
    start_date,
    end_date,
    rate_unit,
    rate_amount,
    currency_code,
    is_active
  )
  values
    (
      project_ops_id,
      'Data Quality Support',
      grade_senior_consultant_id,
      'Short-term support role used for the overcapacity example.',
      current_week_start - 7,
      current_week_start + 28,
      'hourly',
      150,
      'CHF',
      true
    )
  returning id into position_ops_quality_id;

  insert into public.project_positions (
    project_id,
    title,
    professional_grade_id,
    description,
    start_date,
    end_date,
    rate_unit,
    rate_amount,
    currency_code,
    is_active
  )
  values
    (
      project_cip_id,
      'Business Analyst',
      grade_consultant_id,
      'Shapes requirements with the business owners.',
      current_week_start - 7,
      current_week_start + 35,
      'hourly',
      140,
      'CHF',
      true
    )
  returning id into position_cip_business_id;

  insert into public.project_positions (
    project_id,
    title,
    professional_grade_id,
    description,
    start_date,
    end_date,
    rate_unit,
    rate_amount,
    currency_code,
    is_active
  )
  values
    (
      project_cip_id,
      'Reporting Analyst',
      grade_consultant_id,
      'Builds and adapts the pilot reporting views.',
      current_week_start - 7,
      current_week_start + 35,
      'hourly',
      140,
      'CHF',
      true
    )
  returning id into position_cip_reporting_id;

  insert into public.project_positions (
    project_id,
    title,
    professional_grade_id,
    description,
    start_date,
    end_date,
    rate_unit,
    rate_amount,
    currency_code,
    is_active
  )
  values
    (
      project_cip_id,
      'PMO Support',
      grade_senior_consultant_id,
      'Coordinates cadence, follow-ups and steering structure.',
      current_week_start - 7,
      current_week_start + 35,
      'hourly',
      165,
      'CHF',
      true
    )
  returning id into position_cip_pmo_id;

  insert into public.project_positions (
    project_id,
    title,
    professional_grade_id,
    description,
    start_date,
    end_date,
    rate_unit,
    rate_amount,
    currency_code,
    is_active
  )
  values
    (
      project_cip_id,
      'Pilot Support',
      grade_consultant_id,
      'Supports workshops, tracking and documentation.',
      current_week_start - 7,
      current_week_start + 35,
      'hourly',
      135,
      'CHF',
      true
    )
  returning id into position_cip_support_id;

  insert into public.project_position_weeks (
    project_position_id,
    week_start,
    planned_hours,
    planned_allocation_percent
  )
  values
    (position_s4_arch_id, previous_week_start, 24, 60),
    (position_s4_arch_id, current_week_start, 24, 60),
    (position_s4_arch_id, next_week_start, 24, 60),
    (position_s4_change_id, previous_week_start, 16, 40),
    (position_s4_change_id, current_week_start, 16, 40),
    (position_s4_change_id, next_week_start, 16, 40),
    (position_s4_cutover_id, current_week_start, 8, 20),
    (position_s4_cutover_id, next_week_start, 8, 20),
    (position_data_migration_id, previous_week_start, 20, 50),
    (position_data_migration_id, current_week_start, 20, 50),
    (position_data_migration_id, next_week_start, 20, 50),
    (position_data_bi_id, previous_week_start, 16, 40),
    (position_data_bi_id, current_week_start, 16, 40),
    (position_data_bi_id, next_week_start, 16, 40),
    (position_ops_quality_id, previous_week_start, 20, 50),
    (position_ops_quality_id, current_week_start, 20, 50),
    (position_ops_quality_id, next_week_start, 20, 50),
    (position_cip_business_id, current_week_start, 24, 60),
    (position_cip_business_id, next_week_start, 24, 60),
    (position_cip_reporting_id, current_week_start, 16, 40),
    (position_cip_reporting_id, next_week_start, 16, 40),
    (position_cip_pmo_id, current_week_start, 16, 40),
    (position_cip_pmo_id, next_week_start, 16, 40),
    (position_cip_support_id, current_week_start, 8, 20),
    (position_cip_support_id, next_week_start, 8, 20);

  insert into public.project_position_skill_requirements (
    project_position_id,
    skill_id,
    requirement_level,
    weight,
    notes
  )
  values
    (position_s4_arch_id, skill_s4_id, 'required', 80, 'Core rollout capability'),
    (position_s4_change_id, skill_change_id, 'required', 70, 'Change stream support'),
    (position_s4_cutover_id, skill_project_steering_id, 'preferred', 30, 'Helpful during cutover preparation'),
    (position_data_migration_id, skill_data_migration_id, 'required', 90, 'Migration lead capability'),
    (position_data_bi_id, skill_power_bi_id, 'required', 80, 'Dashboard continuity support'),
    (position_ops_quality_id, skill_power_bi_id, 'required', 70, 'Operational reporting support'),
    (position_cip_business_id, skill_business_analysis_id, 'required', 80, 'Business-facing requirement shaping'),
    (position_cip_reporting_id, skill_power_bi_id, 'required', 70, 'Pilot reporting support'),
    (position_cip_pmo_id, skill_pmo_id, 'required', 70, 'Structured steering support'),
    (position_cip_support_id, skill_business_analysis_id, 'preferred', 30, 'Workshop and documentation support');

  insert into public.project_assignments (
    project_position_id,
    profile_id,
    assigned_from,
    assigned_to,
    notes
  )
  values
    (position_s4_arch_id, senior_consultant_1_id, current_week_start - 42, current_week_start + 42, 'Primary rollout architect')
  returning id into assignment_s4_arch_sc1_id;

  insert into public.project_assignments (
    project_position_id,
    profile_id,
    assigned_from,
    assigned_to,
    notes
  )
  values
    (position_s4_change_id, consultant_1_id, current_week_start - 14, current_week_start + 42, 'Supports communication and adoption activities')
  returning id into assignment_s4_change_c1_id;

  insert into public.project_assignments (
    project_position_id,
    profile_id,
    assigned_from,
    assigned_to,
    notes
  )
  values
    (position_data_migration_id, senior_consultant_2_id, current_week_start - 28, current_week_start + 56, 'Owns migration planning and execution')
  returning id into assignment_data_migration_sc2_id;

  insert into public.project_assignments (
    project_position_id,
    profile_id,
    assigned_from,
    assigned_to,
    notes
  )
  values
    (position_data_bi_id, senior_consultant_1_id, current_week_start - 21, current_week_start + 56, 'Supports reporting and dashboard migration')
  returning id into assignment_data_bi_sc1_id;

  insert into public.project_assignments (
    project_position_id,
    profile_id,
    assigned_from,
    assigned_to,
    notes
  )
  values
    (position_ops_quality_id, senior_consultant_2_id, current_week_start - 7, current_week_start + 28, 'Secondary assignment to trigger overcapacity signal')
  returning id into assignment_ops_quality_sc2_id;

  insert into public.project_assignments (
    project_position_id,
    profile_id,
    assigned_from,
    assigned_to,
    notes
  )
  values
    (position_cip_business_id, consultant_2_id, current_week_start - 7, current_week_start + 35, 'Owns pilot workshop preparation')
  returning id into assignment_cip_business_c2_id;

  insert into public.project_assignments (
    project_position_id,
    profile_id,
    assigned_from,
    assigned_to,
    notes
  )
  values
    (position_cip_reporting_id, consultant_3_id, current_week_start - 7, current_week_start + 35, 'Builds reporting views and pilot dashboards')
  returning id into assignment_cip_reporting_c3_id;

  insert into public.project_assignments (
    project_position_id,
    profile_id,
    assigned_from,
    assigned_to,
    notes
  )
  values
    (position_cip_pmo_id, senior_consultant_3_id, current_week_start - 7, current_week_start + 35, 'Coordinates pilot governance and cadence')
  returning id into assignment_cip_pmo_sc3_id;

  insert into public.project_assignments (
    project_position_id,
    profile_id,
    assigned_from,
    assigned_to,
    notes
  )
  values
    (position_cip_support_id, consultant_4_id, current_week_start - 7, current_week_start + 35, 'Supports documentation and follow-up')
  returning id into assignment_cip_support_c4_id;

  insert into public.project_assignment_weeks (
    project_assignment_id,
    week_start,
    assigned_hours,
    assigned_allocation_percent
  )
  values
    (assignment_s4_arch_sc1_id, previous_week_start, 24, 60),
    (assignment_s4_arch_sc1_id, current_week_start, 24, 60),
    (assignment_s4_arch_sc1_id, next_week_start, 24, 60),
    (assignment_s4_change_c1_id, previous_week_start, 16, 40),
    (assignment_s4_change_c1_id, current_week_start, 16, 40),
    (assignment_s4_change_c1_id, next_week_start, 16, 40),
    (assignment_data_migration_sc2_id, previous_week_start, 20, 50),
    (assignment_data_migration_sc2_id, current_week_start, 20, 50),
    (assignment_data_migration_sc2_id, next_week_start, 20, 50),
    (assignment_data_bi_sc1_id, previous_week_start, 16, 40),
    (assignment_data_bi_sc1_id, current_week_start, 16, 40),
    (assignment_data_bi_sc1_id, next_week_start, 16, 40),
    (assignment_ops_quality_sc2_id, previous_week_start, 20, 50),
    (assignment_ops_quality_sc2_id, current_week_start, 20, 50),
    (assignment_ops_quality_sc2_id, next_week_start, 20, 50),
    (assignment_cip_business_c2_id, current_week_start, 24, 60),
    (assignment_cip_business_c2_id, next_week_start, 24, 60),
    (assignment_cip_reporting_c3_id, current_week_start, 16, 40),
    (assignment_cip_reporting_c3_id, next_week_start, 16, 40),
    (assignment_cip_pmo_sc3_id, current_week_start, 16, 40),
    (assignment_cip_pmo_sc3_id, next_week_start, 16, 40),
    (assignment_cip_support_c4_id, current_week_start, 8, 20),
    (assignment_cip_support_c4_id, next_week_start, 8, 20);

  insert into public.status_reports (
    project_id,
    week_start,
    state,
    overall_progress_percent,
    objective_status,
    objective_comment,
    timeline_status,
    timeline_comment,
    budget_status,
    budget_comment,
    scope_status,
    scope_comment,
    risks_status,
    risks_comment,
    created_by,
    submitted_by,
    submitted_at
  )
  values
    (
      project_s4_id,
      previous_week_start,
      'submitted',
      50,
      'green',
      'Wave 1 design is progressing as planned.',
      'yellow',
      'Cutover preparation needs close coordination.',
      'green',
      'Budget remains stable.',
      'green',
      'Scope is aligned.',
      'yellow',
      'The cutover support role is still open.',
      pl_1_id,
      pl_1_id,
      timezone('utc', now()) - interval '7 days'
    )
  returning id into report_s4_previous_id;

  insert into public.status_reports (
    project_id,
    week_start,
    state,
    overall_progress_percent,
    objective_status,
    objective_comment,
    timeline_status,
    timeline_comment,
    budget_status,
    budget_comment,
    scope_status,
    scope_comment,
    risks_status,
    risks_comment,
    created_by,
    submitted_by,
    submitted_at
  )
  values
    (
      project_data_id,
      current_week_start,
      'draft',
      40,
      'green',
      'Migration approach is aligned.',
      'yellow',
      'Pilot timing still needs sign-off.',
      'green',
      'Budget baseline remains acceptable.',
      'green',
      'Scope is stable.',
      'yellow',
      'Test data quality needs follow-up.',
      pl_1_id,
      null,
      null
    )
  returning id into report_data_current_id;

  insert into public.status_reports (
    project_id,
    week_start,
    state,
    overall_progress_percent,
    objective_status,
    objective_comment,
    timeline_status,
    timeline_comment,
    budget_status,
    budget_comment,
    scope_status,
    scope_comment,
    risks_status,
    risks_comment,
    created_by,
    submitted_by,
    submitted_at
  )
  values
    (
      project_ops_id,
      current_week_start,
      'submitted',
      70,
      'green',
      'Backlog closure is visible.',
      'green',
      'Stabilization remains on plan.',
      'green',
      'Spend is aligned to mandate.',
      'green',
      'Scope remains controlled.',
      'yellow',
      'One consultant is temporarily over capacity.',
      pl_1_id,
      pl_1_id,
      timezone('utc', now())
    )
  returning id into report_ops_current_id;

  insert into public.status_reports (
    project_id,
    week_start,
    state,
    overall_progress_percent,
    objective_status,
    objective_comment,
    timeline_status,
    timeline_comment,
    budget_status,
    budget_comment,
    scope_status,
    scope_comment,
    risks_status,
    risks_comment,
    created_by,
    submitted_by,
    submitted_at
  )
  values
    (
      project_cip_id,
      current_week_start,
      'submitted',
      60,
      'green',
      'Pilot scope is progressing as expected.',
      'green',
      'The team is on schedule.',
      'green',
      'Budget remains stable.',
      'green',
      'Scope and stakeholders are aligned.',
      'green',
      'No major delivery risk is visible at the moment.',
      pl_2_id,
      pl_2_id,
      timezone('utc', now())
    )
  returning id into report_cip_current_id;

  insert into public.status_report_comments (
    status_report_id,
    author_profile_id,
    body
  )
  values
    (report_data_current_id, pm_id, 'Please finalize the draft once the pilot timing is confirmed.'),
    (report_s4_previous_id, pm_id, 'Keep the open cutover role visible on the dashboard.'),
    (report_cip_current_id, pm_id, 'Good healthy baseline for the pilot view.');

  select id into internal_admin_id
  from public.internal_time_account_types
  where name = 'Internal Admin / Meetings';

  select id into internal_training_id
  from public.internal_time_account_types
  where name = 'Training';

  if internal_admin_id is null or internal_training_id is null then
    raise exception 'Expected internal time account types are missing.';
  end if;

  insert into public.weekly_timesheets (
    profile_id,
    week_start,
    target_hours,
    status,
    submitted_at
  )
  values
    (senior_consultant_1_id, previous_week_start, 40, 'submitted', timezone('utc', now()) - interval '7 days')
  returning id into timesheet_sc1_previous_id;

  insert into public.weekly_timesheets (
    profile_id,
    week_start,
    target_hours,
    status,
    submitted_at
  )
  values
    (senior_consultant_1_id, current_week_start, 40, 'draft', null)
  returning id into timesheet_sc1_current_id;

  insert into public.weekly_timesheets (
    profile_id,
    week_start,
    target_hours,
    status,
    submitted_at
  )
  values
    (senior_consultant_2_id, previous_week_start, 32, 'submitted', timezone('utc', now()) - interval '7 days')
  returning id into timesheet_sc2_previous_id;

  insert into public.weekly_timesheets (
    profile_id,
    week_start,
    target_hours,
    status,
    submitted_at
  )
  values
    (senior_consultant_2_id, current_week_start, 32, 'submitted', timezone('utc', now()))
  returning id into timesheet_sc2_current_id;

  insert into public.weekly_timesheets (
    profile_id,
    week_start,
    target_hours,
    status,
    submitted_at
  )
  values
    (senior_consultant_3_id, current_week_start, 40, 'submitted', timezone('utc', now()))
  returning id into timesheet_sc3_current_id;

  insert into public.weekly_timesheets (
    profile_id,
    week_start,
    target_hours,
    status,
    submitted_at
  )
  values
    (consultant_1_id, current_week_start, 40, 'draft', null)
  returning id into timesheet_c1_current_id;

  insert into public.weekly_timesheets (
    profile_id,
    week_start,
    target_hours,
    status,
    submitted_at
  )
  values
    (consultant_2_id, current_week_start, 40, 'submitted', timezone('utc', now()))
  returning id into timesheet_c2_current_id;

  insert into public.weekly_timesheets (
    profile_id,
    week_start,
    target_hours,
    status,
    submitted_at
  )
  values
    (consultant_3_id, current_week_start, 40, 'submitted', timezone('utc', now()))
  returning id into timesheet_c3_current_id;

  insert into public.weekly_timesheets (
    profile_id,
    week_start,
    target_hours,
    status,
    submitted_at
  )
  values
    (consultant_4_id, current_week_start, 40, 'draft', null)
  returning id into timesheet_c4_current_id;

  insert into public.time_entries (
    weekly_timesheet_id,
    entry_type,
    project_assignment_id,
    internal_time_account_type_id,
    hours,
    description
  )
  values
    (timesheet_sc1_previous_id, 'project', assignment_s4_arch_sc1_id, null, 24, 'Solution design and workshop preparation'),
    (timesheet_sc1_previous_id, 'project', assignment_data_bi_sc1_id, null, 8, 'Reporting alignment and dashboard review'),
    (timesheet_sc1_previous_id, 'internal', null, internal_admin_id, 8, 'Internal coordination and planning'),
    (timesheet_sc1_current_id, 'project', assignment_s4_arch_sc1_id, null, 20, 'Design follow-up and rollout readiness'),
    (timesheet_sc1_current_id, 'project', assignment_data_bi_sc1_id, null, 8, 'Dashboard migration preparation'),
    (timesheet_sc1_current_id, 'internal', null, internal_admin_id, 4, 'Internal meetings'),
    (timesheet_sc2_previous_id, 'project', assignment_data_migration_sc2_id, null, 18, 'Migration analysis and mapping'),
    (timesheet_sc2_previous_id, 'project', assignment_ops_quality_sc2_id, null, 10, 'Operational defect handling'),
    (timesheet_sc2_previous_id, 'internal', null, internal_admin_id, 4, 'Internal delivery sync'),
    (timesheet_sc2_current_id, 'project', assignment_data_migration_sc2_id, null, 16, 'Migration planning and governance'),
    (timesheet_sc2_current_id, 'project', assignment_ops_quality_sc2_id, null, 12, 'Reporting stabilization support'),
    (timesheet_sc2_current_id, 'internal', null, internal_admin_id, 4, 'Internal meetings'),
    (timesheet_sc3_current_id, 'project', assignment_cip_pmo_sc3_id, null, 16, 'Steering cadence and PMO coordination'),
    (timesheet_sc3_current_id, 'internal', null, internal_training_id, 24, 'Internal enablement and training'),
    (timesheet_c1_current_id, 'project', assignment_s4_change_c1_id, null, 12, 'Stakeholder preparation and change materials'),
    (timesheet_c2_current_id, 'project', assignment_cip_business_c2_id, null, 24, 'Business interviews and workshop preparation'),
    (timesheet_c2_current_id, 'internal', null, internal_admin_id, 16, 'Internal documentation and follow-up'),
    (timesheet_c3_current_id, 'project', assignment_cip_reporting_c3_id, null, 16, 'Pilot dashboard build and review'),
    (timesheet_c3_current_id, 'internal', null, internal_admin_id, 24, 'Internal reporting alignment'),
    (timesheet_c4_current_id, 'project', assignment_cip_support_c4_id, null, 6, 'Meeting notes and tracking support');

  insert into public.billing_overrides (
    time_entry_id,
    override_hours,
    reason,
    overridden_by
  )
  select
    te.id,
    16,
    'Client approved capped billing for migration planning.',
    pl_1_id
  from public.time_entries te
  where te.weekly_timesheet_id = timesheet_sc2_previous_id
    and te.project_assignment_id = assignment_data_migration_sc2_id
  limit 1;
end $$;

commit;
