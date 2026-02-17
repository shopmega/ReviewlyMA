-- Salary module phase 1: submission + moderation + public published insights
CREATE TABLE IF NOT EXISTS public.salaries (
  id BIGSERIAL PRIMARY KEY,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  job_title TEXT NOT NULL,
  salary NUMERIC NOT NULL,
  location TEXT,
  date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

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
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

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

-- Preserve visibility of old seeded rows
UPDATE public.salaries
SET status = 'published', source = 'legacy';

CREATE INDEX IF NOT EXISTS idx_salaries_business_status ON public.salaries(business_id, status);
CREATE INDEX IF NOT EXISTS idx_salaries_business_job_title ON public.salaries(business_id, job_title);
CREATE INDEX IF NOT EXISTS idx_salaries_created_at_desc ON public.salaries(created_at DESC);

ALTER TABLE public.salaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public salaries are viewable by everyone" ON public.salaries;
DROP POLICY IF EXISTS "Service role can manage salaries" ON public.salaries;
DROP POLICY IF EXISTS "Users can view own salaries" ON public.salaries;
DROP POLICY IF EXISTS "Admins can view all salaries" ON public.salaries;

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
