/* Fix for seeded data overriding user updates */
/* This script resets amenities and business hours for seeded businesses that don't have user-defined values */

-- List of seeded business IDs
WITH seeded_businesses AS (
    SELECT unnest(ARRAY[
        'ocp-group',
        'maroc-telecom',
        'attijariwafa-bank',
        'cgi-maroc',
        'royal-air-maroc',
        'intelcia-group',
        'cdg-capital',
        'capgemini-engineering',
        'labelvie-group',
        'inwi',
        'managem-group',
        'ctm',
        'maroc-telecom',
        'ocp-group',
        'attijariwafa-bank'
    ]) AS business_id
),
-- Check if businesses have user-defined amenities (non-seed values)
businesses_with_user_amenities AS (
    SELECT DISTINCT b.id
    FROM businesses b
    JOIN reviews r ON b.id = r.business_id
    WHERE b.id NOT IN (SELECT business_id FROM seeded_businesses)
    AND b.amenities IS NOT NULL
    AND array_length(b.amenities, 1) > 0
),
-- Check if businesses have user-defined hours (non-seed values)
businesses_with_user_hours AS (
    SELECT DISTINCT business_id
    FROM business_hours
    WHERE business_id NOT IN (SELECT business_id FROM seeded_businesses)
)
-- Reset amenities for seeded businesses that don't have user-defined amenities
UPDATE businesses
SET amenities = NULL
WHERE id IN (SELECT business_id FROM seeded_businesses)
AND id NOT IN (SELECT id FROM businesses_with_user_amenities);

-- Delete business hours for seeded businesses that don't have user-defined hours
DELETE FROM business_hours
WHERE business_id IN (
    SELECT business_id FROM (
        SELECT unnest(ARRAY[
            'ocp-group',
            'maroc-telecom',
            'attijariwafa-bank',
            'cgi-maroc',
            'royal-air-maroc',
            'intelcia-group',
            'cdg-capital',
            'capgemini-engineering',
            'labelvie-group',
            'inwi',
            'managem-group',
            'ctm',
            'maroc-telecom',
            'ocp-group',
            'attijariwafa-bank'
        ]) AS business_id
    ) AS sb
)
AND business_id NOT IN (SELECT business_id FROM businesses_with_user_hours);

-- Verify the fix
SELECT 
    'Seeded businesses with reset amenities' AS check_type,
    COUNT(*) AS count
FROM businesses
WHERE id IN (
    SELECT unnest(ARRAY[
        'ocp-group',
        'maroc-telecom',
        'attijariwafa-bank',
        'cgi-maroc',
        'royal-air-maroc',
        'intelcia-group',
        'cdg-capital',
        'capgemini-engineering',
        'labelvie-group',
        'inwi',
        'managem-group',
        'ctm',
        'maroc-telecom',
        'ocp-group',
        'attijariwafa-bank'
    ])
)
AND amenities IS NULL

UNION ALL

SELECT 
    'Seeded businesses with reset hours' AS check_type,
    COUNT(*) AS count
FROM (
    SELECT unnest(ARRAY[
        'ocp-group',
        'maroc-telecom',
        'attijariwafa-bank',
        'cgi-maroc',
        'royal-air-maroc',
        'intelcia-group',
        'cdg-capital',
        'capgemini-engineering',
        'labelvie-group',
        'inwi',
        'managem-group',
        'ctm',
        'maroc-telecom',
        'ocp-group',
        'attijariwafa-bank'
    ]) AS business_id
) sb
WHERE NOT EXISTS (
    SELECT 1 FROM business_hours bh WHERE bh.business_id = sb.business_id
);
