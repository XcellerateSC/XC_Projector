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

The current UI direction is still:

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
- prefer compact list-like record views over large low-density cards on operational setup pages

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
- RLS recursion fixes for project positions / assignments
- project position insert policy fix

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
- create and edit portfolios
- create and edit programs
- create, edit and deactivate/reactivate customers
- create and edit client units
- create projects with:
  - project shell
  - charter record
  - financial record
- edit project shell and lifecycle directly on project detail
- list existing projects
- create project positions
- edit project positions
- activate / deactivate positions
- attach skill requirements to positions
- maintain employee skill profiles
- surface skill-match hints for staffing candidates
- create staffing assignments
- edit staffing assignments
- split and reassign assignments while preserving history
- end assignments cleanly against the historized week model
- view project detail with capacity conflict warnings
- create and save weekly timesheets
- capture project and internal time in one week-level flow
- submit a complete week once target hours are fully covered
- create project status reports as draft or submitted
- view status report history on project detail pages
- add historized comments to status reports
- view first financial plan vs actual summaries on project detail pages
- view position-level planned, actual and billable cost rollups
- create, update and remove billing overrides on project time entries
- manage global user roles in-app via `profiles.system_role`
- manage scoped program / project / portfolio access in-app via `access_assignments`
- manage PM-side user activation state and core profile admin fields in-app

### Not built yet

- dedicated financial reporting UI beyond project-level views
- richer PM employee master data beyond the current MVP stopgap
- capacity administration UI
- monthly financial aggregations
- polished dashboard surfaces for responsibility and access views
- broader UI refinement pass across the product

## Important remembered product notes

### Employee master data

Current MVP still has only `full_name` as the practical stopgap for identity display.

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

Important current implementation note:

- global role management now exists in the app on `/people`
- scoped access assignment management now also exists in the app on `/people`

## Suggested next implementation steps

Recommended build order from here:

1. UI refinement / design pass across the app
2. Financial reporting UI beyond project-level rollups
3. PM-managed employee master data
4. Capacity administration UI
5. Monthly financial aggregations

If choosing only one immediate next slice, prefer:

- `UI refinement / design pass`

Reason:

- the product now covers the core MVP workflows more broadly, so the next highest-value step is improving clarity, polish, hierarchy and overall UX quality before adding the next heavy feature layer

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
5. continue with a UI refinement pass unless the user redirects
