#!/bin/bash
# Apply timezone optimization to Supabase database

echo "🚀 Applying timezone optimization to reduce pg_timezone_names query overhead..."

# Check if environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Environment variables not set. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

# Extract project ID from URL
PROJECT_ID=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed 's/https:\/\/\(.*\)\.supabase\.co/\1/')

echo "📦 Project ID: $PROJECT_ID"

# Apply the optimization migration
echo "🔧 Applying timezone optimization migration..."
curl -X POST "https://$PROJECT_ID.supabase.co/rest/v1/rpc/execute_sql" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d '{"sql": "'"$(cat supabase/optimize-timezone-queries.sql)"'"}'

if [ $? -eq 0 ]; then
    echo "✅ Timezone optimization applied successfully!"
    echo ""
    echo "📊 Next steps:"
    echo "1. Run performance tests to verify improvements"
    echo "2. Monitor Supabase query logs to confirm pg_timezone_names calls have decreased"
    echo "3. Test page load times for categories, businesses, and villes pages"
    echo ""
    echo "🧪 To test performance improvements, run:"
    echo "   node performance-test.js"
    echo "   node run-load-test.js"
else
    echo "❌ Failed to apply timezone optimization"
    exit 1
fi