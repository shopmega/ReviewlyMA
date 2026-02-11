-- Migration: Add is_anonymous column to reviews table
-- Run this SQL in your Supabase SQL Editor

-- Add the is_anonymous column to reviews table
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE;

-- Update RLS policy to handle anonymous reviews appropriately
-- The policy remains the same since we still want published reviews to be public
-- No changes needed to existing policies for this feature

-- Optional: Update the column comment for documentation
COMMENT ON COLUMN public.reviews.is_anonymous IS 'Indicates if the review was posted anonymously';