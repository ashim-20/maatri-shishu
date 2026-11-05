-- MVP auth-only access: every confirmed Supabase Auth user gets an active staff profile.
-- This is intentionally a shared synthetic/demo workspace model, not production PHI authorization.
update public.staff_users set role = 'health_worker' where role not in ('fchv', 'health_worker');

alter table public.staff_users drop constraint if exists staff_users_role_check;
alter table public.staff_users add constraint staff_users_role_check check (role in ('fchv', 'health_worker'));

alter table public.staff_users alter column status set default 'active';
update public.staff_users set status = 'active' where status is distinct from 'active';

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.staff_users (id, display_name, role, status)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    case when coalesce(new.raw_user_meta_data ->> 'role', '') = 'fchv' then 'fchv' else 'health_worker' end,
    'active'
  )
  on conflict (id) do update set display_name = excluded.display_name, role = excluded.role, status = 'active', updated_at = now();
  return new;
end;
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (select 1 from public.staff_users where id = auth.uid());
$$;

-- Keep RLS enabled and permit only authenticated users with a linked staff profile.
-- Records are intentionally shared across staff for the synthetic MVP workspace.
