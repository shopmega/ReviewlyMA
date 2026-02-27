-- Merge pinned-content behavior into announcements (updates)
-- by adding pinning metadata directly on public.updates.

ALTER TABLE public.updates
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_updates_business_pinned_date
  ON public.updates (business_id, is_pinned DESC, date DESC, created_at DESC);
