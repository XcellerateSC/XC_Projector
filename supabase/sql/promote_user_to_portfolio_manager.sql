-- Replace the email value below with the user who should become the first admin.
-- Run this in the Supabase SQL Editor after the schema migrations.

update public.profiles
set system_role = 'portfolio_manager'
where email = 'replace-me@example.com';

select
  id,
  email,
  full_name,
  system_role
from public.profiles
where email = 'replace-me@example.com';
