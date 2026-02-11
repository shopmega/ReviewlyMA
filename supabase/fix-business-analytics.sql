-- Migration to create business_analytics table and set up RLS
-- This allows tracking of profile views and lead generation events

CREATE TABLE IF NOT EXISTS public.business_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id VARCHAR NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('page_view', 'phone_click', 'website_click', 'contact_form')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.business_analytics ENABLE ROW LEVEL SECURITY;

-- 1. Anyone (public) can insert analytics events
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.business_analytics;
CREATE POLICY "Anyone can insert analytics events" 
ON public.business_analytics 
FOR INSERT 
TO public
WITH CHECK (true);

-- 2. Only business owners and admins can view analytics for their business
DROP POLICY IF EXISTS "Owners can view their own business analytics" ON public.business_analytics;
CREATE POLICY "Owners can view their own business analytics" 
ON public.business_analytics 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (
      (profiles.business_id = business_analytics.business_id AND profiles.role = 'pro')
      OR 
      profiles.role = 'admin'
    )
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_business_id ON business_analytics(business_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON business_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON business_analytics(event_type);
