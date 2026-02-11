-- Fix businesses with ratings but no reviews
-- This script sets overall_rating to 0 for businesses that have no published reviews

-- First, let's check the current state
SELECT 
    b.id,
    b.name,
    b.overall_rating,
    COUNT(r.id) as actual_review_count
FROM businesses b
LEFT JOIN reviews r ON b.id = r.business_id AND r.status = 'published'
GROUP BY b.id, b.name, b.overall_rating
HAVING COUNT(r.id) = 0 AND b.overall_rating > 0
ORDER BY b.overall_rating DESC;

-- Update businesses with no reviews to have overall_rating = 0
UPDATE businesses 
SET overall_rating = 0
WHERE id IN (
    SELECT b.id
    FROM businesses b
    LEFT JOIN reviews r ON b.id = r.business_id AND r.status = 'published'
    GROUP BY b.id
    HAVING COUNT(r.id) = 0
);

-- Verify the fix
SELECT COUNT(*) as businesses_with_ratings_no_reviews
FROM businesses b
LEFT JOIN reviews r ON b.id = r.business_id AND r.status = 'published'
GROUP BY b.id
HAVING COUNT(r.id) = 0 AND b.overall_rating > 0;