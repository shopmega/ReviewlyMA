-- DISCOVER ALL TABLES THAT REFERENCE PROFILES TABLE
-- This helps identify all foreign key constraints that need to be handled

-- Find all foreign key constraints referencing profiles.id
SELECT 
    tc.table_name as referencing_table,
    kcu.column_name as referencing_column,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND ccu.table_name = 'profiles'
AND ccu.column_name = 'id'
ORDER BY tc.table_name;

-- Check which of these tables actually have data for the duplicate profile
SELECT 
    'reviews' as table_name,
    COUNT(*) as reference_count
FROM reviews 
WHERE user_id = '48f5e7d0-80a2-481a-9fb5-096ce3fe86d5'
UNION ALL
SELECT 
    'business_claims',
    COUNT(*)
FROM business_claims 
WHERE user_id = '48f5e7d0-80a2-481a-9fb5-096ce3fe86d5'
UNION ALL
SELECT 
    'support_ticket_messages',
    COUNT(*)
FROM support_ticket_messages 
WHERE sender_id = '48f5e7d0-80a2-481a-9fb5-096ce3fe86d5'
UNION ALL
SELECT 
    'premium_payments',
    COUNT(*)
FROM premium_payments 
WHERE user_id = '48f5e7d0-80a2-481a-9fb5-096ce3fe86d5';
