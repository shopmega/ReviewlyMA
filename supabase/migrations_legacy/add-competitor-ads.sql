-- Create competitor_ads table
CREATE TABLE competitor_ads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  advertiser_business_id UUID REFERENCES businesses(id), -- Business placing the ad
  target_competitor_ids UUID[], -- Array of competitor business IDs to show ad on
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  media_urls TEXT[],
  budget_cents INTEGER DEFAULT 0,
  spent_cents INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE competitor_ads ENABLE ROW LEVEL SECURITY;

-- Policies for ad creators
CREATE POLICY "Business owners can view their own competitor ads" ON competitor_ads
  FOR SELECT USING (auth.uid() IN (
    SELECT owner_id FROM businesses WHERE id = advertiser_business_id
  ));

CREATE POLICY "Business owners can create competitor ads" ON competitor_ads
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT owner_id FROM businesses WHERE id = advertiser_business_id
  ));

CREATE POLICY "Business owners can update their competitor ads" ON competitor_ads
  FOR UPDATE USING (auth.uid() IN (
    SELECT owner_id FROM businesses WHERE id = advertiser_business_id
  ));

CREATE POLICY "Business owners can delete their competitor ads" ON competitor_ads
  FOR DELETE USING (auth.uid() IN (
    SELECT owner_id FROM businesses WHERE id = advertiser_business_id
  ));

-- Policy for admins
CREATE POLICY "Admins can manage all competitor ads" ON competitor_ads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_competitor_ads_advertiser_id ON competitor_ads(advertiser_business_id);
CREATE INDEX idx_competitor_ads_status ON competitor_ads(status);
CREATE INDEX idx_competitor_ads_dates ON competitor_ads(start_date, end_date);