-- Create ads table
CREATE TABLE ads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  advertiser_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_business_ids UUID[],
  targeting_criteria JSONB,
  budget_cents INTEGER DEFAULT 0,
  spent_cents INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- Policies for ad creators
CREATE POLICY "Users can view their own ads" ON ads
  FOR SELECT USING (auth.uid() = advertiser_id);

CREATE POLICY "Users can create ads" ON ads
  FOR INSERT WITH CHECK (auth.uid() = advertiser_id);

CREATE POLICY "Users can update their ads" ON ads
  FOR UPDATE USING (auth.uid() = advertiser_id);

-- Policy for admins
CREATE POLICY "Admins can manage all ads" ON ads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_ads_advertiser_id ON ads(advertiser_id);
CREATE INDEX idx_ads_status ON ads(status);
CREATE INDEX idx_ads_dates ON ads(start_date, end_date);