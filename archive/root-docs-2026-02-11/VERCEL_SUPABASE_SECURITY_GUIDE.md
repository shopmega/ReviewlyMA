# Vercel + Supabase Security Guide

## 🚀 Vercel Environment Variables Setup

### Step 1: Add Environment Variables to Vercel

```bash
# Using Vercel CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_GA_ID
vercel env add CRON_SECRET

# Or via Vercel Dashboard
# Project Settings → Environment Variables
```

### Step 2: Environment Variable Types

```bash
# Public Keys (accessible in browser)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Secret Keys (server-only)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=your_cron_secret
```

### Step 3: Environment-Specific Configuration

```bash
# Development (Local)
vercel env pull .env.local --environment=development

# Preview (Pull Request)
vercel env pull .env.preview --environment=preview

# Production (Main Branch)
vercel env pull .env.production --environment=production
```

## 🔒 Supabase Security Configuration

### Step 1: Secure Supabase Project

```bash
# Go to Supabase Dashboard → Settings → API
# 1. Enable Row Level Security (RLS) on all tables
# 2. Configure JWT settings
# 3. Set up authentication providers
# 4. Configure CORS settings
```

### Step 2: Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Example RLS Policies
-- Anyone can read businesses
CREATE POLICY "Businesses are viewable by everyone" ON businesses
  FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Only admins can delete businesses
CREATE POLICY "Admins can delete businesses" ON businesses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
```

### Step 3: Supabase Edge Functions Security

```typescript
// supabase/functions/admin-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // Verify webhook secret
  const signature = req.headers.get("x-supabase-signature")
  const secret = Deno.env.get("CRON_SECRET")
  
  if (!signature || signature !== secret) {
    return new Response("Unauthorized", { status: 401 })
  }
  
  // Process webhook
  return new Response("OK", { status: 200 })
})
```

## 🛡️ Vercel Security Features

### Step 1: Vercel Analytics & Monitoring

```bash
# Enable Vercel Analytics
vercel analytics enable

# Monitor API usage and errors
# Dashboard → Analytics → Functions
```

### Step 2: Vercel Edge Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Add security headers
  const response = NextResponse.next()
  
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Rate limiting
  const ip = request.ip || 'anonymous'
  // Implement rate limiting logic here
  
  return response
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*']
}
```

### Step 3: Vercel Deploy Hooks & Secrets

```bash
# Create deploy hook for automated deployments
vercel hooks create --name="main-deploy" --branch="main"

# Use Vercel secrets for sensitive data
vercel secrets add SUPABASE_SERVICE_ROLE_KEY
vercel secrets add CRON_SECRET
```

## 🔧 Implementation Steps

### Phase 1: Setup (Day 1)

1. **Configure Vercel Environment Variables**
   ```bash
   # Add all required variables
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   vercel env add CRON_SECRET
   ```

2. **Update Local Development**
   ```bash
   # Pull environment variables
   vercel env pull .env.local
   
   # Remove hardcoded keys from .env.local
   # Use placeholder values for development
   ```

3. **Test Configuration**
   ```bash
   # Deploy to preview
   vercel --env=preview
   
   # Test all API endpoints
   # Verify analytics tracking
   # Check cron functionality
   ```

### Phase 2: Security Hardening (Day 2-3)

1. **Implement RLS Policies**
   ```sql
   -- Run all RLS policies from Supabase Dashboard
   -- Test with different user roles
   -- Verify data isolation
   ```

2. **Set Up Monitoring**
   ```bash
   # Enable Vercel Analytics
   # Configure error tracking
   # Set up alerts for failures
   ```

3. **Configure Edge Functions**
   ```bash
   # Deploy secure webhook handlers
   # Test authentication
   # Verify rate limiting
   ```

### Phase 3: Ongoing Maintenance

1. **Monthly Key Rotation**
   ```bash
   # Generate new Supabase keys
   # Update Vercel environment variables
   # Test all integrations
   # Deploy changes
   ```

2. **Quarterly Security Audit**
   ```bash
   # Review RLS policies
   # Check access logs
   # Update dependencies
   # Audit team access
   ```

## 📋 Environment Variable Management

### Development Environment
```bash
# .env.local (development only)
NEXT_PUBLIC_SUPABASE_URL=https://dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dev_anon_key_placeholder
SUPABASE_SERVICE_ROLE_KEY=dev_service_key_placeholder
NEXT_PUBLIC_GA_ID=G-DEVXXXXXXXX
CRON_SECRET=dev_secret_placeholder
```

### Production Environment
```bash
# Stored in Vercel (never in code)
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod_anon_key_real
SUPABASE_SERVICE_ROLE_KEY=prod_service_role_real
NEXT_PUBLIC_GA_ID=G-PRODXXXXXXXX
CRON_SECRET=prod_secret_real
```

## 🚨 Emergency Procedures

### Key Compromise Response

1. **Immediate Actions (5 minutes)**
   ```bash
   # Rotate Supabase keys
   # Update Vercel environment variables
   # Redeploy application
   ```

2. **Verification (15 minutes)**
   ```bash
   # Test all API endpoints
   # Verify cron jobs
   # Check analytics tracking
   # Monitor error logs
   ```

3. **Investigation (1 hour)**
   ```bash
   # Review Vercel deployment logs
   # Check Supabase access logs
   # Identify breach source
   # Document findings
   ```

### Automated Rotation Script

```bash
#!/bin/bash
# rotate-vercel-keys.sh

# Generate new secrets
NEW_CRON_SECRET=$(openssl rand -base64 32)

# Update Vercel environment
vercel env add CRON_SECRET --value="$NEW_CRON_SECRET"

# Deploy changes
vercel --prod

# Verify deployment
sleep 30
curl -f https://your-app.vercel.app/api/health || exit 1

echo "Key rotation completed successfully"
```

## 📊 Monitoring & Alerts

### Vercel Monitoring
```bash
# Dashboard → Analytics
# Monitor:
# - Function execution time
# - Error rates
# - API usage patterns
# - Geographic distribution
```

### Supabase Monitoring
```bash
# Supabase Dashboard → Logs
# Monitor:
# - Database queries
# - Authentication attempts
# - API usage
# - Storage operations
```

### Alert Configuration
```bash
# Set up alerts for:
# - High error rates (>5%)
# - Slow function execution (>2s)
# - Unusual API usage patterns
# - Failed authentication attempts
```

## 🎯 Best Practices Summary

### Do's
- ✅ Use Vercel environment variables for all secrets
- ✅ Enable RLS on all Supabase tables
- ✅ Implement proper error handling
- ✅ Monitor usage and errors
- ✅ Rotate keys regularly
- ✅ Use different keys for different environments

### Don'ts
- ❌ Never commit secrets to Git
- ❌ Never use production keys locally
- ❌ Never share keys via email/chat
- ❌ Never disable RLS in production
- ❌ Never ignore security alerts
- ❌ Never reuse keys across projects

## 🛠️ Useful Commands

```bash
# Environment management
vercel env ls                          # List all variables
vercel env rm <name>                   # Remove variable
vercel env pull .env.local             # Pull to local file

# Deployment
vercel --prod                          # Deploy to production
vercel --env=preview                   # Deploy to preview
vercel logs                            # View deployment logs

# Monitoring
vercel analytics                       # View analytics
vercel domains                         # Manage domains
vercel projects                        # List projects
```

---

This guide provides a complete, production-ready security setup for Vercel + Supabase. Follow the phases systematically and maintain regular security practices.
