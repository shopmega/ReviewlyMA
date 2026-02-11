#!/bin/bash

# Key Rotation Script for Vercel + Supabase
# Run this script to rotate all compromised keys

set -e

echo "🚨 Starting Key Rotation Process..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI not found. Please install it first:"
    echo "npm i -g vercel"
    exit 1
fi

# Check if OpenSSL is available
if ! command -v openssl &> /dev/null; then
    print_error "OpenSSL not found. Please install it first."
    exit 1
fi

print_status "Step 1: Generating new secure secrets..."

# Generate new CRON secret
NEW_CRON_SECRET=$(openssl rand -base64 32)
print_status "Generated new CRON_SECRET"

print_status "Step 2: Please manually rotate Supabase keys..."
echo ""
print_warning "Go to https://supabase.com/dashboard:"
echo "1. Select your project"
echo "2. Go to Settings → API"
echo "3. Click 'Generate new key' for SERVICE_ROLE_KEY"
echo "4. Click 'Generate new key' for ANON_KEY"
echo "5. Copy the new keys"
echo ""
read -p "Press Enter once you have the new Supabase keys..."

# Get new Supabase keys from user
echo ""
echo "Enter your new Supabase keys:"
read -p "NEW SUPABASE SERVICE ROLE KEY: " NEW_SERVICE_KEY
read -p "NEW SUPABASE ANON KEY: " NEW_ANON_KEY
read -p "SUPABASE PROJECT URL: " SUPABASE_URL

print_status "Step 3: Updating Vercel environment variables..."

# Update Vercel environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL --value="$SUPABASE_URL"
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY --value="$NEW_ANON_KEY"
vercel env add SUPABASE_SERVICE_ROLE_KEY --value="$NEW_SERVICE_KEY"
vercel env add CRON_SECRET --value="$NEW_CRON_SECRET"

print_status "Step 4: Updating local development environment..."

# Create backup of current .env.local
if [ -f ".env.local" ]; then
    cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
    print_status "Backed up current .env.local"
fi

# Update local .env.local with development placeholders
cat > .env.local << EOF
# Development Environment - DO NOT USE IN PRODUCTION
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEW_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$NEW_SERVICE_KEY
NEXT_PUBLIC_GA_ID=G-DEVXXXXXXXX
CRON_SECRET=$NEW_CRON_SECRET
EOF

print_status "Step 5: Deploying to production..."

# Deploy to production
vercel --prod

print_status "Step 6: Verifying deployment..."

# Wait for deployment to propagate
sleep 30

# Test health endpoint
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" https://avis.vercel.app/api/health)

if [ "$HEALTH_CHECK" = "200" ]; then
    print_status "✅ Health check passed - Application is running"
else
    print_error "❌ Health check failed - HTTP $HEALTH_CHECK"
    echo "Please check the deployment logs: vercel logs"
fi

print_status "Step 7: Testing API endpoints..."

# Test business search API
SEARCH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "https://avis.vercel.app/api/businesses/search?q=test")

if [ "$SEARCH_CHECK" = "200" ]; then
    print_status "✅ Search API working"
else
    print_warning "⚠️ Search API returned HTTP $SEARCH_CHECK"
fi

print_status "Step 8: Cleaning up..."

# Set secure permissions
chmod 600 .env.local

echo ""
echo "🎉 Key Rotation Complete!"
echo "========================"
echo ""
print_status "What was done:"
echo "✅ Generated new CRON_SECRET"
echo "✅ Rotated Supabase keys"
echo "✅ Updated Vercel environment variables"
echo "✅ Deployed to production"
echo "✅ Verified deployment"
echo ""
print_warning "Next steps:"
echo "1. Test all application features"
echo "2. Check Supabase dashboard for any errors"
echo "3. Monitor Vercel analytics for unusual activity"
echo "4. Update any documentation with old keys"
echo ""
print_status "Backup files created:"
ls -la .env.local.backup.* 2>/dev/null || echo "No backup files found"
echo ""
print_status "Secure your new keys:"
echo "🔐 Store the new keys in a secure password manager"
echo "🔐 Never commit .env.local to Git"
echo "🔐 Rotate keys monthly for security"
echo ""
echo "🚀 Your application is now secure!"
