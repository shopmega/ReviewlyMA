-- Add claimer type metadata to business claims
ALTER TABLE public.business_claims
ADD COLUMN IF NOT EXISTS claimer_type TEXT DEFAULT 'owner',
ADD COLUMN IF NOT EXISTS claimer_title TEXT;

ALTER TABLE public.business_claims
DROP CONSTRAINT IF EXISTS business_claims_claimer_type_check,
ADD CONSTRAINT business_claims_claimer_type_check
CHECK (
  claimer_type IN (
    'owner',
    'co_owner',
    'legal_representative',
    'manager',
    'marketing_manager',
    'agency_representative',
    'employee_delegate',
    'other'
  )
);
