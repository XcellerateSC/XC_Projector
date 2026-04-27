alter table public.profiles
add column if not exists avatar_path text;

create or replace function public.update_my_profile_avatar_path(new_avatar_path text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
  trimmed_avatar_path text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  trimmed_avatar_path := nullif(btrim(new_avatar_path), '');

  update public.profiles
  set avatar_path = trimmed_avatar_path
  where id = auth.uid()
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return updated_profile;
end;
$$;

grant execute on function public.update_my_profile_avatar_path(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile_avatars_insert_own" on storage.objects;
drop policy if exists "profile_avatars_update_own" on storage.objects;
drop policy if exists "profile_avatars_delete_own" on storage.objects;
drop policy if exists "profile_avatars_select_authenticated" on storage.objects;

create policy "profile_avatars_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
);

create policy "profile_avatars_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-avatars'
)
with check (
  bucket_id = 'profile-avatars'
);

create policy "profile_avatars_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-avatars'
);

create policy "profile_avatars_select_authenticated"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-avatars'
);
