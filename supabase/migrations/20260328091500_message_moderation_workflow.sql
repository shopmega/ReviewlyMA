begin;

alter table public.messages
  add column if not exists moderation_status text not null default 'visible'
    check (moderation_status in ('visible', 'hidden')),
  add column if not exists moderation_notes text,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references public.profiles(id) on delete set null;

create index if not exists idx_messages_moderation_status on public.messages(moderation_status);
create index if not exists idx_messages_moderated_by on public.messages(moderated_by) where moderated_by is not null;

update public.messages
set moderation_status = coalesce(moderation_status, 'visible')
where moderation_status is null;

commit;
