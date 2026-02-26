-- Introduce scoped admin access without breaking existing role='admin' RLS policies.

alter table public.profiles
  add column if not exists admin_access_level text,
  add column if not exists admin_permissions text[] not null default '{}';

do $$ begin
  alter table public.profiles
    add constraint profiles_admin_access_level_check
    check (
      admin_access_level is null
      or admin_access_level in ('super_admin', 'admin_ops', 'moderator', 'analyst', 'support')
    );
exception when duplicate_object then null; end $$;

-- Backfill existing admins to the most permissive scoped level.
update public.profiles
set admin_access_level = 'super_admin'
where role = 'admin'
  and (admin_access_level is null or admin_access_level = '');

create index if not exists idx_profiles_admin_access_level on public.profiles(admin_access_level);
