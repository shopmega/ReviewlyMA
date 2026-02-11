-- Add missing columns for proof verification to business_claims table
-- This adds proof_status and proof_data columns that are needed for the verification flow

-- Add proof_status column (JSONB to store status for each verification method)
alter table business_claims add column if not exists proof_status jsonb default '{}';

-- Add proof_data column (JSONB to store proof metadata like file URLs)
alter table business_claims add column if not exists proof_data jsonb default '{}';

-- Add proof_methods column (text[] to store which methods user selected)
alter table business_claims add column if not exists proof_methods text[] default '{}';

-- Update the RLS policy to allow users to update their own claims for proof verification
drop policy if exists "Admins can update claims" on business_claims;

drop policy if exists "Users can update own claims for verification" on business_claims;
create policy "Users can update own claims for verification" on business_claims for update 
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Also create admin policy for full access
drop policy if exists "Admins can update all claims" on business_claims;
create policy "Admins can update all claims" on business_claims for update 
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));