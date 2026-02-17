-- Add missing moderation columns for business_claims used by claim-admin action
ALTER TABLE public.business_claims
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
