-- Migrate legacy pinned_content rows into updates and mark them pinned.
-- This preserves historical data while consolidating product behavior.

INSERT INTO public.updates (
  business_id,
  title,
  content,
  date,
  created_at,
  is_pinned,
  pinned_at
)
SELECT
  pc.business_id,
  pc.title,
  pc.content,
  COALESCE((pc.created_at AT TIME ZONE 'utc')::date, current_date) AS date,
  COALESCE(pc.created_at, timezone('utc'::text, now())) AS created_at,
  true AS is_pinned,
  COALESCE(pc.updated_at, pc.created_at, timezone('utc'::text, now())) AS pinned_at
FROM public.pinned_content pc
WHERE COALESCE(pc.is_active, true) = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.updates u
    WHERE u.business_id = pc.business_id
      AND u.title = pc.title
      AND u.content = pc.content
      AND COALESCE(u.date, current_date) = COALESCE((pc.created_at AT TIME ZONE 'utc')::date, current_date)
  );
