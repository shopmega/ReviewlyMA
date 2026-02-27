begin;

-- Align review report reasons with a legal-risk oriented taxonomy.
alter table public.review_reports
  drop constraint if exists review_reports_reason_check;

update public.review_reports
set reason = case reason
  when 'spam' then 'spam_or_promotional'
  when 'fake' then 'fake_or_coordinated'
  when 'offensive' then 'harassment_or_hate'
  when 'irrelevant' then 'off_topic'
  when 'other' then 'other'
  else 'other'
end;

alter table public.review_reports
  add constraint review_reports_reason_check
  check (
    reason in (
      'spam_or_promotional',
      'fake_or_coordinated',
      'personal_data_or_doxxing',
      'harassment_or_hate',
      'defamation_unverified_accusation',
      'conflict_of_interest',
      'off_topic',
      'copyright_or_copied_content',
      'other'
    )
  );

alter table public.review_reports
  add column if not exists resolved_by uuid references auth.users(id) on delete set null,
  add column if not exists severity text,
  add column if not exists triage_queue text,
  add column if not exists sla_due_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'review_reports_severity_check'
      and conrelid = 'public.review_reports'::regclass
  ) then
    alter table public.review_reports
      add constraint review_reports_severity_check
      check (severity is null or severity in ('low', 'medium', 'high', 'critical'));
  end if;
end
$$;

create index if not exists idx_review_reports_status_created_at
  on public.review_reports (status, created_at desc);

create index if not exists idx_review_reports_reason_status_created_at
  on public.review_reports (reason, status, created_at desc);

commit;

