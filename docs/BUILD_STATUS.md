# XC Projector Build Status

## Purpose

This file is the short operational handover for future chats.

Use it together with:

- `docs/PRODUCT_DESIGN.md`
- `docs/SUPABASE_SCHEMA_V1.md`
- `docs/SUPABASE_ONBOARDING.md`
- `supabase/migrations/*`

## Current product direction

XC Projector is a consulting operations web app for:

- portfolio / program / project planning
- position-based staffing
- weekly time tracking
- project status reporting
- plan vs actual and commercial reporting

Core product principles already locked:

- hours are the base unit
- planning is position-based, not person-based
- assignments fill positions over time
- weekly submission is employee-wide
- capacity and skill mismatches warn, but do not block
- `portfolio_manager` acts as admin in MVP

## Design direction

The current UI direction is:

- modern enterprise SaaS
- compact and more sophisticated, not oversized
- petrol primary color: `#055373`
- restrained red accent: `#EB4135`
- light gray background: `#F0F3F5`
- white panels / cards
- Microsoft-oriented typography:
  - `Aptos`
  - `Segoe UI`

Important design preference from user:

- visual quality matters a lot
- prefer a refined product UI over generic landing-page aesthetics
- tighter spacing, smaller radii, sharper hierarchy

## Implemented so far

### Docs and architecture

- Product design doc exists
- Supabase schema doc exists
- Supabase onboarding doc exists
- Build status doc exists

### Supabase

Already created in repo:

- initial schema migration
- RLS / access policy migration
- profile bootstrap trigger migration
- self-service profile name update migration
- RLS recursion fix migration for project positions / assignments

Current assumption:

- the user has already run the SQL migrations in Supabase
- `.env.local` is already configured locally
- at least one user exists and is promoted to `portfolio_manager`

### App foundation

Implemented:

- Next.js app router app
- Supabase browser/server helpers
- middleware for auth session refresh
- login page
- protected dashboard
- people directory
- projects workspace
- weekly timesheets workspace
- shared application frame with left rail navigation

### Current routes

- `/`
- `/login`
- `/dashboard`
- `/people`
- `/projects`
- `/projects/[projectId]`
- `/timesheets`

## Current functional status

### Working

- login via Supabase
- protected routes
- self-service update of display name on dashboard
- people directory read from `profiles`
- create portfolios
- create programs
- create customers
- create client units
- create projects with:
  - project shell
  - charter record
  - financial record
- list existing projects
- create project positions
- create staffing assignments
- view project detail with capacity conflict warnings
- create and save weekly timesheets
- capture project and internal time in one week-level flow
- submit a complete week once target hours are fully covered
- create project status reports as draft or submitted
- view status report history on project detail pages
- add historized comments to status reports
- view first financial plan vs actual summaries on project detail pages
- view position-level planned, actual and billable cost rollups

### Not built yet

- financial reporting UI
- PM employee master data management
- edit/deactivate flows for projects, positions, assignments
- more refined status-report editing/selection workflow
- billing override editing UI
- monthly financial aggregations

## Important remembered product notes

### Employee master data

Current MVP has only `full_name` as practical stopgap.

Later we must move to a richer employee master-data model:

- title
- gender
- first name
- last name
- possibly address fields

Important business rule for later:

- these fields should be PM-managed
- on user creation, title, gender, first name, and last name should be captured directly

### Access model

- `portfolio_manager`: full access
- `project_lead`: only assigned programs/projects
- program assignment cascades down to contained projects
- employees can see all employee profiles
- normal staffed users only see their own project-specific data

## Suggested next implementation steps

Recommended build order from here:

1. Status reporting
2. Financial plan vs actual views
3. Skill requirements and skill-match hints on positions
4. Edit / reassign / deactivate flows
5. PM-managed employee master data

If choosing only one immediate next slice, prefer:

- `Status reporting`
- `Skill requirements and skill-match hints`

Reason:

- project steering and first commercial rollups are now present; the next high-value step is better staffing quality through explicit skill requirements and match support

## Technical verification status

Latest verified successfully:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`

## When continuing in a new chat

The next assistant should:

1. read this file first
2. read `docs/PRODUCT_DESIGN.md`
3. read `docs/SUPABASE_SCHEMA_V1.md`
4. inspect current routes under `src/app`
5. continue with `Skill requirements and skill-match hints` unless the user redirects
