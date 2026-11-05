alter table public.staff_users add column if not exists status text not null default 'active' check (status in ('active', 'suspended', 'pending'));
create index if not exists staff_users_status_idx on public.staff_users(status);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.staff_users (id, display_name, role, status)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    case when coalesce(new.raw_user_meta_data ->> 'role', '') in ('admin', 'supervisor', 'health_worker') then new.raw_user_meta_data ->> 'role' else 'health_worker' end,
    'pending')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff_users where id = auth.uid() and status = 'active');
$$;
