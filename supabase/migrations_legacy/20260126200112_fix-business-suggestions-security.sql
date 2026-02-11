/* Fix for unauthorized business creation */
/* This script updates the suggestBusiness function to require authentication and moderation */

-- First, let's create a table to track business suggestions
CREATE TABLE IF NOT EXISTS business_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    city TEXT NOT NULL,
    description TEXT,
    location TEXT,
    suggested_by UUID REFERENCES auth.users(id),
    suggested_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT
);

-- Add RLS policies for business suggestions
ALTER TABLE business_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own suggestions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy pol 
        JOIN pg_class tbl ON tbl.oid = pol.polrelid 
        WHERE tbl.relname = 'business_suggestions' 
        AND pol.polname = 'Users can insert suggestions'
    ) THEN
        CREATE POLICY "Users can insert suggestions" ON business_suggestions
            FOR INSERT
            WITH CHECK (auth.uid() = suggested_by);
    END IF;
END $$;

-- Users can view their own suggestions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy pol 
        JOIN pg_class tbl ON tbl.oid = pol.polrelid 
        WHERE tbl.relname = 'business_suggestions' 
        AND pol.polname = 'Users can view their suggestions'
    ) THEN
        CREATE POLICY "Users can view their suggestions" ON business_suggestions
            FOR SELECT
            USING (auth.uid() = suggested_by);
    END IF;
END $$;

-- Admins can view all suggestions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy pol 
        JOIN pg_class tbl ON tbl.oid = pol.polrelid 
        WHERE tbl.relname = 'business_suggestions' 
        AND pol.polname = 'Admins can view all suggestions'
    ) THEN
        CREATE POLICY "Admins can view all suggestions" ON business_suggestions
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role = 'admin'
                )
            );
    END IF;
END $$;

-- Admins can update suggestion status
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy pol 
        JOIN pg_class tbl ON tbl.oid = pol.polrelid 
        WHERE tbl.relname = 'business_suggestions' 
        AND pol.polname = 'Admins can update suggestions'
    ) THEN
        CREATE POLICY "Admins can update suggestions" ON business_suggestions
            FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role = 'admin'
                )
            );
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_suggestions_status ON business_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_business_suggestions_suggested_by ON business_suggestions(suggested_by);
CREATE INDEX IF NOT EXISTS idx_business_suggestions_category ON business_suggestions(category);
CREATE INDEX IF NOT EXISTS idx_business_suggestions_city ON business_suggestions(city);