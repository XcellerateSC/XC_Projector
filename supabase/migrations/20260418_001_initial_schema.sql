create extension if not exists pgcrypto;

create type public.app_system_role as enum (
  'employee',
  'project_lead',
  'portfolio_manager'
);

create type public.project_lifecycle_status as enum (
  'draft',
  'planned',
  'active',
  'on_hold',
  'completed',
  'cancelled'
);

create type public.rate_unit as enum (
  'hourly',
  'daily',
  'weekly'
);

create type public.skill_requirement_level as enum (
  'required',
  'preferred'
);

create type public.time_entry_type as enum (
  'project',
  'internal'
);

create type public.weekly_timesheet_status as enum (
  'draft',
  'submitted'
);

create type public.status_rating as enum (
  'green',
  'yellow',
  'red'
);

create type public.status_report_state as enum (
  'draft',
  'submitted'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.business_units (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.professional_grades (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  full_name text not null,
  system_role public.app_system_role not null default 'employee',
  professional_grade_id uuid references public.professional_grades (id),
  business_unit_id uuid references public.business_units (id),
  location_id uuid references public.locations (id),
  job_title text,
  bio text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.employment_capacity_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  capacity_percent numeric(5,2) not null check (capacity_percent > 0 and capacity_percent <= 100),
  valid_from date not null,
  valid_to date,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (valid_to is null or valid_to >= valid_from)
);

create table public.skill_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 100,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  skill_category_id uuid not null references public.skill_categories (id),
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (skill_category_id, name)
);

create table public.employee_skills (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  proficiency_score integer check (proficiency_score between 1 and 5),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, skill_id)
);

create table public.certifications (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  issuing_organization text,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.employee_certifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  certification_id uuid not null references public.certifications (id) on delete cascade,
  awarded_on date,
  expires_on date,
  credential_reference text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, certification_id)
);

create table public.portfolios (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios (id) on delete cascade,
  name text not null,
  code text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (portfolio_id, name),
  unique (portfolio_id, code)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  legal_name text,
  billing_notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.client_units (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (customer_id, name)
);

create table public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  client_unit_id uuid references public.client_units (id) on delete set null,
  full_name text not null,
  role_title text,
  email text,
  phone text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios (id) on delete restrict,
  program_id uuid references public.programs (id) on delete set null,
  customer_id uuid not null references public.customers (id) on delete restrict,
  client_unit_id uuid references public.client_units (id) on delete set null,
  name text not null,
  code text unique,
  description text,
  lifecycle_status public.project_lifecycle_status not null default 'draft',
  business_unit_id uuid references public.business_units (id),
  location_id uuid references public.locations (id),
  internal_project_lead_id uuid references public.profiles (id) on delete set null,
  sponsor_contact_id uuid references public.client_contacts (id) on delete set null,
  client_project_lead_contact_id uuid references public.client_contacts (id) on delete set null,
  start_date date not null,
  end_date date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (end_date is null or end_date >= start_date)
);

create table public.project_charters (
  project_id uuid primary key references public.projects (id) on delete cascade,
  objective text not null,
  scope_summary text,
  milestones_summary text,
  phases_summary text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.project_financials (
  project_id uuid primary key references public.projects (id) on delete cascade,
  declared_budget numeric(14,2) check (declared_budget is null or declared_budget >= 0),
  currency_code char(3) not null default 'CHF',
  budget_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.access_assignments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  portfolio_id uuid references public.portfolios (id) on delete cascade,
  program_id uuid references public.programs (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  can_edit boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (case when portfolio_id is null then 0 else 1 end) +
    (case when program_id is null then 0 else 1 end) +
    (case when project_id is null then 0 else 1 end) = 1
  )
);

create unique index access_assignments_profile_portfolio_uniq
  on public.access_assignments (profile_id, portfolio_id)
  where portfolio_id is not null;

create unique index access_assignments_profile_program_uniq
  on public.access_assignments (profile_id, program_id)
  where program_id is not null;

create unique index access_assignments_profile_project_uniq
  on public.access_assignments (profile_id, project_id)
  where project_id is not null;

create table public.project_positions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  professional_grade_id uuid not null references public.professional_grades (id),
  description text,
  start_date date not null,
  end_date date,
  rate_unit public.rate_unit not null default 'hourly',
  rate_amount numeric(12,2) not null check (rate_amount >= 0),
  currency_code char(3) not null default 'CHF',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (end_date is null or end_date >= start_date)
);

create table public.project_position_skill_requirements (
  id uuid primary key default gen_random_uuid(),
  project_position_id uuid not null references public.project_positions (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  requirement_level public.skill_requirement_level not null default 'preferred',
  weight integer not null default 50 check (weight between 0 and 100),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_position_id, skill_id)
);

create table public.project_position_weeks (
  id uuid primary key default gen_random_uuid(),
  project_position_id uuid not null references public.project_positions (id) on delete cascade,
  week_start date not null,
  planned_hours numeric(8,2) not null check (planned_hours >= 0),
  planned_allocation_percent numeric(5,2) check (
    planned_allocation_percent is null or
    (planned_allocation_percent >= 0 and planned_allocation_percent <= 100)
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_position_id, week_start),
  check (extract(isodow from week_start) = 1)
);

create table public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  project_position_id uuid not null references public.project_positions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  assigned_from date not null,
  assigned_to date,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (assigned_to is null or assigned_to >= assigned_from)
);

create table public.project_assignment_weeks (
  id uuid primary key default gen_random_uuid(),
  project_assignment_id uuid not null references public.project_assignments (id) on delete cascade,
  week_start date not null,
  assigned_hours numeric(8,2) not null check (assigned_hours >= 0),
  assigned_allocation_percent numeric(5,2) check (
    assigned_allocation_percent is null or
    (assigned_allocation_percent >= 0 and assigned_allocation_percent <= 100)
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_assignment_id, week_start),
  check (extract(isodow from week_start) = 1)
);

create table public.internal_time_account_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  requires_description boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.weekly_timesheets (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  target_hours numeric(8,2) not null check (target_hours >= 0),
  status public.weekly_timesheet_status not null default 'draft',
  submitted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, week_start),
  check (extract(isodow from week_start) = 1),
  check ((status = 'draft' and submitted_at is null) or (status = 'submitted' and submitted_at is not null))
);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  weekly_timesheet_id uuid not null references public.weekly_timesheets (id) on delete cascade,
  entry_type public.time_entry_type not null,
  project_assignment_id uuid references public.project_assignments (id) on delete cascade,
  internal_time_account_type_id uuid references public.internal_time_account_types (id) on delete restrict,
  hours numeric(8,2) not null check (hours >= 0),
  description text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (
      entry_type = 'project' and
      project_assignment_id is not null and
      internal_time_account_type_id is null
    ) or (
      entry_type = 'internal' and
      project_assignment_id is null and
      internal_time_account_type_id is not null
    )
  )
);

create unique index time_entries_project_per_week_uniq
  on public.time_entries (weekly_timesheet_id, project_assignment_id)
  where project_assignment_id is not null;

create unique index time_entries_internal_per_week_uniq
  on public.time_entries (weekly_timesheet_id, internal_time_account_type_id)
  where internal_time_account_type_id is not null;

create table public.billing_overrides (
  id uuid primary key default gen_random_uuid(),
  time_entry_id uuid not null unique references public.time_entries (id) on delete cascade,
  override_hours numeric(8,2) not null check (override_hours >= 0),
  reason text,
  overridden_by uuid not null references public.profiles (id) on delete restrict,
  overridden_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.status_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  week_start date not null,
  state public.status_report_state not null default 'draft',
  overall_progress_percent integer not null check (
    overall_progress_percent between 0 and 100 and
    mod(overall_progress_percent, 10) = 0
  ),
  objective_status public.status_rating not null,
  objective_comment text,
  timeline_status public.status_rating not null,
  timeline_comment text,
  budget_status public.status_rating not null,
  budget_comment text,
  scope_status public.status_rating not null,
  scope_comment text,
  risks_status public.status_rating not null,
  risks_comment text,
  created_by uuid references public.profiles (id) on delete set null,
  submitted_by uuid references public.profiles (id) on delete set null,
  submitted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, week_start),
  check (extract(isodow from week_start) = 1),
  check ((state = 'draft' and submitted_at is null) or (state = 'submitted' and submitted_at is not null))
);

create table public.status_report_comments (
  id uuid primary key default gen_random_uuid(),
  status_report_id uuid not null references public.status_reports (id) on delete cascade,
  author_profile_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create trigger business_units_set_updated_at
before update on public.business_units
for each row execute function public.set_updated_at();

create trigger locations_set_updated_at
before update on public.locations
for each row execute function public.set_updated_at();

create trigger professional_grades_set_updated_at
before update on public.professional_grades
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger employment_capacity_history_set_updated_at
before update on public.employment_capacity_history
for each row execute function public.set_updated_at();

create trigger skill_categories_set_updated_at
before update on public.skill_categories
for each row execute function public.set_updated_at();

create trigger skills_set_updated_at
before update on public.skills
for each row execute function public.set_updated_at();

create trigger employee_skills_set_updated_at
before update on public.employee_skills
for each row execute function public.set_updated_at();

create trigger certifications_set_updated_at
before update on public.certifications
for each row execute function public.set_updated_at();

create trigger employee_certifications_set_updated_at
before update on public.employee_certifications
for each row execute function public.set_updated_at();

create trigger portfolios_set_updated_at
before update on public.portfolios
for each row execute function public.set_updated_at();

create trigger programs_set_updated_at
before update on public.programs
for each row execute function public.set_updated_at();

create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create trigger client_units_set_updated_at
before update on public.client_units
for each row execute function public.set_updated_at();

create trigger client_contacts_set_updated_at
before update on public.client_contacts
for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger project_charters_set_updated_at
before update on public.project_charters
for each row execute function public.set_updated_at();

create trigger project_financials_set_updated_at
before update on public.project_financials
for each row execute function public.set_updated_at();

create trigger access_assignments_set_updated_at
before update on public.access_assignments
for each row execute function public.set_updated_at();

create trigger project_positions_set_updated_at
before update on public.project_positions
for each row execute function public.set_updated_at();

create trigger project_position_skill_requirements_set_updated_at
before update on public.project_position_skill_requirements
for each row execute function public.set_updated_at();

create trigger project_position_weeks_set_updated_at
before update on public.project_position_weeks
for each row execute function public.set_updated_at();

create trigger project_assignments_set_updated_at
before update on public.project_assignments
for each row execute function public.set_updated_at();

create trigger project_assignment_weeks_set_updated_at
before update on public.project_assignment_weeks
for each row execute function public.set_updated_at();

create trigger internal_time_account_types_set_updated_at
before update on public.internal_time_account_types
for each row execute function public.set_updated_at();

create trigger weekly_timesheets_set_updated_at
before update on public.weekly_timesheets
for each row execute function public.set_updated_at();

create trigger time_entries_set_updated_at
before update on public.time_entries
for each row execute function public.set_updated_at();

create trigger billing_overrides_set_updated_at
before update on public.billing_overrides
for each row execute function public.set_updated_at();

create trigger status_reports_set_updated_at
before update on public.status_reports
for each row execute function public.set_updated_at();

insert into public.professional_grades (name, sort_order)
values
  ('Consultant', 10),
  ('Senior Consultant', 20),
  ('Project Leader', 30),
  ('Manager', 40),
  ('Partner', 50)
on conflict (name) do nothing;

insert into public.skill_categories (name, sort_order)
values
  ('Languages', 10),
  ('Industry Experience', 20),
  ('Functional Experience', 30),
  ('IT Applications', 40),
  ('Certifications', 50)
on conflict (name) do nothing;

insert into public.internal_time_account_types (name, description, requires_description, sort_order)
values
  ('Paid Absence', 'Holiday, sickness, or other paid absence types.', true, 10),
  ('Vacation / Overtime Compensation', 'Vacation claim usage or overtime reduction.', true, 20),
  ('Training', 'Formal or informal training time.', true, 30),
  ('Internal Admin / Meetings', 'Internal coordination, administration, and non-client meetings.', true, 40),
  ('Business Development', 'Acquisition and sales support activities.', true, 50)
on conflict (name) do nothing;
