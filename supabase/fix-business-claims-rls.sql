-- Fix RLS policy to allow users to update their own claims for proof verification
-- This allows users to update proof_status and proof_data while keeping other fields protected

-- First, drop the existing overly restrictive policy
drop policy if exists "Admins can update claims" on business_claims;

-- Create new policy allowing users to update their own claims for proof verification
create policy "Users can update own claims for verification" on business_claims for update 
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (proof_status is distinct from old.proof_status or proof_data is distinct from old.proof_data)
    and old.status = status
    and old.admin_notes = admin_notes
    and old.reviewed_at = reviewed_at
  );

-- Also create admin policy for full access
drop policy if exists "Admins can update all claims" on business_claims;
create policy "Admins can update all claims" on business_claims for update 
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));