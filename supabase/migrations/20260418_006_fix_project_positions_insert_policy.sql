create or replace function public.can_manage_project_by_id(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_project(target_project_id);
$$;

drop policy if exists "project_positions_insert_manage_scope" on public.project_positions;
create policy "project_positions_insert_manage_scope"
on public.project_positions
for insert
to authenticated
with check (public.can_manage_project_by_id(project_id));

drop policy if exists "project_positions_update_manage_scope" on public.project_positions;
create policy "project_positions_update_manage_scope"
on public.project_positions
for update
to authenticated
using (public.can_manage_project_position(id))
with check (public.can_manage_project_by_id(project_id));

drop policy if exists "project_positions_delete_manage_scope" on public.project_positions;
create policy "project_positions_delete_manage_scope"
on public.project_positions
for delete
to authenticated
using (public.can_manage_project_position(id));
