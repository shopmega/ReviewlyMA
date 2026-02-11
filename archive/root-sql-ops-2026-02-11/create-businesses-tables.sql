-- Create businesses table and related tables

-- 1. Create businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  logo_url TEXT,
  cover_url TEXT,
  gallery_urls TEXT[],
  phone TEXT,
  website TEXT,
  category TEXT,
  subcategory TEXT,
  city TEXT,
  quartier TEXT,
  location TEXT,
  description TEXT,
  overall_rating NUMERIC(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  company_size TEXT,
  price_range TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  tier TEXT DEFAULT 'none',
  owner_id UUID REFERENCES auth.users(id),
  user_id UUID REFERENCES auth.users(id),
  tags TEXT[],
  benefits TEXT[],
  amenities TEXT[],
  whatsapp_number TEXT,
  affiliate_link TEXT,
  affiliate_cta TEXT,
  admin_affiliate_link TEXT,
  admin_affiliate_cta TEXT,
  search_vector TSVECTOR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create business_hours table
CREATE TABLE IF NOT EXISTS business_hours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week >= 1 AND day_of_week <= 7),
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
CREATE INDEX IF NOT EXISTS idx_businesses_city ON businesses(city);
CREATE INDEX IF NOT EXISTS idx_businesses_rating ON businesses(overall_rating);
CREATE INDEX IF NOT EXISTS idx_businesses_search ON businesses USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_business_hours_business_id ON business_hours(business_id);

-- 4. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Create triggers for updated_at
CREATE TRIGGER update_businesses_updated_at 
    BEFORE UPDATE ON businesses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_hours_updated_at 
    BEFORE UPDATE ON business_hours 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Enable RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for businesses
CREATE POLICY "Enable read access for all users" ON businesses
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON businesses
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for business owners" ON businesses
    FOR UPDATE USING (
        auth.uid() = owner_id OR 
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- 8. Create RLS policies for business_hours
CREATE POLICY "Enable read access for all users" ON business_hours
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for business owners" ON business_hours
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM businesses 
            WHERE businesses.id = business_hours.business_id 
            AND (businesses.owner_id = auth.uid() OR businesses.user_id = auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Enable update for business owners" ON business_hours
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM businesses 
            WHERE businesses.id = business_hours.business_id 
            AND (businesses.owner_id = auth.uid() OR businesses.user_id = auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- 9. Grant permissions
GRANT ALL ON businesses TO authenticated;
GRANT ALL ON businesses TO anon;
GRANT ALL ON business_hours TO authenticated;
GRANT ALL ON business_hours TO anon;

-- 10. Insert some sample data for testing
INSERT INTO businesses (name, slug, category, city, description, overall_rating) VALUES
('Sample Restaurant', 'sample-restaurant', 'Restaurants', 'Casablanca', 'A sample restaurant for testing', 4.5),
('Test Cafe', 'test-cafe', 'Cafés', 'Rabat', 'A test cafe for development', 4.2),
('Demo Shop', 'demo-shop', 'Shopping', 'Marrakech', 'A demo shop for testing purposes', 4.0)
ON CONFLICT (slug) DO NOTHING;

-- Verify the tables were created
SELECT 'businesses table created successfully' as status;
SELECT 'business_hours table created successfully' as status;