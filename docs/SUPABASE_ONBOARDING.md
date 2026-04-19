# Supabase Onboarding

## Current status

The app is already wired to Supabase through `.env.local`.

The following has been prepared in the repository:

- schema migration
- RLS/access policies
- profile bootstrap trigger for new auth users
- Next.js login flow
- protected dashboard and people directory

## What to do next

### 1. Make sure your user exists in Supabase Auth

Use `Authentication -> Users` in Supabase and confirm the account you want to use for the app already exists.

If it exists, migration `20260418_003_profile_bootstrap.sql` should already have created a row in `public.profiles`.

### 2. Promote the first admin

Open and run:

- `supabase/sql/promote_user_to_portfolio_manager.sql`

Replace the placeholder email with your real login email before executing it.

### 3. Start the app locally

```powershell
npm.cmd run dev
```

Then open:

- `http://localhost:3000/login`

### 4. Log in and verify

After sign-in, verify:

- `/dashboard` loads
- `/people` loads
- your user shows as `portfolio_manager`

### 5. Optional: load demo data

If you want a more realistic walkthrough environment with staffed projects,
timesheets and reporting signals, use:

- [docs/DEMO_DATA.md](</C:/Users/stefa/OneDrive - Xcellerate GmbH/GitHub/XC_Projector/docs/DEMO_DATA.md>)
- [supabase/sql/seed_demo_workspace.sql](</C:/Users/stefa/OneDrive - Xcellerate GmbH/GitHub/XC_Projector/supabase/sql/seed_demo_workspace.sql>)

The larger demo setup now also includes:

- automatic creation of 9 demo auth users through `npm.cmd run demo:users`
- 1 existing PM user plus 2 project leads, 3 senior consultants, 4 consultants
- 5 demo projects with mixed staffing, timesheet and reporting states

## Expected first test flow

1. Log in as the promoted admin.
2. Open the people directory.
3. Confirm your profile exists.
4. Continue with the first CRUD slices:
   - business units / locations / grades
   - employee profile enrichment
   - portfolios / programs / projects
