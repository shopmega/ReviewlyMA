-- One-off remote repair for salary module bootstrap issues.
-- Run in Supabase SQL Editor on the target project, once.

BEGIN;

ALTER TABLE public.salaries
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'full_time',
ADD COLUMN IF NOT EXISTS pay_period TEXT DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MAD',
ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS years_experience INTEGER,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'self_reported',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS moderation_notes TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS seniority_level TEXT,
ADD COLUMN IF NOT EXISTS sector_slug TEXT,
ADD COLUMN IF NOT EXISTS work_model TEXT,
ADD COLUMN IF NOT EXISTS bonus_flags JSONB DEFAULT '{"prime": false, "treizieme_mois": false, "commission": false, "bonus_annuel": false}'::jsonb;

ALTER TABLE public.salaries
ADD COLUMN IF NOT EXISTS salary_monthly_normalized NUMERIC
GENERATED ALWAYS AS (
  CASE
    WHEN pay_period = 'yearly' THEN ROUND((salary / 12.0)::numeric, 2)
    ELSE salary
  END
) STORED;

ALTER TABLE public.salaries
DROP CONSTRAINT IF EXISTS salaries_employment_type_check,
ADD CONSTRAINT salaries_employment_type_check
CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern'));

ALTER TABLE public.salaries
DROP CONSTRAINT IF EXISTS salaries_pay_period_check,
ADD CONSTRAINT salaries_pay_period_check
CHECK (pay_period IN ('monthly', 'yearly'));

ALTER TABLE public.salaries
DROP CONSTRAINT IF EXISTS salaries_status_check,
ADD CONSTRAINT salaries_status_check
CHECK (status IN ('pending', 'published', 'rejected'));

ALTER TABLE public.salaries
DROP CONSTRAINT IF EXISTS salaries_source_check,
ADD CONSTRAINT salaries_source_check
CHECK (source IN ('self_reported', 'legacy', 'imported'));

ALTER TABLE public.salaries
DROP CONSTRAINT IF EXISTS salaries_years_experience_check,
ADD CONSTRAINT salaries_years_experience_check
CHECK (years_experience IS NULL OR (years_experience >= 0 AND years_experience <= 60));

ALTER TABLE public.salaries
DROP CONSTRAINT IF EXISTS salaries_seniority_level_check,
ADD CONSTRAINT salaries_seniority_level_check
CHECK (
  seniority_level IS NULL
  OR seniority_level IN ('junior', 'confirme', 'senior', 'expert', 'manager')
);

ALTER TABLE public.salaries
DROP CONSTRAINT IF EXISTS salaries_work_model_check,
ADD CONSTRAINT salaries_work_model_check
CHECK (
  work_model IS NULL
  OR work_model IN ('presentiel', 'hybride', 'teletravail')
);

UPDATE public.salaries
SET bonus_flags = '{"prime": false, "treizieme_mois": false, "commission": false, "bonus_annuel": false}'::jsonb
WHERE bonus_flags IS NULL;

ALTER TABLE public.salaries
ALTER COLUMN bonus_flags SET DEFAULT '{"prime": false, "treizieme_mois": false, "commission": false, "bonus_annuel": false}'::jsonb,
ALTER COLUMN bonus_flags SET NOT NULL;

ALTER TABLE public.salaries
DROP CONSTRAINT IF EXISTS salaries_bonus_flags_shape_check,
ADD CONSTRAINT salaries_bonus_flags_shape_check
CHECK (
  jsonb_typeof(bonus_flags) = 'object'
  AND (bonus_flags ? 'prime')
  AND (bonus_flags ? 'treizieme_mois')
  AND (bonus_flags ? 'commission')
  AND (bonus_flags ? 'bonus_annuel')
  AND jsonb_typeof(bonus_flags -> 'prime') = 'boolean'
  AND jsonb_typeof(bonus_flags -> 'treizieme_mois') = 'boolean'
  AND jsonb_typeof(bonus_flags -> 'commission') = 'boolean'
  AND jsonb_typeof(bonus_flags -> 'bonus_annuel') = 'boolean'
);

ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS salary_roles TEXT[] DEFAULT ARRAY[
  'Ingenieur logiciel',
  'Ingenieur logiciel senior',
  'Lead technique',
  'Manager ingenierie',
  'Chef de produit',
  'Analyste data',
  'Data scientist',
  'Designer UX',
  'Designer UI',
  'Ingenieur QA',
  'Ingenieur DevOps',
  'Specialiste RH',
  'Specialiste marketing',
  'Representant commercial',
  'Support client'
],
ADD COLUMN IF NOT EXISTS salary_departments TEXT[] DEFAULT ARRAY[
  'Ingenierie',
  'Produit',
  'Design',
  'Data',
  'Operations',
  'Ressources humaines',
  'Marketing',
  'Commercial',
  'Finance',
  'Juridique',
  'Support client'
],
ADD COLUMN IF NOT EXISTS salary_intervals JSONB DEFAULT '[
  {"id":"lt_3000","label":"Moins de 3 000 MAD","min":500,"max":2999},
  {"id":"3000_4999","label":"3 000 - 4 999 MAD","min":3000,"max":4999},
  {"id":"5000_7999","label":"5 000 - 7 999 MAD","min":5000,"max":7999},
  {"id":"8000_11999","label":"8 000 - 11 999 MAD","min":8000,"max":11999},
  {"id":"12000_19999","label":"12 000 - 19 999 MAD","min":12000,"max":19999},
  {"id":"20000_29999","label":"20 000 - 29 999 MAD","min":20000,"max":29999},
  {"id":"30000_plus","label":"30 000+ MAD","min":30000,"max":10000000}
]'::jsonb;

UPDATE public.site_settings
SET
  salary_roles = COALESCE(
    salary_roles,
    ARRAY[
      'Ingenieur logiciel',
      'Ingenieur logiciel senior',
      'Lead technique',
      'Manager ingenierie',
      'Chef de produit',
      'Analyste data',
      'Data scientist',
      'Designer UX',
      'Designer UI',
      'Ingenieur QA',
      'Ingenieur DevOps',
      'Specialiste RH',
      'Specialiste marketing',
      'Representant commercial',
      'Support client'
    ]
  ),
  salary_departments = COALESCE(
    salary_departments,
    ARRAY[
      'Ingenierie',
      'Produit',
      'Design',
      'Data',
      'Operations',
      'Ressources humaines',
      'Marketing',
      'Commercial',
      'Finance',
      'Juridique',
      'Support client'
    ]
  ),
  salary_intervals = COALESCE(
    salary_intervals,
    '[
      {"id":"lt_3000","label":"Moins de 3 000 MAD","min":500,"max":2999},
      {"id":"3000_4999","label":"3 000 - 4 999 MAD","min":3000,"max":4999},
      {"id":"5000_7999","label":"5 000 - 7 999 MAD","min":5000,"max":7999},
      {"id":"8000_11999","label":"8 000 - 11 999 MAD","min":8000,"max":11999},
      {"id":"12000_19999","label":"12 000 - 19 999 MAD","min":12000,"max":19999},
      {"id":"20000_29999","label":"20 000 - 29 999 MAD","min":20000,"max":29999},
      {"id":"30000_plus","label":"30 000+ MAD","min":30000,"max":10000000}
    ]'::jsonb
  )
WHERE id = 'main';

ALTER TABLE public.salaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public salaries are viewable by everyone" ON public.salaries;
DROP POLICY IF EXISTS "Service role can manage salaries" ON public.salaries;
DROP POLICY IF EXISTS "Users can view own salaries" ON public.salaries;
DROP POLICY IF EXISTS "Admins can view all salaries" ON public.salaries;
DROP POLICY IF EXISTS "Public can read published salaries" ON public.salaries;
DROP POLICY IF EXISTS "Authenticated users can submit salaries" ON public.salaries;
DROP POLICY IF EXISTS "Admins can manage salaries" ON public.salaries;

CREATE POLICY "Public can read published salaries"
ON public.salaries
FOR SELECT
USING (status = 'published');

CREATE POLICY "Authenticated users can submit salaries"
ON public.salaries
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND source = 'self_reported'
);

CREATE POLICY "Admins can manage salaries"
ON public.salaries
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

CREATE POLICY "Service role can manage salaries"
ON public.salaries
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMIT;

-- Refresh PostgREST schema cache so new columns are visible to the app immediately.
NOTIFY pgrst, 'reload schema';
