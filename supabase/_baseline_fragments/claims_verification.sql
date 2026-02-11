-- Claim verification codes + atomic status update RPC

-- business_claims in docs/ADMIN_TABLES.sql lacks updated_at; add it for atomic updates.
alter table public.business_claims
add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());

create table if not exists public.verification_codes (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.business_claims(id) on delete cascade,
  method text not null,
  code text not null,
  verified boolean not null default false,
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_verification_codes_claim_method
  on public.verification_codes(claim_id, method, verified);

alter table public.verification_codes enable row level security;

do $$ begin
  create policy "Users can insert verification codes for own claim"
    on public.verification_codes for insert
    to authenticated
    with check (
      exists (
        select 1 from public.business_claims c
        where c.id = verification_codes.claim_id
          and c.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can view verification codes for own claim"
    on public.verification_codes for select
    to authenticated
    using (
      exists (
        select 1 from public.business_claims c
        where c.id = verification_codes.claim_id
          and c.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can update verification codes for own claim"
    on public.verification_codes for update
    to authenticated
    using (
      exists (
        select 1 from public.business_claims c
        where c.id = verification_codes.claim_id
          and c.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Service role can manage verification codes"
    on public.verification_codes for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;

create or replace function public.update_claim_proof_status(
  p_claim_id uuid,
  p_method text,
  p_status text
)
returns table(claim_id uuid, proof_status jsonb, success boolean)
language plpgsql
as $$
begin
  update public.business_claims
  set proof_status = jsonb_set(
      coalesce(proof_status, '{}'::jsonb),
      array[p_method],
      to_jsonb(p_status::text)
    ),
    updated_at = timezone('utc'::text, now())
  where id = p_claim_id
  returning public.business_claims.id, public.business_claims.proof_status, true;
end;
$$;

grant execute on function public.update_claim_proof_status(uuid, text, text) to authenticated;
grant execute on function public.update_claim_proof_status(uuid, text, text) to service_role;

