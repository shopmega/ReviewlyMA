/* Remove all seeded businesses from the database */
/* This script safely deletes seeded businesses and their related data */

-- First, let's identify all seeded business IDs
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
        'ctm'
    ]) AS business_id
)
-- Delete business hours for seeded businesses
DELETE FROM business_hours
WHERE business_id IN (SELECT business_id FROM seeded_businesses);

-- Delete reviews for seeded businesses
DELETE FROM reviews
WHERE business_id IN (SELECT business_id FROM seeded_businesses);

-- Delete updates for seeded businesses
DELETE FROM updates
WHERE business_id IN (SELECT business_id FROM seeded_businesses);

-- Delete business claims for seeded businesses
DELETE FROM business_claims
WHERE business_id IN (SELECT business_id FROM seeded_businesses);

-- Delete business analytics for seeded businesses
DELETE FROM business_analytics
WHERE business_id IN (SELECT business_id FROM seeded_businesses);

-- Delete favorites for seeded businesses
DELETE FROM favorites
WHERE business_id IN (SELECT business_id FROM seeded_businesses);

-- Delete notifications related to seeded businesses
DELETE FROM notifications
WHERE business_id IN (SELECT business_id FROM seeded_businesses);

-- Delete support tickets for seeded businesses
DELETE FROM support_tickets
WHERE business_id IN (SELECT business_id FROM seeded_businesses);

-- Delete review reports for seeded businesses
DELETE FROM review_reports
WHERE business_id IN (SELECT business_id FROM seeded_businesses);

-- Delete media reports for seeded businesses
DELETE FROM media_reports
WHERE business_id IN (SELECT business_id FROM seeded_businesses);

-- Finally, delete the seeded businesses themselves
DELETE FROM businesses
WHERE id IN (SELECT business_id FROM seeded_businesses);

-- Verify the cleanup
SELECT 
    'Remaining seeded businesses' AS check_type,
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
        'ctm'
    ])
);
