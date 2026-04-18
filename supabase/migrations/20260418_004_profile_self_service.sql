create or replace function public.update_my_profile_full_name(new_full_name text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
  trimmed_full_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  trimmed_full_name := nullif(btrim(new_full_name), '');

  if trimmed_full_name is null then
    raise exception 'Full name is required';
  end if;

  update public.profiles
  set full_name = trimmed_full_name
  where id = auth.uid()
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return updated_profile;
end;
$$;

grant execute on function public.update_my_profile_full_name(text) to authenticated;
