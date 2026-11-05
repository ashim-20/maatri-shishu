# Maatri-Shishu MVP

Offline-ready maternal and child health workflow for FCHVs. The app uses Next.js 16, Supabase Auth/Postgres/RLS, IndexedDB for pending offline operations, and a PWA shell.

## Supabase setup

1. Ensure the connected Supabase project exposes `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
2. Apply `supabase/migrations/202611030001_public_health_schema.sql` using the Supabase MCP migration flow.
3. Create a staff user through Supabase Auth sign-up, then add a matching `public.staff_users` row with role `health_worker`, `supervisor`, or `admin`. Do not insert directly into `auth.users`.
4. Add only synthetic test records. Never seed real patient data.

## Run and deploy

Copy `.env.example` to `.env.local` for local development, then run `pnpm install && pnpm dev`. Vercel deployment uses the same Supabase variables in Preview and Production. The `/auth/callback` route exchanges email confirmation codes, and `proxy.ts` refreshes sessions.

## Seed instructions

The migration seeds vaccine definitions, the Nepal EPI routine schedule version, and dose rules. Add test mothers, children, and events only after creating a confirmed staff account. Use the app/API so audit events are written with the authenticated actor.

## RLS and authorization

All clinical and operational tables have RLS enabled. A signed-in user must have a `staff_users` row to access data. Keep role and catchment-scope checks in server routes when adding supervisor/admin workflows; never expose the service-role key to the browser.

## MVP boundaries

The dashboard includes registration/search views, care tracking, consent/audit surfaces, offline queue UI and IndexedDB initialization, calendar/print flows, and language selection. Full background retry reconciliation, conflict resolution persistence, clinician verification workflows, and complete human-reviewed Nepali/Bhojpuri copy require the next implementation pass; the current UI marks these states without inventing clinical rules.
