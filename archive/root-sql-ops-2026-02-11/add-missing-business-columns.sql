-- Add missing columns to the businesses table

-- Add missing columns
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo_hint TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS location_details TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS hours JSONB;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS amenities TEXT[];
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS pricing_info TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS contact_info JSONB;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS social_links JSONB;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS seo_metadata JSONB;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS analytics JSONB;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS premium_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS claim_requests JSONB;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS review_reply_settings JSONB;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS notification_settings JSONB;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_type TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS founded_year INTEGER;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS employee_count TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS annual_revenue TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_model TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS target_audience TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS competitive_advantages TEXT[];
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS certifications TEXT[];
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS awards TEXT[];

-- Also add the updates table that's referenced in the query
CREATE TABLE IF NOT EXISTS updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  type TEXT DEFAULT 'general',
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger for updates table
CREATE TRIGGER update_updates_updated_at 
    BEFORE UPDATE ON updates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for updates table
ALTER TABLE updates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for updates
CREATE POLICY "Enable read access for all users" ON updates
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for business owners" ON updates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM businesses 
            WHERE businesses.id = updates.business_id 
            AND (businesses.owner_id = auth.uid() OR businesses.user_id = auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Enable update for business owners" ON updates
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM businesses 
            WHERE businesses.id = updates.business_id 
            AND (businesses.owner_id = auth.uid() OR businesses.user_id = auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

GRANT ALL ON updates TO authenticated;
GRANT ALL ON updates TO anon;

-- Verify the columns were added
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'businesses' 
  AND column_name IN ('is_sponsored', 'is_claimed', 'logo_hint', 'location_details', 'hours', 'amenities', 'pricing_info', 'contact_info', 'social_links', 'seo_metadata', 'analytics', 'created_by', 'verified', 'featured_until', 'premium_until', 'claim_requests', 'admin_notes', 'status', 'suspension_reason', 'review_reply_settings', 'notification_settings', 'business_type', 'industry', 'founded_year', 'employee_count', 'annual_revenue', 'business_model', 'target_audience', 'competitive_advantages', 'certifications', 'awards');

SELECT 'Missing columns added successfully' as status;