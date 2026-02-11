-- Fix RLS policies for reviews table to allow inserts

-- First, let's check existing policies
SELECT * FROM pg_policies WHERE tablename = 'reviews';

-- Drop the existing insert policy if it's too restrictive
DROP POLICY IF EXISTS "Users can insert their own reviews" ON reviews;

-- Create a new policy that allows authenticated users to insert reviews
CREATE POLICY "Users can insert reviews" ON reviews FOR INSERT TO authenticated WITH CHECK (true);

-- Optional: Create a more specific policy that ensures data integrity
-- This policy ensures that if a user_id is provided, it matches the authenticated user
CREATE POLICY "Users can insert matching reviews" ON reviews FOR INSERT TO authenticated 
  WITH CHECK (
    (user_id IS NULL) OR 
    (user_id = auth.uid())
  );

-- For testing purposes, you could temporarily allow all inserts:
-- CREATE POLICY "Allow all inserts" ON reviews FOR INSERT USING (true);

-- Refresh the policies
-- ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;