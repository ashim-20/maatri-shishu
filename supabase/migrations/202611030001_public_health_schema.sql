create extension if not exists pgcrypto;

create table if not exists public.staff_users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('admin','supervisor','health_worker')),
  clinic_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.staff_scopes (
  id uuid primary key default gen_random_uuid(), staff_user_id uuid not null references public.staff_users(id) on delete cascade,
  scope_type text not null check (scope_type in ('clinic','district')), scope_value text not null,
  created_at timestamptz not null default now(), unique (staff_user_id, scope_type, scope_value)
);
create table if not exists public.mothers (
  id uuid primary key default gen_random_uuid(), external_ref text unique, full_name text not null, date_of_birth date,
  phone text, address text, ward text, blood_group text, consent_status text not null default 'pending' check (consent_status in ('pending','granted','withdrawn')),
  assigned_staff_id uuid references public.staff_users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.pregnancies (
  id uuid primary key default gen_random_uuid(), mother_id uuid not null references public.mothers(id) on delete cascade, lmp_date date, edd_date date, gravida integer, parity integer, status text not null default 'active' check (status in ('active','completed','lost_to_follow_up')), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.children (
  id uuid primary key default gen_random_uuid(), mother_id uuid references public.mothers(id) on delete set null, full_name text not null, date_of_birth date not null, sex text check (sex in ('female','male','other')), birth_weight_kg numeric(5,2), consent_status text not null default 'pending' check (consent_status in ('pending','granted','withdrawn')), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.birth_events (
  id uuid primary key default gen_random_uuid(), pregnancy_id uuid not null references public.pregnancies(id) on delete cascade, child_id uuid references public.children(id) on delete set null, event_date date not null, facility_name text, delivery_mode text, outcome text, created_at timestamptz not null default now()
);
create table if not exists public.anc_events (
  id uuid primary key default gen_random_uuid(), pregnancy_id uuid not null references public.pregnancies(id) on delete cascade, visit_number integer not null, event_date date not null, gestational_weeks integer, blood_pressure text, weight_kg numeric(5,2), risk_notes text, next_visit_date date, recorded_by uuid references public.staff_users(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists public.pnc_events (
  id uuid primary key default gen_random_uuid(), mother_id uuid not null references public.mothers(id) on delete cascade, child_id uuid references public.children(id) on delete set null, event_date date not null, visit_number integer, findings text, next_visit_date date, recorded_by uuid references public.staff_users(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists public.vaccines (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, target text not null check (target in ('mother','child')), active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.schedule_versions (
  id uuid primary key default gen_random_uuid(), name text not null, version_number integer not null, effective_from date not null, active boolean not null default true, created_at timestamptz not null default now(), unique(name, version_number)
);
create table if not exists public.schedule_dose_rules (
  id uuid primary key default gen_random_uuid(), schedule_version_id uuid not null references public.schedule_versions(id) on delete cascade, vaccine_id uuid not null references public.vaccines(id) on delete cascade, dose_number integer not null, due_week integer not null, min_week integer, max_week integer, unique(schedule_version_id, vaccine_id, dose_number)
);
create table if not exists public.vaccination_events (
  id uuid primary key default gen_random_uuid(), child_id uuid references public.children(id) on delete cascade, mother_id uuid references public.mothers(id) on delete cascade, vaccine_id uuid not null references public.vaccines(id), dose_number integer not null, administered_on date not null, batch_number text, administered_by uuid references public.staff_users(id) on delete set null, source text not null default 'facility' check(source in ('facility','outreach','offline_sync')), created_at timestamptz not null default now(), check ((child_id is not null) <> (mother_id is not null))
);
create table if not exists public.follow_up_tasks (
  id uuid primary key default gen_random_uuid(), mother_id uuid references public.mothers(id) on delete cascade, child_id uuid references public.children(id) on delete cascade, task_type text not null, due_date date not null, status text not null default 'open' check(status in ('open','completed','cancelled')), priority text not null default 'normal' check(priority in ('low','normal','high')), assigned_to uuid references public.staff_users(id) on delete set null, created_at timestamptz not null default now(), check ((mother_id is not null) or (child_id is not null))
);
create table if not exists public.follow_up_attempts (id uuid primary key default gen_random_uuid(), task_id uuid not null references public.follow_up_tasks(id) on delete cascade, attempted_at timestamptz not null default now(), outcome text not null, notes text, attempted_by uuid references public.staff_users(id) on delete set null);
create table if not exists public.appointments (id uuid primary key default gen_random_uuid(), mother_id uuid references public.mothers(id) on delete cascade, child_id uuid references public.children(id) on delete cascade, starts_at timestamptz not null, ends_at timestamptz, appointment_type text not null, status text not null default 'scheduled' check(status in ('scheduled','completed','cancelled')), notes text, created_by uuid references public.staff_users(id) on delete set null, created_at timestamptz not null default now(), check ((mother_id is not null) or (child_id is not null)));
create table if not exists public.service_sessions (id uuid primary key default gen_random_uuid(), clinic_name text not null, session_date date not null, session_type text not null, location text, capacity integer, status text not null default 'planned' check(status in ('planned','open','closed')), created_by uuid references public.staff_users(id) on delete set null, created_at timestamptz not null default now());
create table if not exists public.consent_records (id uuid primary key default gen_random_uuid(), mother_id uuid references public.mothers(id) on delete cascade, child_id uuid references public.children(id) on delete cascade, consent_type text not null, decision text not null check(decision in ('granted','withdrawn','declined')), recorded_by uuid references public.staff_users(id) on delete set null, recorded_at timestamptz not null default now(), notes text, check ((mother_id is not null) or (child_id is not null)));
create table if not exists public.audit_events (id uuid primary key default gen_random_uuid(), actor_id uuid references public.staff_users(id) on delete set null, action text not null, entity_type text not null, entity_id uuid, metadata jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now());
create table if not exists public.sync_operations (id uuid primary key default gen_random_uuid(), operation_key text not null unique, actor_id uuid references public.staff_users(id) on delete set null, entity_type text not null, entity_id uuid, payload jsonb not null, status text not null default 'pending' check(status in ('pending','synchronized','failed','conflict')), attempt_count integer not null default 0, last_error text, created_at timestamptz not null default now(), synchronized_at timestamptz);

create index if not exists mothers_name_idx on public.mothers using gin (to_tsvector('simple', full_name));
create index if not exists mothers_ward_idx on public.mothers(ward);
create index if not exists pregnancies_mother_idx on public.pregnancies(mother_id, status);
create index if not exists children_mother_idx on public.children(mother_id, date_of_birth);
create index if not exists anc_pregnancy_date_idx on public.anc_events(pregnancy_id, event_date desc);
create index if not exists pnc_mother_date_idx on public.pnc_events(mother_id, event_date desc);
create index if not exists vaccination_child_date_idx on public.vaccination_events(child_id, administered_on desc);
create index if not exists follow_up_due_idx on public.follow_up_tasks(status, due_date);
create index if not exists appointments_start_idx on public.appointments(starts_at, status);
create index if not exists audit_entity_idx on public.audit_events(entity_type, entity_id, occurred_at desc);
create index if not exists sync_status_idx on public.sync_operations(status, created_at);

alter table public.staff_users enable row level security;
alter table public.staff_scopes enable row level security;
alter table public.mothers enable row level security;
alter table public.pregnancies enable row level security;
alter table public.children enable row level security;
alter table public.birth_events enable row level security;
alter table public.anc_events enable row level security;
alter table public.pnc_events enable row level security;
alter table public.vaccines enable row level security;
alter table public.schedule_versions enable row level security;
alter table public.schedule_dose_rules enable row level security;
alter table public.vaccination_events enable row level security;
alter table public.follow_up_tasks enable row level security;
alter table public.follow_up_attempts enable row level security;
alter table public.appointments enable row level security;
alter table public.service_sessions enable row level security;
alter table public.consent_records enable row level security;
alter table public.audit_events enable row level security;
alter table public.sync_operations enable row level security;

drop policy if exists staff_self on public.staff_users;
create policy staff_self on public.staff_users for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists staff_scope_self on public.staff_scopes;
create policy staff_scope_self on public.staff_scopes for all using (auth.uid() = staff_user_id) with check (auth.uid() = staff_user_id);

-- Staff-only access is deliberately centralized through staff_users so anon users cannot read protected health data.
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path = '' as $$ select exists (select 1 from public.staff_users where id = auth.uid()); $$;

do $$ declare t text; begin foreach t in array array['mothers','pregnancies','children','birth_events','anc_events','pnc_events','vaccines','schedule_versions','schedule_dose_rules','vaccination_events','follow_up_tasks','follow_up_attempts','appointments','service_sessions','consent_records','audit_events','sync_operations'] loop execute format('drop policy if exists staff_access on public.%I', t); execute format('create policy staff_access on public.%I for all using (public.is_staff()) with check (public.is_staff())', t); end loop; end $$;

insert into public.vaccines (code, name, target) values
('BCG','BCG','child'),('OPV0','OPV birth dose','child'),('PENTA1','Pentavalent 1','child'),('PENTA2','Pentavalent 2','child'),('PENTA3','Pentavalent 3','child'),('MR1','Measles-Rubella 1','child'),('TT1','Tetanus toxoid 1','mother'),('TT2','Tetanus toxoid 2','mother')
on conflict (code) do nothing;
insert into public.schedule_versions (name, version_number, effective_from) values ('Nepal EPI routine', 1, '2026-01-01') on conflict (name, version_number) do nothing;
insert into public.schedule_dose_rules (schedule_version_id, vaccine_id, dose_number, due_week, min_week, max_week)
select s.id, v.id, x.dose_number, x.due_week, x.min_week, x.max_week from public.schedule_versions s cross join public.vaccines v cross join (values ('BCG',1,0,0,4),('OPV0',1,0,0,2),('PENTA1',1,6,6,10),('PENTA2',2,10,10,14),('PENTA3',3,14,14,18),('MR1',1,36,36,52),('TT1',1,12,8,28),('TT2',2,16,12,32)) x(code,dose_number,due_week,min_week,max_week) where s.name='Nepal EPI routine' and v.code=x.code on conflict do nothing;
