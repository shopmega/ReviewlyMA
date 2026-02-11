-- Admin audit log (bulk operations)

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.admin_audit_log enable row level security;

do $$ begin
  create policy "Admins can manage admin audit log"
    on public.admin_audit_log for all
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Service role can manage admin audit log"
    on public.admin_audit_log for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;

