begin;

-- Business claiming v2 foundation: additive schema for state machine, risk scoring, and auditability.

alter table public.business_claims
  add column if not exists claim_state text,
  add column if not exists risk_score int not null default 0,
  add column if not exists risk_level text not null default 'low',
  add column if not exists verification_due_at timestamptz,
  add column if not exists last_verified_at timestamptz,
  add column if not exists next_reverification_at timestamptz,
  add column if not exists suspension_reason_code text,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references public.profiles(id) on delete set null,
  add column if not exists revoke_reason text;

update public.business_claims
set claim_state = case status
  when 'approved' then 'verified'
  when 'rejected' then 'verification_failed'
  else 'verification_pending'
end
where claim_state is null;

alter table public.business_claims
  alter column claim_state set default 'verification_pending';

do $$
begin
  alter table public.business_claims
    drop constraint if exists business_claims_claim_state_check;
  alter table public.business_claims
    add constraint business_claims_claim_state_check
    check (claim_state in (
      'unclaimed',
      'claim_requested',
      'verification_pending',
      'verification_failed',
      'verified',
      'suspended',
      'revoked'
    ));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.business_claims
    drop constraint if exists business_claims_risk_level_check;
  alter table public.business_claims
    add constraint business_claims_risk_level_check
    check (risk_level in ('low', 'medium', 'high', 'critical'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.business_claims
    drop constraint if exists business_claims_risk_score_check;
  alter table public.business_claims
    add constraint business_claims_risk_score_check
    check (risk_score between 0 and 100);
exception
  when duplicate_object then null;
end $$;

create index if not exists idx_business_claims_claim_state on public.business_claims (claim_state);
create index if not exists idx_business_claims_business_claim_state on public.business_claims (business_id, claim_state);
create index if not exists idx_business_claims_risk_level_created_at on public.business_claims (risk_level, created_at desc);
create index if not exists idx_business_claims_pending_or_suspended
  on public.business_claims (created_at desc)
  where claim_state in ('verification_pending', 'suspended');

create table if not exists public.business_claim_events (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.business_claims(id) on delete cascade,
  from_state text,
  to_state text not null,
  reason_code text,
  note text,
  actor_user_id uuid,
  actor_role text not null default 'system',
  event_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_business_claim_events_claim_created_at
  on public.business_claim_events (claim_id, created_at desc);

create index if not exists idx_business_claim_events_to_state_created_at
  on public.business_claim_events (to_state, created_at desc);

alter table public.business_claim_events enable row level security;

do $$ begin
  create policy "Claim owners can view own claim events"
    on public.business_claim_events for select to authenticated
    using (
      exists (
        select 1 from public.business_claims c
        where c.id = business_claim_events.claim_id
          and c.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admins can manage claim events"
    on public.business_claim_events for all
    using (public.is_admin_user(auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Service role can manage claim events"
    on public.business_claim_events for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;

create table if not exists public.claim_verification_evidence (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.business_claims(id) on delete cascade,
  method text not null,
  status text not null default 'pending',
  confidence_score int,
  evidence_ref text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

do $$
begin
  alter table public.claim_verification_evidence
    drop constraint if exists claim_verification_evidence_status_check;
  alter table public.claim_verification_evidence
    add constraint claim_verification_evidence_status_check
    check (status in ('pending', 'verified', 'failed', 'expired'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.claim_verification_evidence
    drop constraint if exists claim_verification_evidence_confidence_score_check;
  alter table public.claim_verification_evidence
    add constraint claim_verification_evidence_confidence_score_check
    check (confidence_score is null or confidence_score between 0 and 100);
exception
  when duplicate_object then null;
end $$;

create index if not exists idx_claim_verification_evidence_claim_created_at
  on public.claim_verification_evidence (claim_id, created_at desc);

create index if not exists idx_claim_verification_evidence_status
  on public.claim_verification_evidence (status);

alter table public.claim_verification_evidence enable row level security;

do $$ begin
  create policy "Claim owners can view own verification evidence"
    on public.claim_verification_evidence for select to authenticated
    using (
      exists (
        select 1 from public.business_claims c
        where c.id = claim_verification_evidence.claim_id
          and c.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admins can manage claim verification evidence"
    on public.claim_verification_evidence for all
    using (public.is_admin_user(auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Service role can manage claim verification evidence"
    on public.claim_verification_evidence for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;

-- Transitional role expansion for business team memberships.
alter table public.user_businesses
  add column if not exists assignment_status text not null default 'active',
  add column if not exists verified_at timestamptz,
  add column if not exists verification_expires_at timestamptz,
  add column if not exists granted_by uuid references public.profiles(id) on delete set null;

do $$
begin
  alter table public.user_businesses
    drop constraint if exists user_businesses_role_check;
  alter table public.user_businesses
    add constraint user_businesses_role_check
    check (role in (
      'owner',
      'manager',
      'employee',
      'hr_manager',
      'communications_officer',
      'analyst'
    ));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.user_businesses
    drop constraint if exists user_businesses_assignment_status_check;
  alter table public.user_businesses
    add constraint user_businesses_assignment_status_check
    check (assignment_status in ('active', 'suspended', 'revoked'));
exception
  when duplicate_object then null;
end $$;

create index if not exists idx_user_businesses_business_role_status
  on public.user_businesses (business_id, role, assignment_status);

alter table public.businesses
  add column if not exists verification_badge_level text not null default 'none',
  add column if not exists verification_last_checked_at timestamptz,
  add column if not exists verification_public_note text;

do $$
begin
  alter table public.businesses
    drop constraint if exists businesses_verification_badge_level_check;
  alter table public.businesses
    add constraint businesses_verification_badge_level_check
    check (verification_badge_level in ('none', 'verified_identity', 'verified_active_responder'));
exception
  when duplicate_object then null;
end $$;

create or replace function public.compute_claim_risk_score(
  p_claim_id uuid
)
returns table(score int, level text, factors jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim record;
  v_score int := 0;
  v_failed_count int := 0;
  v_email_domain text := '';
  v_factors jsonb := '{}'::jsonb;
begin
  select id, user_id, business_id, email, claimer_type, proof_methods
  into v_claim
  from public.business_claims
  where id = p_claim_id;

  if not found then
    raise exception 'Claim not found: %', p_claim_id;
  end if;

  if coalesce(v_claim.email, '') = '' then
    v_score := v_score + 30;
    v_factors := v_factors || jsonb_build_object('missing_email', true);
  else
    v_email_domain := split_part(lower(v_claim.email), '@', 2);
    if v_email_domain in (
      'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'yahoo.fr', 'icloud.com', 'proton.me'
    ) then
      v_score := v_score + 20;
      v_factors := v_factors || jsonb_build_object('free_email_domain', v_email_domain);
    end if;
  end if;

  if coalesce(v_claim.claimer_type, '') in ('agency_representative', 'employee_delegate', 'other') then
    v_score := v_score + 20;
    v_factors := v_factors || jsonb_build_object('high_risk_claimer_type', v_claim.claimer_type);
  end if;

  if not (coalesce(v_claim.proof_methods, '{}'::text[]) @> array['document']::text[]) then
    v_score := v_score + 10;
    v_factors := v_factors || jsonb_build_object('document_missing', true);
  end if;

  select count(*)
  into v_failed_count
  from public.business_claims c
  where c.user_id = v_claim.user_id
    and c.business_id = v_claim.business_id
    and c.id <> v_claim.id
    and (
      c.status = 'rejected'
      or c.claim_state in ('verification_failed', 'revoked')
    );

  if v_failed_count > 0 then
    v_score := v_score + least(v_failed_count * 10, 30);
    v_factors := v_factors || jsonb_build_object('prior_failed_claims', v_failed_count);
  end if;

  v_score := greatest(0, least(v_score, 100));

  if v_score >= 75 then
    level := 'critical';
  elsif v_score >= 50 then
    level := 'high';
  elsif v_score >= 25 then
    level := 'medium';
  else
    level := 'low';
  end if;

  update public.business_claims
  set risk_score = v_score,
      risk_level = level,
      updated_at = timezone('utc'::text, now())
  where id = p_claim_id;

  score := v_score;
  factors := v_factors;
  return next;
end;
$$;

revoke all on function public.compute_claim_risk_score(uuid) from public;
grant execute on function public.compute_claim_risk_score(uuid) to authenticated, service_role;

create or replace function public.transition_claim_state(
  p_claim_id uuid,
  p_to_state text,
  p_reason_code text default null,
  p_note text default null
)
returns public.business_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.business_claims%rowtype;
  v_actor uuid := auth.uid();
  v_is_admin boolean := public.is_admin_user(v_actor);
  v_legacy_status text;
  v_allowed boolean := false;
begin
  select * into v_claim
  from public.business_claims
  where id = p_claim_id
  for update;

  if not found then
    raise exception 'Claim not found: %', p_claim_id;
  end if;

  if p_to_state not in (
    'unclaimed', 'claim_requested', 'verification_pending',
    'verification_failed', 'verified', 'suspended', 'revoked'
  ) then
    raise exception 'Invalid target state: %', p_to_state;
  end if;

  if v_is_admin or auth.role() = 'service_role' then
    v_allowed := (
      (v_claim.claim_state = 'unclaimed' and p_to_state = 'claim_requested') or
      (v_claim.claim_state = 'claim_requested' and p_to_state in ('verification_pending', 'verification_failed')) or
      (v_claim.claim_state = 'verification_pending' and p_to_state in ('verified', 'verification_failed', 'suspended')) or
      (v_claim.claim_state = 'verification_failed' and p_to_state in ('claim_requested', 'verification_pending')) or
      (v_claim.claim_state = 'verified' and p_to_state in ('suspended', 'revoked')) or
      (v_claim.claim_state = 'suspended' and p_to_state in ('verified', 'revoked')) or
      (v_claim.claim_state = 'revoked' and p_to_state = 'claim_requested')
    );
  else
    if v_actor is null or v_actor <> v_claim.user_id then
      raise exception 'Not authorized';
    end if;
    v_allowed := (
      (v_claim.claim_state = 'unclaimed' and p_to_state = 'claim_requested') or
      (v_claim.claim_state in ('claim_requested', 'verification_failed') and p_to_state = 'verification_pending')
    );
  end if;

  if not v_allowed then
    raise exception 'Transition not allowed: % -> %', v_claim.claim_state, p_to_state;
  end if;

  v_legacy_status := case
    when p_to_state = 'verified' then 'approved'
    when p_to_state in ('verification_failed', 'revoked') then 'rejected'
    else 'pending'
  end;

  update public.business_claims
  set claim_state = p_to_state,
      status = v_legacy_status,
      reviewed_at = case when v_is_admin then timezone('utc'::text, now()) else reviewed_at end,
      reviewed_by = case when v_is_admin then v_actor else reviewed_by end,
      rejection_reason = case when p_to_state in ('verification_failed', 'revoked') then coalesce(p_note, rejection_reason) else rejection_reason end,
      revoked_at = case when p_to_state = 'revoked' then timezone('utc'::text, now()) else revoked_at end,
      revoked_by = case when p_to_state = 'revoked' and v_is_admin then v_actor else revoked_by end,
      revoke_reason = case when p_to_state = 'revoked' then coalesce(p_note, revoke_reason) else revoke_reason end,
      last_verified_at = case when p_to_state = 'verified' then timezone('utc'::text, now()) else last_verified_at end,
      updated_at = timezone('utc'::text, now())
  where id = p_claim_id;

  insert into public.business_claim_events (
    claim_id,
    from_state,
    to_state,
    reason_code,
    note,
    actor_user_id,
    actor_role
  )
  values (
    p_claim_id,
    v_claim.claim_state,
    p_to_state,
    p_reason_code,
    p_note,
    v_actor,
    case
      when auth.role() = 'service_role' then 'system'
      when v_is_admin then 'admin'
      else 'claimant'
    end
  );

  select * into v_claim from public.business_claims where id = p_claim_id;
  return v_claim;
end;
$$;

revoke all on function public.transition_claim_state(uuid, text, text, text) from public;
grant execute on function public.transition_claim_state(uuid, text, text, text) to authenticated, service_role;

create or replace function public.can_manage_business_action(
  p_business_id text,
  p_action text,
  p_uid uuid default auth.uid()
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment record;
begin
  if p_uid is null then
    return false;
  end if;

  if public.is_admin_user(p_uid) then
    return true;
  end if;

  select role, assignment_status, verification_expires_at
  into v_assignment
  from public.user_businesses
  where user_id = p_uid
    and business_id = p_business_id
  order by is_primary desc, created_at desc
  limit 1;

  if not found or v_assignment.assignment_status <> 'active' then
    return false;
  end if;

  if v_assignment.verification_expires_at is not null and v_assignment.verification_expires_at < now() then
    return false;
  end if;

  if p_action in ('company.profile.edit', 'company.response.publish', 'company.media.upload') then
    return v_assignment.role in ('owner', 'manager', 'hr_manager', 'communications_officer');
  end if;

  if p_action in ('company.analytics.view') then
    return v_assignment.role in ('owner', 'manager', 'hr_manager', 'communications_officer', 'analyst');
  end if;

  if p_action in ('company.team.manage', 'company.billing.manage') then
    return v_assignment.role = 'owner';
  end if;

  return false;
end;
$$;

revoke all on function public.can_manage_business_action(text, text, uuid) from public;
grant execute on function public.can_manage_business_action(text, text, uuid) to authenticated, service_role;

commit;
