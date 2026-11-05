# MaatriShishu staff provisioning

This application uses Supabase Auth for identity and `public.staff_users` for authorization. The browser never receives the Supabase service-role key.

## 1. Supabase preparation

Apply these migrations to the connected Supabase project through the Supabase MCP migration flow, in order:

1. `supabase/migrations/202611030001_public_health_schema.sql`
2. `supabase/migrations/202611040001_staff_approval.sql`

The second migration adds the approval state and the `on_auth_user_created` trigger. New Auth users receive a `public.staff_users` row with `status = 'pending'`.

### Staff columns and values

- `staff_users.id`: UUID referencing `auth.users(id)`.
- `display_name`: required display name.
- `role`: `admin`, `supervisor`, or `health_worker`.
- `status`: `pending`, `active`, or `suspended`.
- `clinic_name`: optional clinic label.

Only `status = 'active'` passes `public.is_staff()` and can use protected clinical APIs. Only an active `admin` can use the staff approval API.

## 2. Required environment variables

For the browser/application runtime, configure these project variables in Vercel Preview/Development as appropriate:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` for the v0 preview auth callback when required

For the provisioning script only, use server/operator environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STAFF_EMAIL`
- `STAFF_PASSWORD`
- `STAFF_NAME` optional
- `STAFF_ROLE` optional: `admin`, `supervisor`, or `health_worker`
- `STAFF_STATUS` optional: `active`, `pending`, or `suspended`

Never use `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` with a `NEXT_PUBLIC_` prefix, in client code, in a browser request, or in a committed `.env` file.

## 3. Provisioning script

The exact script is:

```text
scripts/provision-staff.mjs
```

It uses the Supabase Auth Admin REST API and the PostgREST service-role connection. It creates a confirmed Auth user when needed, resolves an existing user by email when possible, and upserts the corresponding `staff_users` row. It is safe to rerun for the same email; it does not create a public admin signup route.

Run it only from a trusted server/operator shell:

```bash
SUPABASE_URL='https://YOUR_PROJECT.supabase.co' \
SUPABASE_SERVICE_ROLE_KEY='YOUR_SERVER_ONLY_SERVICE_ROLE_KEY' \
STAFF_EMAIL='admin@your-org.test' \
STAFF_PASSWORD='use-a-long-unique-development-password' \
STAFF_NAME='Synthetic Admin' \
STAFF_ROLE='admin' \
STAFF_STATUS='active' \
node scripts/provision-staff.mjs
```

Do not run this against production with synthetic credentials. Use a separate development/preview Supabase project or clearly marked synthetic accounts.

## 4. Initial Auth account and administrator link

The provisioning script performs both steps atomically from the operator perspective:

1. Creates or resolves the Supabase Auth user.
2. Upserts `public.staff_users.id` to the Auth user UUID with `role = 'admin'` and `status = 'active'`.

If the Auth user is created manually instead, do not insert into `auth.users` directly. Create it using Supabase Auth Admin tooling, then use the script with the same email to link the staff profile.

## 5. Verify provisioning

1. Visit `/login` and sign in with the provisioned email/password.
2. Open the dashboard; it should not redirect back to `/login`.
3. Confirm the browser can load `/api/dashboard`.
4. Confirm the staff row has the same UUID as the Auth user and `role = admin`, `status = active`.
5. Confirm a test mother/child write creates a corresponding `audit_events` row.

A direct dashboard request without a session redirects to `/login`. A signed-in pending or suspended user receives an authorization error and cannot access clinical data.

## 6. Approve subsequent staff

A user signing up through `/sign-up` receives a pending staff row. An active administrator can:

- `GET /api/admin/staff` to list staff.
- `PATCH /api/admin/staff?id=<STAFF_USER_ID>` with `{ "status": "active" }` to approve.
- Use `{ "status": "suspended" }` to revoke access.

Every status transition is written to `audit_events`. The API role check and database RLS policy both require an active admin.

## 7. Troubleshooting

### “Staff approval required”

Check that the signed-in Auth user UUID matches `staff_users.id`, then check `status = 'active'`. A confirmed email alone does not grant clinical access.

### Signup succeeds but no staff row exists

Apply `202611040001_staff_approval.sql` and verify the `on_auth_user_created` trigger exists. Existing Auth users created before the migration must be linked with the provisioning script.

### “Administrator approval required”

The caller is not signed in as an active row with `role = 'admin'`. `supervisor` and `health_worker` cannot approve staff.

### Existing-user provisioning fails

The script resolves duplicates from the first 100 Auth users. If the user is beyond that page, resolve the UUID with a trusted Supabase operator tool, then upsert the matching `staff_users` row server-side. Never expose the service-role key to solve this in the browser.

### Auth callback or email confirmation problems

Confirm `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` and the app's `/auth/callback` route are configured. For synthetic development accounts, the provisioning script sets `email_confirm: true`; normal signup follows the project's email-confirmation policy.
