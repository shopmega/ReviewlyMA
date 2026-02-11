-- Add Location & Discovery System columns to businesses table
-- Created: January 06, 2026

ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS subcategory text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS quartier text,
ADD COLUMN IF NOT EXISTS amenities text[];  -- array of amenity values

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_businesses_category_sub 
  ON businesses(category, subcategory);

CREATE INDEX IF NOT EXISTS idx_businesses_city_quartier 
  ON businesses(city, quartier);

CREATE INDEX IF NOT EXISTS idx_businesses_amenities 
  ON businesses USING GIN(amenities);

-- Add comments for documentation
COMMENT ON COLUMN public.businesses.subcategory IS 'Subcategory within main category (e.g., "Restaurant marocain" for Restaurants & Cafés)';
COMMENT ON COLUMN public.businesses.city IS 'City where business is located (e.g., "Casablanca", "Rabat")';
COMMENT ON COLUMN public.businesses.quartier IS 'Neighborhood/quartier within city (e.g., "Maarif", "Gueliz")';
COMMENT ON COLUMN public.businesses.amenities IS 'Array of amenities available (e.g., ["Halal", "WiFi gratuit", "Terrasse"])';
