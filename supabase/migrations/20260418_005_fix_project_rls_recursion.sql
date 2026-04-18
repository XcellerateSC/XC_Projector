create or replace function public.can_view_project_position(target_position_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_positions pp
    where pp.id = target_position_id
      and (
        public.can_manage_project(pp.project_id)
        or exists (
          select 1
          from public.project_assignments pa
          where pa.project_position_id = pp.id
            and pa.profile_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.can_manage_project_position(target_position_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_positions pp
    where pp.id = target_position_id
      and public.can_manage_project(pp.project_id)
  );
$$;

create or replace function public.can_view_project_assignment(target_assignment_id uuid)
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
    where pa.id = target_assignment_id
      and (
        pa.profile_id = auth.uid()
        or public.can_manage_project(pp.project_id)
      )
  );
$$;

create or replace function public.can_manage_project_assignment(target_assignment_id uuid)
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
    where pa.id = target_assignment_id
      and public.can_manage_project(pp.project_id)
  );
$$;

drop policy if exists "project_positions_select_visible" on public.project_positions;
create policy "project_positions_select_visible"
on public.project_positions
for select
to authenticated
using (public.can_view_project_position(id));

drop policy if exists "project_position_skill_requirements_select_visible" on public.project_position_skill_requirements;
create policy "project_position_skill_requirements_select_visible"
on public.project_position_skill_requirements
for select
to authenticated
using (public.can_view_project_position(project_position_id));

drop policy if exists "project_position_skill_requirements_insert_manage_scope" on public.project_position_skill_requirements;
create policy "project_position_skill_requirements_insert_manage_scope"
on public.project_position_skill_requirements
for insert
to authenticated
with check (public.can_manage_project_position(project_position_id));

drop policy if exists "project_position_skill_requirements_update_manage_scope" on public.project_position_skill_requirements;
create policy "project_position_skill_requirements_update_manage_scope"
on public.project_position_skill_requirements
for update
to authenticated
using (public.can_manage_project_position(project_position_id))
with check (public.can_manage_project_position(project_position_id));

drop policy if exists "project_position_skill_requirements_delete_manage_scope" on public.project_position_skill_requirements;
create policy "project_position_skill_requirements_delete_manage_scope"
on public.project_position_skill_requirements
for delete
to authenticated
using (public.can_manage_project_position(project_position_id));

drop policy if exists "project_position_weeks_select_visible" on public.project_position_weeks;
create policy "project_position_weeks_select_visible"
on public.project_position_weeks
for select
to authenticated
using (public.can_view_project_position(project_position_id));

drop policy if exists "project_position_weeks_insert_manage_scope" on public.project_position_weeks;
create policy "project_position_weeks_insert_manage_scope"
on public.project_position_weeks
for insert
to authenticated
with check (public.can_manage_project_position(project_position_id));

drop policy if exists "project_position_weeks_update_manage_scope" on public.project_position_weeks;
create policy "project_position_weeks_update_manage_scope"
on public.project_position_weeks
for update
to authenticated
using (public.can_manage_project_position(project_position_id))
with check (public.can_manage_project_position(project_position_id));

drop policy if exists "project_position_weeks_delete_manage_scope" on public.project_position_weeks;
create policy "project_position_weeks_delete_manage_scope"
on public.project_position_weeks
for delete
to authenticated
using (public.can_manage_project_position(project_position_id));

drop policy if exists "project_assignments_select_visible" on public.project_assignments;
create policy "project_assignments_select_visible"
on public.project_assignments
for select
to authenticated
using (public.can_view_project_assignment(id));

drop policy if exists "project_assignments_insert_manage_scope" on public.project_assignments;
create policy "project_assignments_insert_manage_scope"
on public.project_assignments
for insert
to authenticated
with check (public.can_manage_project_position(project_position_id));

drop policy if exists "project_assignments_update_manage_scope" on public.project_assignments;
create policy "project_assignments_update_manage_scope"
on public.project_assignments
for update
to authenticated
using (public.can_manage_project_assignment(id))
with check (public.can_manage_project_position(project_position_id));

drop policy if exists "project_assignments_delete_manage_scope" on public.project_assignments;
create policy "project_assignments_delete_manage_scope"
on public.project_assignments
for delete
to authenticated
using (public.can_manage_project_assignment(id));

drop policy if exists "project_assignment_weeks_select_visible" on public.project_assignment_weeks;
create policy "project_assignment_weeks_select_visible"
on public.project_assignment_weeks
for select
to authenticated
using (public.can_view_project_assignment(project_assignment_id));

drop policy if exists "project_assignment_weeks_insert_manage_scope" on public.project_assignment_weeks;
create policy "project_assignment_weeks_insert_manage_scope"
on public.project_assignment_weeks
for insert
to authenticated
with check (public.can_manage_project_assignment(project_assignment_id));

drop policy if exists "project_assignment_weeks_update_manage_scope" on public.project_assignment_weeks;
create policy "project_assignment_weeks_update_manage_scope"
on public.project_assignment_weeks
for update
to authenticated
using (public.can_manage_project_assignment(project_assignment_id))
with check (public.can_manage_project_assignment(project_assignment_id));

drop policy if exists "project_assignment_weeks_delete_manage_scope" on public.project_assignment_weeks;
create policy "project_assignment_weeks_delete_manage_scope"
on public.project_assignment_weeks
for delete
to authenticated
using (public.can_manage_project_assignment(project_assignment_id));
