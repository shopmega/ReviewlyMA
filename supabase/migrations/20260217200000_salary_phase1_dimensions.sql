-- Salary phase 1 dimensions for analytics depth
ALTER TABLE public.salaries
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

-- Backfill seniority from years_experience for historical rows
UPDATE public.salaries
SET seniority_level = CASE
  WHEN years_experience IS NULL THEN NULL
  WHEN years_experience <= 2 THEN 'junior'
  WHEN years_experience <= 5 THEN 'confirme'
  WHEN years_experience <= 10 THEN 'senior'
  ELSE 'expert'
END
WHERE seniority_level IS NULL;

-- Normalize sector from businesses.category
CREATE OR REPLACE FUNCTION public.salary_sector_slug(input_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(TRIM(BOTH '-' FROM regexp_replace(lower(COALESCE(input_text, '')), '[^a-z0-9]+', '-', 'g')), '');
$$;

CREATE OR REPLACE FUNCTION public.set_salary_sector_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.sector_slug IS NULL OR NEW.sector_slug = '' THEN
    SELECT public.salary_sector_slug(b.category)
    INTO NEW.sector_slug
    FROM public.businesses b
    WHERE b.id = NEW.business_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_salary_sector_slug ON public.salaries;
CREATE TRIGGER trg_set_salary_sector_slug
BEFORE INSERT OR UPDATE OF business_id, sector_slug
ON public.salaries
FOR EACH ROW
EXECUTE FUNCTION public.set_salary_sector_slug();

UPDATE public.salaries s
SET sector_slug = public.salary_sector_slug(b.category)
FROM public.businesses b
WHERE b.id = s.business_id
  AND (s.sector_slug IS NULL OR s.sector_slug = '');

CREATE INDEX IF NOT EXISTS idx_salaries_sector_slug_status ON public.salaries(sector_slug, status);
CREATE INDEX IF NOT EXISTS idx_salaries_seniority_status ON public.salaries(seniority_level, status);
CREATE INDEX IF NOT EXISTS idx_salaries_work_model_status ON public.salaries(work_model, status);
CREATE INDEX IF NOT EXISTS idx_salaries_monthly_normalized ON public.salaries(salary_monthly_normalized);
