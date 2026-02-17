-- Seed mock salaries for Swissport business page
INSERT INTO public.salaries (
  business_id,
  job_title,
  salary,
  location,
  pay_period,
  currency,
  employment_type,
  years_experience,
  department,
  is_current,
  source,
  status,
  moderation_notes,
  reviewed_at
)
SELECT
  v.business_id,
  v.job_title,
  v.salary,
  v.location,
  v.pay_period,
  v.currency,
  v.employment_type,
  v.years_experience,
  v.department,
  v.is_current,
  'imported',
  'published',
  'Seed mock data for Swissport public page',
  timezone('utc'::text, now())
FROM (
  VALUES
    ('swissport-6uitd', 'Agent de piste', 4200::numeric, 'Casablanca', 'monthly', 'MAD', 'full_time', 1, 'Operations', true),
    ('swissport-6uitd', 'Agent de piste senior', 6200::numeric, 'Casablanca', 'monthly', 'MAD', 'full_time', 4, 'Operations', true),
    ('swissport-6uitd', 'Superviseur operations', 9800::numeric, 'Casablanca', 'monthly', 'MAD', 'full_time', 7, 'Operations', true),
    ('swissport-6uitd', 'Charge RH', 7600::numeric, 'Casablanca', 'monthly', 'MAD', 'full_time', 5, 'Ressources humaines', true),
    ('swissport-6uitd', 'Coordinateur qualite', 8400::numeric, 'Casablanca', 'monthly', 'MAD', 'full_time', 6, 'Operations', true),
    ('swissport-6uitd', 'Agent service client aeroport', 5100::numeric, 'Casablanca', 'monthly', 'MAD', 'full_time', 2, 'Support client', true),
    ('swissport-6uitd', 'Responsable escale', 14500::numeric, 'Casablanca', 'monthly', 'MAD', 'full_time', 10, 'Operations', true)
) AS v(
  business_id,
  job_title,
  salary,
  location,
  pay_period,
  currency,
  employment_type,
  years_experience,
  department,
  is_current
)
WHERE EXISTS (
  SELECT 1
  FROM public.businesses b
  WHERE b.id = v.business_id
)
AND NOT EXISTS (
  SELECT 1
  FROM public.salaries s
  WHERE s.business_id = v.business_id
    AND s.job_title = v.job_title
    AND s.salary = v.salary
    AND COALESCE(s.department, '') = COALESCE(v.department, '')
    AND s.status = 'published'
);
