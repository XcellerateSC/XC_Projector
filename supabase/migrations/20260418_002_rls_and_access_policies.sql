create or replace function public.is_authenticated()
returns boolean
language sql
stable
as $$
  select auth.uid() is not null;
$$;

create or replace function public.current_system_role()
returns public.app_system_role
language sql
stable
security definer
set search_path = public
as $$
  select p.system_role
  from public.profiles p
  where p.id = auth.uid();
$$;

create or replace function public.is_portfolio_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_system_role() = 'portfolio_manager', false);
$$;

create or replace function public.is_project_lead_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_system_role() in ('project_lead', 'portfolio_manager'), false);
$$;

create or replace function public.can_manage_program(target_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_portfolio_manager()
    or exists (
      select 1
      from public.access_assignments aa
      where aa.profile_id = auth.uid()
        and aa.program_id = target_program_id
    )
    or exists (
      select 1
      from public.programs pr
      join public.access_assignments aa
        on aa.portfolio_id = pr.portfolio_id
      where pr.id = target_program_id
        and aa.profile_id = auth.uid()
    );
$$;

create or replace function public.can_manage_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_portfolio_manager()
    or exists (
      select 1
      from public.projects p
      where p.id = target_project_id
        and p.internal_project_lead_id = auth.uid()
    )
    or exists (
      select 1
      from public.access_assignments aa
      where aa.profile_id = auth.uid()
        and aa.project_id = target_project_id
    )
    or exists (
      select 1
      from public.projects p
      join public.access_assignments aa
        on aa.program_id = p.program_id
      where p.id = target_project_id
        and aa.profile_id = auth.uid()
    )
    or exists (
      select 1
      from public.projects p
      join public.access_assignments aa
        on aa.portfolio_id = p.portfolio_id
      where p.id = target_project_id
        and aa.profile_id = auth.uid()
    );
$$;

create or replace function public.is_staffed_on_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_assignments pa
    join public.project_positions pp
      on pp.id = pa.project_position_id
    where pa.profile_id = auth.uid()
      and pp.project_id = target_project_id
  );
$$;

create or replace function public.can_view_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_project(target_project_id)
    or public.is_staffed_on_project(target_project_id);
$$;

create or replace function public.can_view_program(target_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.can_manage_program(target_program_id)
    or exists (
      select 1
      from public.projects p
      where p.program_id = target_program_id
        and public.can_manage_project(p.id)
    );
$$;

create or replace function public.can_view_portfolio(target_portfolio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_portfolio_manager()
    or exists (
      select 1
      from public.access_assignments aa
      where aa.profile_id = auth.uid()
        and aa.portfolio_id = target_portfolio_id
    )
    or exists (
      select 1
      from public.programs pr
      where pr.portfolio_id = target_portfolio_id
        and public.can_manage_program(pr.id)
    )
    or exists (
      select 1
      from public.projects p
      where p.portfolio_id = target_portfolio_id
        and public.can_manage_project(p.id)
    );
$$;

create or replace function public.can_read_capacity_for_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_portfolio_manager()
    or public.is_project_lead_role()
    or target_profile_id = auth.uid();
$$;

create or replace function public.get_public_profile_current_projects(target_profile_id uuid)
returns table (
  project_id uuid,
  project_name text,
  position_title text,
  assigned_from date,
  assigned_to date
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id as project_id,
    p.name as project_name,
    pp.title as position_title,
    pa.assigned_from,
    pa.assigned_to
  from public.project_assignments pa
  join public.project_positions pp
    on pp.id = pa.project_position_id
  join public.projects p
    on p.id = pp.project_id
  where auth.uid() is not null
    and pa.profile_id = target_profile_id
    and current_date >= pa.assigned_from
    and (pa.assigned_to is null or current_date <= pa.assigned_to)
  order by p.name, pp.title;
$$;

grant execute on function public.get_public_profile_current_projects(uuid) to authenticated;

alter table public.business_units enable row level security;
alter table public.locations enable row level security;
alter table public.professional_grades enable row level security;
alter table public.profiles enable row level security;
alter table public.employment_capacity_history enable row level security;
alter table public.skill_categories enable row level security;
alter table public.skills enable row level security;
alter table public.employee_skills enable row level security;
alter table public.certifications enable row level security;
alter table public.employee_certifications enable row level security;
alter table public.portfolios enable row level security;
alter table public.programs enable row level security;
alter table public.customers enable row level security;
alter table public.client_units enable row level security;
alter table public.client_contacts enable row level security;
alter table public.projects enable row level security;
alter table public.project_charters enable row level security;
alter table public.project_financials enable row level security;
alter table public.access_assignments enable row level security;
alter table public.project_positions enable row level security;
alter table public.project_position_skill_requirements enable row level security;
alter table public.project_position_weeks enable row level security;
alter table public.project_assignments enable row level security;
alter table public.project_assignment_weeks enable row level security;
alter table public.internal_time_account_types enable row level security;
alter table public.weekly_timesheets enable row level security;
alter table public.time_entries enable row level security;
alter table public.billing_overrides enable row level security;
alter table public.status_reports enable row level security;
alter table public.status_report_comments enable row level security;

create policy "business_units_select_authenticated"
on public.business_units
for select
to authenticated
using (public.is_authenticated());

create policy "business_units_manage_pm"
on public.business_units
for all
to authenticated
using (public.is_portfolio_manager())
with check (public.is_portfolio_manager());

create policy "locations_select_authenticated"
on public.locations
for select
to authenticated
using (public.is_authenticated());

create policy "locations_manage_pm"
on public.locations
for all
to authenticated
using (public.is_portfolio_manager())
with check (public.is_portfolio_manager());

create policy "professional_grades_select_authenticated"
on public.professional_grades
for select
to authenticated
using (public.is_authenticated());

create policy "professional_grades_manage_pm"
on public.professional_grades
for all
to authenticated
using (public.is_portfolio_manager())
with check (public.is_portfolio_manager());

create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (public.is_authenticated());

create policy "profiles_manage_pm"
on public.profiles
for all
to authenticated
using (public.is_portfolio_manager())
with check (public.is_portfolio_manager());

create policy "employment_capacity_select_allowed"
on public.employment_capacity_history
for select
to authenticated
using (public.can_read_capacity_for_profile(profile_id));

create policy "employment_capacity_manage_pm"
on public.employment_capacity_history
for all
to authenticated
using (public.is_portfolio_manager())
with check (public.is_portfolio_manager());

create policy "skill_categories_select_authenticated"
on public.skill_categories
for select
to authenticated
using (public.is_authenticated());

create policy "skill_categories_manage_pm"
on public.skill_categories
for all
to authenticated
using (public.is_portfolio_manager())
with check (public.is_portfolio_manager());

create policy "skills_select_authenticated"
on public.skills
for select
to authenticated
using (public.is_authenticated());

create policy "skills_manage_pm"
on public.skills
for all
to authenticated
using (public.is_portfolio_manager())
with check (public.is_portfolio_manager());

create policy "employee_skills_select_authenticated"
on public.employee_skills
for select
to authenticated
using (public.is_authenticated());

create policy "employee_skills_insert_self_or_pm"
on public.employee_skills
for insert
to authenticated
with check (
  public.is_portfolio_manager()
  or profile_id = auth.uid()
);

create policy "employee_skills_update_self_or_pm"
on public.employee_skills
for update
to authenticated
using (
  public.is_portfolio_manager()
  or profile_id = auth.uid()
)
with check (
  public.is_portfolio_manager()
  or profile_id = auth.uid()
);

create policy "employee_skills_delete_self_or_pm"
on public.employee_skills
for delete
to authenticated
using (
  public.is_portfolio_manager()
  or profile_id = auth.uid()
);

create policy "certifications_select_authenticated"
on public.certifications
for select
to authenticated
using (public.is_authenticated());

create policy "certifications_manage_pm"
on public.certifications
for all
to authenticated
using (public.is_portfolio_manager())
with check (public.is_portfolio_manager());

create policy "employee_certifications_select_authenticated"
on public.employee_certifications
for select
to authenticated
using (public.is_authenticated());

create policy "employee_certifications_insert_self_or_pm"
on public.employee_certifications
for insert
to authenticated
with check (
  public.is_portfolio_manager()
  or profile_id = auth.uid()
);

create policy "employee_certifications_update_self_or_pm"
on public.employee_certifications
for update
to authenticated
using (
  public.is_portfolio_manager()
  or profile_id = auth.uid()
)
with check (
  public.is_portfolio_manager()
  or profile_id = auth.uid()
);

create policy "employee_certifications_delete_self_or_pm"
on public.employee_certifications
for delete
to authenticated
using (
  public.is_portfolio_manager()
  or profile_id = auth.uid()
);

create policy "portfolios_select_visible"
on public.portfolios
for select
to authenticated
using (public.can_view_portfolio(id));

create policy "portfolios_manage_pm"
on public.portfolios
for all
to authenticated
using (public.is_portfolio_manager())
with check (public.is_portfolio_manager());

create policy "programs_select_visible"
on public.programs
for select
to authenticated
using (public.can_view_program(id));

create policy "programs_insert_pm"
on public.programs
for insert
to authenticated
with check (public.is_portfolio_manager());

create policy "programs_update_manage_scope"
on public.programs
for update
to authenticated
using (public.can_manage_program(id))
with check (public.can_manage_program(id));

create policy "programs_delete_pm"
on public.programs
for delete
to authenticated
using (public.is_portfolio_manager());

create policy "customers_select_authenticated"
on public.customers
for select
to authenticated
using (public.is_authenticated());

create policy "customers_manage_pm"
on public.customers
for all
to authenticated
using (public.is_portfolio_manager())
with check (public.is_portfolio_manager());

create policy "client_units_select_authenticated"
on public.client_units
for select
to authenticated
using (public.is_authenticated());

create policy "client_units_manage_pm"
on public.client_units
for all
to authenticated
using (public.is_portfolio_manager())
with check (public.is_portfolio_manager());

create policy "client_contacts_select_authenticated"
on public.client_contacts
for select
to authenticated
using (public.is_authenticated());

create policy "client_contacts_manage_pm"
on public.client_contacts
for all
to authenticated
using (public.is_portfolio_manager())
with check (public.is_portfolio_manager());

create policy "projects_select_visible"
on public.projects
for select
to authenticated
using (public.can_view_project(id));

create policy "projects_insert_pm"
on public.projects
for insert
to authenticated
with check (public.is_portfolio_manager());

create policy "projects_update_manage_scope"
on public.projects
for update
to authenticated
using (public.can_manage_project(id))
with check (public.can_manage_project(id));

create policy "projects_delete_pm"
on public.projects
for delete
to authenticated
using (public.is_portfolio_manager());

create policy "project_charters_select_manage_scope"
on public.project_charters
for select
to authenticated
using (public.can_manage_project(project_id));

create policy "project_charters_insert_manage_scope"
on public.project_charters
for insert
to authenticated
with check (public.can_manage_project(project_id));

create policy "project_charters_update_manage_scope"
on public.project_charters
for update
to authenticated
using (public.can_manage_project(project_id))
with check (public.can_manage_project(project_id));

create policy "project_charters_delete_pm"
on public.project_charters
for delete
to authenticated
using (public.is_portfolio_manager());

create policy "project_financials_select_manage_scope"
on public.project_financials
for select
to authenticated
using (public.can_manage_project(project_id));

create policy "project_financials_insert_manage_scope"
on public.project_financials
for insert
to authenticated
with check (public.can_manage_project(project_id));

create policy "project_financials_update_manage_scope"
on public.project_financials
for update
to authenticated
using (public.can_manage_project(project_id))
with check (public.can_manage_project(project_id));

create policy "project_financials_delete_pm"
on public.project_financials
for delete
to authenticated
using (public.is_portfolio_manager());

create policy "access_assignments_select_own_or_pm"
on public.access_assignments
for select
to authenticated
using (
  public.is_portfolio_manager()
  or profile_id = auth.uid()
);

create policy "access_assignments_manage_pm"
on public.access_assignments
for all
to authenticated
using (public.is_portfolio_manager())
with check (public.is_portfolio_manager());

create policy "project_positions_select_visible"
on public.project_positions
for select
to authenticated
using (
  public.can_manage_project(project_id)
  or exists (
    select 1
    from public.project_assignments pa
    where pa.project_position_id = project_positions.id
      and pa.profile_id = auth.uid()
  )
);

create policy "project_positions_insert_manage_scope"
on public.project_positions
for insert
to authenticated
with check (public.can_manage_project(project_id));

create policy "project_positions_update_manage_scope"
on public.project_positions
for update
to authenticated
using (public.can_manage_project(project_id))
with check (public.can_manage_project(project_id));

create policy "project_positions_delete_manage_scope"
on public.project_positions
for delete
to authenticated
using (public.can_manage_project(project_id));

create policy "project_position_skill_requirements_select_visible"
on public.project_position_skill_requirements
for select
to authenticated
using (
  exists (
    select 1
    from public.project_positions pp
    where pp.id = project_position_skill_requirements.project_position_id
      and (
        public.can_manage_project(pp.project_id)
        or exists (
          select 1
          from public.project_assignments pa
          where pa.project_position_id = pp.id
            and pa.profile_id = auth.uid()
        )
      )
  )
);

create policy "project_position_skill_requirements_insert_manage_scope"
on public.project_position_skill_requirements
for insert
to authenticated
with check (
  exists (
    select 1
    from public.project_positions pp
    where pp.id = project_position_skill_requirements.project_position_id
      and public.can_manage_project(pp.project_id)
  )
);

create policy "project_position_skill_requirements_update_manage_scope"
on public.project_position_skill_requirements
for update
to authenticated
using (
  exists (
    select 1
    from public.project_positions pp
    where pp.id = project_position_skill_requirements.project_position_id
      and public.can_manage_project(pp.project_id)
  )
)
with check (
  exists (
    select 1
    from public.project_positions pp
    where pp.id = project_position_skill_requirements.project_position_id
      and public.can_manage_project(pp.project_id)
  )
);

create policy "project_position_skill_requirements_delete_manage_scope"
on public.project_position_skill_requirements
for delete
to authenticated
using (
  exists (
    select 1
    from public.project_positions pp
    where pp.id = project_position_skill_requirements.project_position_id
      and public.can_manage_project(pp.project_id)
  )
);

create policy "project_position_weeks_select_visible"
on public.project_position_weeks
for select
to authenticated
using (
  exists (
    select 1
    from public.project_positions pp
    where pp.id = project_position_weeks.project_position_id
      and (
        public.can_manage_project(pp.project_id)
        or exists (
          select 1
          from public.project_assignments pa
          where pa.project_position_id = pp.id
            and pa.profile_id = auth.uid()
        )
      )
  )
);

create policy "project_position_weeks_insert_manage_scope"
on public.project_position_weeks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.project_positions pp
    where pp.id = project_position_weeks.project_position_id
      and public.can_manage_project(pp.project_id)
  )
);

create policy "project_position_weeks_update_manage_scope"
on public.project_position_weeks
for update
to authenticated
using (
  exists (
    select 1
    from public.project_positions pp
    where pp.id = project_position_weeks.project_position_id
      and public.can_manage_project(pp.project_id)
  )
)
with check (
  exists (
    select 1
    from public.project_positions pp
    where pp.id = project_position_weeks.project_position_id
      and public.can_manage_project(pp.project_id)
  )
);

create policy "project_position_weeks_delete_manage_scope"
on public.project_position_weeks
for delete
to authenticated
using (
  exists (
    select 1
    from public.project_positions pp
    where pp.id = project_position_weeks.project_position_id
      and public.can_manage_project(pp.project_id)
  )
);

create policy "project_assignments_select_visible"
on public.project_assignments
for select
to authenticated
using (
  profile_id = auth.uid()
  or exists (
    select 1
    from public.project_positions pp
    where pp.id = project_assignments.project_position_id
      and public.can_manage_project(pp.project_id)
  )
);

create policy "project_assignments_insert_manage_scope"
on public.project_assignments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.project_positions pp
    where pp.id = project_assignments.project_position_id
      and public.can_manage_project(pp.project_id)
  )
);

create policy "project_assignments_update_manage_scope"
on public.project_assignments
for update
to authenticated
using (
  exists (
    select 1
    from public.project_positions pp
    where pp.id = project_assignments.project_position_id
      and public.can_manage_project(pp.project_id)
  )
)
with check (
  exists (
    select 1
    from public.project_positions pp
    where pp.id = project_assignments.project_position_id
      and public.can_manage_project(pp.project_id)
  )
);

create policy "project_assignments_delete_manage_scope"
on public.project_assignments
for delete
to authenticated
using (
  exists (
    select 1
    from public.project_positions pp
    where pp.id = project_assignments.project_position_id
      and public.can_manage_project(pp.project_id)
  )
);

create policy "project_assignment_weeks_select_visible"
on public.project_assignment_weeks
for select
to authenticated
using (
  exists (
    select 1
    from public.project_assignments pa
    join public.project_positions pp
      on pp.id = pa.project_position_id
    where pa.id = project_assignment_weeks.project_assignment_id
      and (
        pa.profile_id = auth.uid()
        or public.can_manage_project(pp.project_id)
      )
  )
);

create policy "project_assignment_weeks_insert_manage_scope"
on public.project_assignment_weeks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.project_assignments pa
    join public.project_positions pp
      on pp.id = pa.project_position_id
    where pa.id = project_assignment_weeks.project_assignment_id
      and public.can_manage_project(pp.project_id)
  )
);

create policy "project_assignment_weeks_update_manage_scope"
on public.project_assignment_weeks
for update
to authenticated
using (
  exists (
    select 1
    from public.project_assignments pa
    join public.project_positions pp
      on pp.id = pa.project_position_id
    where pa.id = project_assignment_weeks.project_assignment_id
      and public.can_manage_project(pp.project_id)
  )
)
with check (
  exists (
    select 1
    from public.project_assignments pa
    join public.project_positions pp
      on pp.id = pa.project_position_id
    where pa.id = project_assignment_weeks.project_assignment_id
      and public.can_manage_project(pp.project_id)
  )
);

create policy "project_assignment_weeks_delete_manage_scope"
on public.project_assignment_weeks
for delete
to authenticated
using (
  exists (
    select 1
    from public.project_assignments pa
    join public.project_positions pp
      on pp.id = pa.project_position_id
    where pa.id = project_assignment_weeks.project_assignment_id
      and public.can_manage_project(pp.project_id)
  )
);

create policy "internal_time_account_types_select_authenticated"
on public.internal_time_account_types
for select
to authenticated
using (public.is_authenticated());

create policy "internal_time_account_types_manage_pm"
on public.internal_time_account_types
for all
to authenticated
using (public.is_portfolio_manager())
with check (public.is_portfolio_manager());

create policy "weekly_timesheets_select_owner_pm_or_lead"
on public.weekly_timesheets
for select
to authenticated
using (
  public.is_portfolio_manager()
  or profile_id = auth.uid()
  or exists (
    select 1
    from public.project_assignment_weeks paw
    join public.project_assignments pa
      on pa.id = paw.project_assignment_id
    join public.project_positions pp
      on pp.id = pa.project_position_id
    where pa.profile_id = weekly_timesheets.profile_id
      and paw.week_start = weekly_timesheets.week_start
      and public.can_manage_project(pp.project_id)
  )
);

create policy "weekly_timesheets_insert_owner_or_pm"
on public.weekly_timesheets
for insert
to authenticated
with check (
  public.is_portfolio_manager()
  or profile_id = auth.uid()
);

create policy "weekly_timesheets_update_owner_draft_or_pm"
on public.weekly_timesheets
for update
to authenticated
using (
  public.is_portfolio_manager()
  or (profile_id = auth.uid() and status = 'draft')
)
with check (
  public.is_portfolio_manager()
  or profile_id = auth.uid()
);

create policy "weekly_timesheets_delete_owner_draft_or_pm"
on public.weekly_timesheets
for delete
to authenticated
using (
  public.is_portfolio_manager()
  or (profile_id = auth.uid() and status = 'draft')
);

create policy "time_entries_select_visible"
on public.time_entries
for select
to authenticated
using (
  public.is_portfolio_manager()
  or exists (
    select 1
    from public.weekly_timesheets wt
    where wt.id = time_entries.weekly_timesheet_id
      and wt.profile_id = auth.uid()
  )
  or (
    entry_type = 'project'
    and exists (
      select 1
      from public.project_assignments pa
      join public.project_positions pp
        on pp.id = pa.project_position_id
      where pa.id = time_entries.project_assignment_id
        and public.can_manage_project(pp.project_id)
    )
  )
);

create policy "time_entries_insert_owner_draft_or_pm"
on public.time_entries
for insert
to authenticated
with check (
  public.is_portfolio_manager()
  or exists (
    select 1
    from public.weekly_timesheets wt
    where wt.id = time_entries.weekly_timesheet_id
      and wt.profile_id = auth.uid()
      and wt.status = 'draft'
  )
  and (
    (
      entry_type = 'project'
      and exists (
        select 1
        from public.project_assignments pa
        where pa.id = time_entries.project_assignment_id
          and pa.profile_id = auth.uid()
      )
    )
    or entry_type = 'internal'
  )
);

create policy "time_entries_update_owner_draft_or_pm"
on public.time_entries
for update
to authenticated
using (
  public.is_portfolio_manager()
  or exists (
    select 1
    from public.weekly_timesheets wt
    where wt.id = time_entries.weekly_timesheet_id
      and wt.profile_id = auth.uid()
      and wt.status = 'draft'
  )
)
with check (
  public.is_portfolio_manager()
  or exists (
    select 1
    from public.weekly_timesheets wt
    where wt.id = time_entries.weekly_timesheet_id
      and wt.profile_id = auth.uid()
      and wt.status = 'draft'
  )
);

create policy "time_entries_delete_owner_draft_or_pm"
on public.time_entries
for delete
to authenticated
using (
  public.is_portfolio_manager()
  or exists (
    select 1
    from public.weekly_timesheets wt
    where wt.id = time_entries.weekly_timesheet_id
      and wt.profile_id = auth.uid()
      and wt.status = 'draft'
  )
);

create policy "billing_overrides_select_manage_scope"
on public.billing_overrides
for select
to authenticated
using (
  public.is_portfolio_manager()
  or exists (
    select 1
    from public.time_entries te
    join public.project_assignments pa
      on pa.id = te.project_assignment_id
    join public.project_positions pp
      on pp.id = pa.project_position_id
    where te.id = billing_overrides.time_entry_id
      and te.entry_type = 'project'
      and public.can_manage_project(pp.project_id)
  )
);

create policy "billing_overrides_insert_manage_scope"
on public.billing_overrides
for insert
to authenticated
with check (
  public.is_portfolio_manager()
  or exists (
    select 1
    from public.time_entries te
    join public.project_assignments pa
      on pa.id = te.project_assignment_id
    join public.project_positions pp
      on pp.id = pa.project_position_id
    where te.id = billing_overrides.time_entry_id
      and te.entry_type = 'project'
      and public.can_manage_project(pp.project_id)
  )
);

create policy "billing_overrides_update_manage_scope"
on public.billing_overrides
for update
to authenticated
using (
  public.is_portfolio_manager()
  or exists (
    select 1
    from public.time_entries te
    join public.project_assignments pa
      on pa.id = te.project_assignment_id
    join public.project_positions pp
      on pp.id = pa.project_position_id
    where te.id = billing_overrides.time_entry_id
      and te.entry_type = 'project'
      and public.can_manage_project(pp.project_id)
  )
)
with check (
  public.is_portfolio_manager()
  or exists (
    select 1
    from public.time_entries te
    join public.project_assignments pa
      on pa.id = te.project_assignment_id
    join public.project_positions pp
      on pp.id = pa.project_position_id
    where te.id = billing_overrides.time_entry_id
      and te.entry_type = 'project'
      and public.can_manage_project(pp.project_id)
  )
);

create policy "billing_overrides_delete_manage_scope"
on public.billing_overrides
for delete
to authenticated
using (
  public.is_portfolio_manager()
  or exists (
    select 1
    from public.time_entries te
    join public.project_assignments pa
      on pa.id = te.project_assignment_id
    join public.project_positions pp
      on pp.id = pa.project_position_id
    where te.id = billing_overrides.time_entry_id
      and te.entry_type = 'project'
      and public.can_manage_project(pp.project_id)
  )
);

create policy "status_reports_select_manage_scope"
on public.status_reports
for select
to authenticated
using (public.can_manage_project(project_id));

create policy "status_reports_insert_manage_scope"
on public.status_reports
for insert
to authenticated
with check (public.can_manage_project(project_id));

create policy "status_reports_update_draft_manage_scope"
on public.status_reports
for update
to authenticated
using (
  public.can_manage_project(project_id)
  and state = 'draft'
)
with check (public.can_manage_project(project_id));

create policy "status_reports_delete_pm_draft"
on public.status_reports
for delete
to authenticated
using (
  public.is_portfolio_manager()
  and state = 'draft'
);

create policy "status_report_comments_select_manage_scope"
on public.status_report_comments
for select
to authenticated
using (
  exists (
    select 1
    from public.status_reports sr
    where sr.id = status_report_comments.status_report_id
      and public.can_manage_project(sr.project_id)
  )
);

create policy "status_report_comments_insert_manage_scope"
on public.status_report_comments
for insert
to authenticated
with check (
  author_profile_id = auth.uid()
  and exists (
    select 1
    from public.status_reports sr
    where sr.id = status_report_comments.status_report_id
      and public.can_manage_project(sr.project_id)
  )
);
