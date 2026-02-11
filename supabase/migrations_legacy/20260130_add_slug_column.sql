-- Add slug column to businesses table if it doesn't exist
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Optional: Attempt to populate slug from name for existing records where slug is null
-- Note: This is a simple slugification and might fail on duplicates, so we do it with ON CONFLICT DO NOTHING implicit behavior or just let it fail silently for duplicates
UPDATE businesses 
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;
