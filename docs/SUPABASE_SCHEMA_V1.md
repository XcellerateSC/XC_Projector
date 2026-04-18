# Supabase Schema v1

## Goal

This document turns the product design into a first concrete Supabase/Postgres schema for the MVP.

It is intentionally opinionated and optimized for:

- explicit weekly planning
- position-based staffing
- employee-wide weekly time submission
- clear separation of actual hours vs billing overrides
- context-based access control

## Core modeling decisions

### Identity and access

- Authentication lives in `auth.users`.
- Application-level user data lives in `public.profiles`.
- Global permissions come from `profiles.system_role`.
- Context permissions come from `access_assignments`.

This supports:

- full-access portfolio managers
- program/project-scoped project leads
- employees who only see their own project data but can still browse the people directory

### Planning and staffing

- A `project_position` is the stable planning unit.
- `project_position_weeks` stores explicit weekly demand.
- `project_assignments` connect employees to positions over time.
- `project_assignment_weeks` stores weekly fulfillment.

This gives us clean support for:

- one long-lived position filled by different people over time
- parallel or partial staffing when needed
- weekly capacity and financial rollups without fragile date math

### Time tracking

- `weekly_timesheets` represent the employee-wide weekly submission unit.
- `time_entries` hold project or internal time for that week.
- Project time points to a concrete assignment.
- Internal time points to an internal time account type.

This matches the product rule that a user submits one complete week, not one week per project.

### Financials

- Billable rates live on `project_positions`.
- Project-level budget lives in `project_financials`.
- Employee-reported hours remain immutable as the operational truth.
- `billing_overrides` hold PL-side commercial adjustments for reporting.

This allows us to compare:

- declared project budget
- planned cost
- actual cost from employee entries
- billable cost from overrides

### Status reporting

- One `status_report` per project per week
- locked after submission
- ongoing discussion through `status_report_comments`

## Table groups

### Access and people

- `profiles`
- `access_assignments`
- `professional_grades`
- `business_units`
- `locations`
- `employment_capacity_history`
- `skill_categories`
- `skills`
- `employee_skills`
- `certifications`
- `employee_certifications`

### Customers and delivery structure

- `portfolios`
- `programs`
- `customers`
- `client_units`
- `client_contacts`
- `projects`
- `project_charters`
- `project_financials`

### Planning and staffing

- `project_positions`
- `project_position_skill_requirements`
- `project_position_weeks`
- `project_assignments`
- `project_assignment_weeks`

### Time and billing

- `internal_time_account_types`
- `weekly_timesheets`
- `time_entries`
- `billing_overrides`

### Project reporting

- `status_reports`
- `status_report_comments`

## Important assumptions locked in this schema

- Weeks are stored as explicit `week_start` dates.
- Planning and assignment data are week-based.
- Capacity percent and hours can coexist, but hours are the reporting base unit.
- Programs inherit access down to projects.
- Budget lives in a dedicated project financials table plus derived staffing cost views.

## What comes next

After this schema, the next technical step should be:

1. add Supabase RLS helper functions and policies
2. bootstrap the Next.js app and auth shell
3. build the first CRUD slices against this schema
