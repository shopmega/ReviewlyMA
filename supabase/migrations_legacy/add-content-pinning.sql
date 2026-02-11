-- Create pinned_content table
CREATE TABLE pinned_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  media_urls TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pinned_content ENABLE ROW LEVEL SECURITY;

-- Policies for business owners
CREATE POLICY "Business owners can view their pinned content" ON pinned_content
  FOR SELECT USING (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Business owners can create pinned content" ON pinned_content
  FOR INSERT WITH CHECK (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Business owners can update their pinned content" ON pinned_content
  FOR UPDATE USING (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Business owners can delete their pinned content" ON pinned_content
  FOR DELETE USING (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));

-- Policy for admins
CREATE POLICY "Admins can manage all pinned content" ON pinned_content
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_pinned_content_business_id ON pinned_content(business_id);
CREATE INDEX idx_pinned_content_active ON pinned_content(is_active);