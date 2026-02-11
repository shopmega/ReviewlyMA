-- Create business_hours table if it doesn't exist
-- day_of_week: 0=Dimanche, 1=Lundi, ..., 6=Samedi

CREATE TABLE IF NOT EXISTS public.business_hours (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    open_time TIME,
    close_time TIME,
    is_closed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(business_id, day_of_week)
);

-- RLS
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public business hours are viewable by everyone" ON public.business_hours;
CREATE POLICY "Public business hours are viewable by everyone" 
ON public.business_hours
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Owners can manage their own business hours" ON public.business_hours;
CREATE POLICY "Owners can manage their own business hours" 
ON public.business_hours
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.business_id = business_hours.business_id
    AND profiles.role = 'pro'
  )
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_business_hours_business_id ON business_hours(business_id);

-- Atomic RPC function to replace business hours
-- This is used by the dashboard to save hours safely
CREATE OR REPLACE FUNCTION public.replace_business_hours(
    p_business_id TEXT,
    p_hours JSONB
) RETURNS VOID AS $$
BEGIN
    -- Delete existing hours for this business
    DELETE FROM public.business_hours WHERE business_id = p_business_id;
    
    -- Insert new hours from the JSONB array
    -- We use COALESCE and handle empty strings for time conversion
    INSERT INTO public.business_hours (business_id, day_of_week, open_time, close_time, is_closed)
    SELECT 
        p_business_id, 
        (h->>'day_of_week')::INT, 
        (NULLIF(h->>'open_time', ''))::TIME,
        (NULLIF(h->>'close_time', ''))::TIME,
        COALESCE((h->>'is_closed')::BOOLEAN, false)
    FROM jsonb_array_elements(p_hours) h;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
