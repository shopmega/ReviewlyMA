alter table public.job_referral_requests
  add column if not exists linkedin_url text;
