# Maatri-Shishu MVP audit checklist

Audited against `Maatri-Shishu_Compact_MVP_PRD.md` on 2026-11-04.

## Implemented

- [x] Next.js mobile-first shell with Home, Mothers, Children, Vaccinations, ANC/PNC, Follow-up, Clinic sessions, Offline & sync, Reports & audit, and Settings navigation.
- [x] Supabase email/password login, signup, password reset, callback route, session refresh proxy, staff approval status, and signup-to-`staff_users` trigger.
- [x] PostgreSQL entities, UUID foreign keys, schedule reference tables, RLS baseline, audit and sync operation tables, vaccine seed schedule, and `.env.example`.
- [x] Authorized Mothers GET/POST API with input validation and audit logging.
- [x] Authorized Children GET/POST API with input validation and audit logging.
- [x] Idempotent sync queue API using `operation_key` uniqueness and IndexedDB operation-store initialization.
- [x] PWA manifest/service worker, offline status surface, print-summary action, consent/audit surfaces, and language selector.
- [x] Synthetic-only sample data; no public patient self-registration.

## Partially implemented

- [ ] Catchment enforcement is not complete: the current migration has staff status/RLS gates, but ward/facility scope policies need to be finalized against the pilot authority's approved catchment model.
- [ ] Registration UI currently opens a record-choice modal; it needs full mother, pregnancy, child, consent, and source/confidence forms wired to the APIs.
- [ ] Vaccination, ANC, PNC, follow-up, clinic-session, consent, audit, and print surfaces are present but most rows are still sample data. Add authenticated CRUD routes and wire the forms before field use.
- [ ] Offline queue persistence is initialized and the sync API is idempotent, but a background retry worker, pull reconciliation, and durable conflict-resolution UI still need to be connected.
- [ ] English/Nepali/Bhojpuri selector exists, but strings are not fully externalized and translations require review by local speakers and health professionals.
- [ ] Schedule seed data is a demonstration configuration only. It must not be activated for clinical use until the Nepal health-program authority supplies written approval and boundary-date tests pass.

## Release blockers

- [ ] Create at least one approved pilot ward/municipality and health-post owner.
- [ ] Test active/inactive staff, FCHV/health-post/admin permissions, guessed IDs, and catchment boundaries against the live RLS policies.
- [ ] Test registration/edit/search/retrieval with a confirmed synthetic staff account.
- [ ] Test verified and reported-unverified clinical events, correction history, sync restart/retry/duplicate/conflict behavior, and 360px mobile layout.
- [ ] Review critical Nepali and Bhojpuri terms with local health professionals.
- [ ] Document and test encrypted PostgreSQL backup, restore, device logout/revocation, retention, consent withdrawal, and incident response.
- [ ] Obtain written clinical schedule approval and institutional/privacy authorization before any real-data deployment.

## Explicitly out of scope

SMS reminders, public caregiver accounts, AI/diagnosis, growth interpretation, inventory, HMIS/DHIS2 integration, national analytics, bulk imports, automated maternal Td catch-up recommendations, and nationwide deployment.
