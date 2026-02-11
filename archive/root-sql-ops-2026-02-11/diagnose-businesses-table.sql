-- Diagnostic script to check the businesses table structure and accessibility

-- 1. Check if the businesses table exists
SELECT 
    table_name,
    table_schema,
    table_type
FROM information_schema.tables 
WHERE table_name = 'businesses';

-- 2. Check the columns in the businesses table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'businesses' 
ORDER BY ordinal_position;

-- 3. Check for any RLS policies on the businesses table
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'businesses';

-- 4. Check if there are any rows in the table
SELECT COUNT(*) as total_rows FROM businesses;

-- 5. Check a sample of the data (if any exists)
SELECT 
    id,
    name,
    category,
    city,
    overall_rating,
    created_at
FROM businesses 
LIMIT 5;

-- 6. Check for any constraints on the table
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'businesses';

-- 7. Test a simple query to see if basic access works
SELECT 
    COUNT(*) as accessible_rows
FROM businesses;

-- 8. Check if the search_vector column exists (used for FTS)
SELECT 
    column_name
FROM information_schema.columns 
WHERE table_name = 'businesses' 
    AND column_name = 'search_vector';

-- 9. Check if the business_hours table exists and has proper foreign key
SELECT 
    table_name
FROM information_schema.tables 
WHERE table_name = 'business_hours';

-- 10. Check if the reviews table exists
SELECT 
    table_name
FROM information_schema.tables 
WHERE table_name = 'reviews';