begin;

alter table public.support_tickets
  add column if not exists assigned_admin_id uuid references public.profiles(id) on delete set null,
  add column if not exists internal_notes text,
  add column if not exists escalation_level text not null default 'none' check (escalation_level in ('none', 'watch', 'urgent', 'critical')),
  add column if not exists sla_due_at timestamptz,
  add column if not exists resolved_at timestamptz;

create index if not exists idx_support_tickets_assigned_admin on public.support_tickets(assigned_admin_id);
create index if not exists idx_support_tickets_sla_due_at on public.support_tickets(sla_due_at) where sla_due_at is not null;
create index if not exists idx_support_tickets_escalation_level on public.support_tickets(escalation_level);

update public.support_tickets
set escalation_level = coalesce(escalation_level, 'none')
where escalation_level is null;

commit;
