alter table public.staff_users drop constraint if exists staff_users_status_check;
alter table public.staff_users add constraint staff_users_status_check check (status in ('active', 'suspended', 'pending', 'rejected'));
