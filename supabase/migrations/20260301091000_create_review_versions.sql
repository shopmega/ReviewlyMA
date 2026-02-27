begin;

create table if not exists public.review_versions (
  id bigserial primary key,
  review_id bigint not null references public.reviews(id) on delete cascade,
  version_number int not null,
  snapshot jsonb not null,
  change_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (review_id, version_number)
);

create index if not exists idx_review_versions_review_id_created_at
  on public.review_versions (review_id, created_at desc);

alter table public.review_versions enable row level security;

do $$ begin
  create policy "Authors can view own review versions"
    on public.review_versions for select to authenticated
    using (
      exists (
        select 1
        from public.reviews r
        where r.id = review_versions.review_id
          and r.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admins can manage review versions"
    on public.review_versions for all
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Service role can manage review versions"
    on public.review_versions for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;

create or replace function public.capture_review_initial_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.review_versions (review_id, version_number, snapshot, change_reason, created_by)
  values (new.id, coalesce(new.current_version, 1), to_jsonb(new), 'initial_insert', auth.uid());

  return new;
end;
$$;

create or replace function public.capture_review_update_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Version only when user-facing review content/context changes.
  if row(
      old.title,
      old.content,
      old.rating,
      old.sub_ratings,
      old.is_anonymous,
      old.employment_status,
      old.role_slug,
      old.department_slug,
      old.city_slug,
      old.tenure_band,
      old.contract_type,
      old.work_mode,
      old.pros,
      old.cons,
      old.advice_to_management,
      old.would_recommend,
      old.ceo_approval,
      old.experience_start_month,
      old.experience_end_month
    )
    is distinct from
    row(
      new.title,
      new.content,
      new.rating,
      new.sub_ratings,
      new.is_anonymous,
      new.employment_status,
      new.role_slug,
      new.department_slug,
      new.city_slug,
      new.tenure_band,
      new.contract_type,
      new.work_mode,
      new.pros,
      new.cons,
      new.advice_to_management,
      new.would_recommend,
      new.ceo_approval,
      new.experience_start_month,
      new.experience_end_month
    ) then
    insert into public.review_versions (review_id, version_number, snapshot, change_reason, created_by)
    values (
      old.id,
      coalesce(old.current_version, 1),
      to_jsonb(old),
      'content_or_context_update',
      auth.uid()
    );

    new.current_version := coalesce(old.current_version, 1) + 1;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_capture_review_initial_version on public.reviews;
create trigger trg_capture_review_initial_version
after insert on public.reviews
for each row execute function public.capture_review_initial_version();

drop trigger if exists trg_capture_review_update_version on public.reviews;
create trigger trg_capture_review_update_version
before update on public.reviews
for each row execute function public.capture_review_update_version();

commit;

