# Demo Data Setup

This file describes the recommended way to give Xcellerate Projector a larger and more useful demo data set.

## Target demo scope

The prepared seed is built around:

- 1 existing portfolio manager
  - this should be your real user
- 2 project leads
- 3 senior consultants
- 4 consultants
- 5 demo projects

The goal is to create a demo environment that feels alive across:

- people directory
- staffing views
- timesheets
- project detail pages
- dashboard signals

## Files

- [scripts/create-demo-users.mjs](</C:/Users/stefa/OneDrive - Xcellerate GmbH/GitHub/XC_Projector/scripts/create-demo-users.mjs>)
- [supabase/sql/seed_demo_workspace.sql](</C:/Users/stefa/OneDrive - Xcellerate GmbH/GitHub/XC_Projector/supabase/sql/seed_demo_workspace.sql>)

## Recommended setup flow

### 1. Keep your real PM user

Your own real login should remain the portfolio manager for the demo workspace.

The SQL seed only needs your PM email as one placeholder and does not reset your personal timesheets, skills, access assignments, or capacity history.

### 2. Add service-role access to `.env.local`

The user-creation script needs:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:

- `DEMO_DEFAULT_PASSWORD`

See [`.env.example`](</C:/Users/stefa/OneDrive - Xcellerate GmbH/GitHub/XC_Projector/.env.example>).

### 3. Create the demo users automatically

Run:

```powershell
npm.cmd run demo:users
```

This creates or updates these 9 demo accounts:

- `demo.pl1@xcellerate-projector.local`
- `demo.pl2@xcellerate-projector.local`
- `demo.sc1@xcellerate-projector.local`
- `demo.sc2@xcellerate-projector.local`
- `demo.sc3@xcellerate-projector.local`
- `demo.c1@xcellerate-projector.local`
- `demo.c2@xcellerate-projector.local`
- `demo.c3@xcellerate-projector.local`
- `demo.c4@xcellerate-projector.local`

The script also resets their password to the shared default password from `DEMO_DEFAULT_PASSWORD`, or to `ProjectorDemo123!` if that variable is not set.

### 4. Run the SQL demo seed

Open:

- [supabase/sql/seed_demo_workspace.sql](</C:/Users/stefa/OneDrive - Xcellerate GmbH/GitHub/XC_Projector/supabase/sql/seed_demo_workspace.sql>)

Before running it:

1. Replace the PM email placeholder at the top of the file with your real login email
2. Run the full SQL in the Supabase SQL editor

## What the seed creates

The seed inserts a scoped demo workspace with:

- portfolio: `Demo Portfolio`
- program: `Digital Transformation`
- projects:
  - `DEMO-S4`
  - `DEMO-DATA`
  - `DEMO-OPS`
  - `DEMO-PMO`
  - `DEMO-CIP`

It also creates:

- realistic business units and locations
- richer employee roster with roles and titles
- skills and employee skill profiles
- program and project access assignments
- project charters and financials
- planning positions and weekly planning rows
- staffed and unstaffed positions
- current and previous week timesheets
- submitted and draft weeks
- status reports in different states
- one billing override example

## Expected demo behavior

### Portfolio manager

Your real PM user should see:

- all five demo projects
- mixed dashboard signals
- status reporting gaps
- planning gaps
- staffing gaps
- one overcapacity signal

### Project lead 1

`demo.pl1@xcellerate-projector.local` should see:

- several active projects
- one missing current-week report
- one current draft report
- one project without positions
- one project with an unstaffed active position
- one project with overcapacity warning

### Project lead 2

`demo.pl2@xcellerate-projector.local` should see:

- one healthy active project
- mostly green dashboard signals

### Consultants

The consultant users should show a mix of:

- multiple staffing assignments
- submitted current week
- open current week
- visible differences between 100% and 80% capacity

## Rerun behavior

The seed is intended to be rerunnable.

It will:

- rebuild the `DEMO-*` portfolio/program/project records
- reset demo-user data for:
  - access assignments
  - employee skills
  - employment capacity history
  - current and previous week timesheets

It does not intentionally reset your personal PM-side timesheets or profile details.

## Good next step after this

Once this bigger demo workspace is in place, the next useful expansion would be:

- more historical status reports across 4-8 weeks
- one completed project for lifecycle contrast
- one cancelled or on-hold project
- more financial deltas between plan, actual, and billing override
- one or two additional customers and programs for richer portfolio views
