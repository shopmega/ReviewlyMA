-- Migration to add updated_at column to profiles table
-- Run this in your Supabase SQL editor to fix the missing column issue

-- Add updated_at column to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records to have updated_at value if they don't already
UPDATE public.profiles 
SET updated_at = NOW() 
WHERE updated_at IS NULL;

-- Create a trigger to automatically update updated_at on any profile changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop the trigger if it exists to recreate it
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

-- Create the trigger to automatically update updated_at
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON public.profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER update_profiles_updated_at ON public.profiles IS 
'Automatically updates the updated_at column when a profile is modified';