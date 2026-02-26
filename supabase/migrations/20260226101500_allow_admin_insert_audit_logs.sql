-- Allow authenticated admins to append audit events.
-- This keeps audit_logs usable when actions run through auth-bound server clients.

alter table public.audit_logs enable row level security;

do $$ begin
  create policy "Admins can insert audit logs"
    on public.audit_logs
    for insert
    to authenticated
    with check (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
      )
    );
exception when duplicate_object then null; end $$;
