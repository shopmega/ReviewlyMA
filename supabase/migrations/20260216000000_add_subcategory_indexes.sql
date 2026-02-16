-- Migration: Add indexes for subcategory to improve filtering performance
-- Date: 2026-02-16

CREATE INDEX IF NOT EXISTS idx_businesses_subcategory ON businesses(subcategory);
CREATE INDEX IF NOT EXISTS idx_businesses_category_subcategory ON businesses(category, subcategory);

COMMENT ON INDEX idx_businesses_subcategory IS 'Improve performance for subcategory filtering';
COMMENT ON INDEX idx_businesses_category_subcategory IS 'Improve performance for combined category and subcategory filtering';
