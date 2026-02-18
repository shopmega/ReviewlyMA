-- Competitor ads: feature toggles + delivery tracking events

ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS enable_competitor_ads BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_competitor_ads_tracking BOOLEAN NOT NULL DEFAULT true;

UPDATE public.site_settings
SET
  enable_competitor_ads = COALESCE(enable_competitor_ads, true),
  enable_competitor_ads_tracking = COALESCE(enable_competitor_ads_tracking, true)
WHERE id = 'main';

CREATE TABLE IF NOT EXISTS public.competitor_ad_events (
  id BIGSERIAL PRIMARY KEY,
  ad_id UUID NOT NULL REFERENCES public.competitor_ads(id) ON DELETE CASCADE,
  advertiser_business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  target_business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click')),
  viewer_session_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_competitor_ad_events_ad_id_created_at
  ON public.competitor_ad_events(ad_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_competitor_ad_events_target_business_created_at
  ON public.competitor_ad_events(target_business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_competitor_ad_events_event_type_created_at
  ON public.competitor_ad_events(event_type, created_at DESC);

ALTER TABLE public.competitor_ad_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'competitor_ad_events'
      AND policyname = 'Public can insert competitor ad events'
  ) THEN
    CREATE POLICY "Public can insert competitor ad events"
      ON public.competitor_ad_events
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'competitor_ad_events'
      AND policyname = 'Business owners can read competitor ad events'
  ) THEN
    CREATE POLICY "Business owners can read competitor ad events"
      ON public.competitor_ad_events
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.competitor_ads ca
          JOIN public.businesses b ON b.id = ca.advertiser_business_id
          WHERE ca.id = competitor_ad_events.ad_id
            AND b.owner_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'competitor_ad_events'
      AND policyname = 'Service role can manage competitor ad events'
  ) THEN
    CREATE POLICY "Service role can manage competitor ad events"
      ON public.competitor_ad_events
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
