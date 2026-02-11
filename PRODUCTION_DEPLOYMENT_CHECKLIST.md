# Production Deployment Checklist

## 🚨 Critical Actions Required Before Production Deployment

### 1. Development Dependencies Cleanup ✅
**Status**: CLEAN - All dev dependencies are properly separated in `package.json`

- ✅ Development dependencies are correctly placed in `devDependencies`
- ✅ Production dependencies are in `dependencies`
- ✅ No dev tools will be included in production build

### 2. Console Logs and Debug Statements ⚠️
**Status**: REQUIRES ATTENTION - 578 console statements found

**High Priority - Must Remove/Replace:**
- 📁 Scripts folder: 200+ console logs (acceptable for admin scripts)
- 📁 `src/app/actions/business.ts`: 35 console logs
- 📁 `src/contexts/BusinessContext.tsx`: 18 console logs  
- 📁 `src/app/actions/claim.ts`: 17 console logs
- 📁 `src/lib/competitor-ads/server-actions.ts`: 16 console logs

**Action Required:**
```bash
# Replace with proper logging in production
# Remove development console.log statements
# Use logger.ts for structured logging instead
```

### 3. Environment Variables and Secrets 🔐
**Status**: CONFIGURED - 172 environment variable references found

**Required Production Environment Variables:**
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Email Service (choose one)
EMAIL_PROVIDER=resend|sendgrid|mailjet|ses|console
RESEND_API_KEY=your_resend_key
SENDGRID_API_KEY=your_sendgrid_key
MAILJET_API_KEY=your_mailjet_key
MAILJET_API_SECRET=your_mailjet_secret
EMAIL_FROM=noreply@avis.ma

# Analytics (optional)
GOOGLE_ANALYTICS_ID=your_ga_id

# Development/Production
NODE_ENV=production
```

### 4. Build Configuration ✅
**Status**: OPTIMIZED - Next.js configuration is production-ready

**Production Optimizations Enabled:**
- ✅ TypeScript build errors not ignored
- ✅ ESLint errors not ignored  
- ✅ Package optimization for lucide-react, recharts, @radix-ui
- ✅ Source maps disabled in production
- ✅ Gzip compression enabled
- ✅ Image optimization configured (AVIF, WebP)
- ✅ Security headers configured

### 5. Security Configuration ✅
**Status**: SECURED - Comprehensive security headers in place

**Security Headers Active:**
- ✅ X-Content-Type-Options: nosniff
- ✅ X-Frame-Options: DENY
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Strict-Transport-Security: max-age=31536000
- ✅ Referrer-Policy: strict-no-referrer
- ✅ Permissions-Policy: geolocation=(), camera=(), microphone=()
- ✅ Content-Security-Policy: Configured

### 6. Mobile App Considerations 📱
**Status**: NEEDS REVIEW - Remove web-specific dependencies

**Actions Required:**
- 🔄 Remove web-specific dependencies for iOS/Android builds
- 🔄 Tree-shake imports to reduce bundle size
- 🔄 Review and remove web-only components

---

## 📋 Pre-Deployment Commands

### Build and Test Commands
```bash
# Install dependencies
npm ci --production=false

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Run unit tests
npm run test:unit

# Build for production
npm run build

# Start production server (local test)
npm start
```

### Console Log Cleanup Commands
```bash
# Find all console statements (review manually)
grep -r "console\." src/ --include="*.ts" --include="*.tsx"

# Replace with logger (example)
# console.log("message") → logger.info("message")
```

---

## 🔧 Production Deployment Steps

### 1. Environment Setup
- [ ] Set all required environment variables
- [ ] Configure Supabase production instance
- [ ] Set up email service provider
- [ ] Configure analytics (if needed)

### 2. Code Preparation
- [ ] Remove/replace console.log statements with proper logging
- [ ] Run `npm run typecheck` - ensure no errors
- [ ] Run `npm run lint` - ensure no warnings
- [ ] Run unit tests - ensure all pass

### 3. Build Process
- [ ] Run `npm run build`
- [ ] Verify build output in `.next` folder
- [ ] Test production build locally

### 4. Security Verification
- [ ] Verify all secrets are environment variables
- [ ] Check no hardcoded credentials
- [ ] Verify CORS settings
- [ ] Test security headers

### 5. Performance Optimization
- [ ] Verify image optimization
- [ ] Check bundle size
- [ ] Test caching strategies
- [ ] Monitor Core Web Vitals

### 6. Mobile App Specific
- [ ] Remove web dependencies
- [ ] Tree-shake unused imports
- [ ] Optimize for mobile performance
- [ ] Test on actual devices

---

## 🚨 Critical Issues to Fix Before Deployment

### High Priority
1. **Console Logs**: 578 console statements need cleanup
2. **Web Dependencies**: Remove web-specific code for mobile builds
3. **Environment Variables**: Ensure all secrets are properly configured

### Medium Priority
1. **Bundle Size**: Review and optimize import statements
2. **Error Handling**: Ensure proper error boundaries
3. **Analytics**: Configure production analytics

---

## ✅ Post-Deployment Verification

### Functionality Tests
- [ ] User authentication works
- [ ] Business listings load correctly
- [ ] Search and filtering functions
- [ ] Review system works
- [ ] Admin panel accessible
- [ ] Email notifications work

### Performance Tests
- [ ] Page load times < 3 seconds
- [ ] Core Web Vitals pass
- [ ] Mobile responsiveness
- [ ] No console errors in production

### Security Tests
- [ ] Security headers present
- [ ] No sensitive data exposed
- [ ] HTTPS redirects work
- [ ] CSP policies enforced

---

## 📞 Emergency Rollback Plan

### If Issues Detected
1. **Immediate**: Revert to previous deployment
2. **Investigate**: Check error logs and metrics
3. **Fix**: Address critical issues
4. **Test**: Verify fixes in staging
5. **Redeploy**: Push corrected version

### Monitoring Setup
- [ ] Error tracking configured
- [ ] Performance monitoring active
- [ ] User analytics working
- [ ] Security alerts enabled

---

## 🔄 Deployment Commands

### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Or using Vercel GitHub integration (recommended)
```

### Manual Deployment
```bash
# Build and start
npm run build
npm start

# Or using PM2 for process management
pm2 start ecosystem.config.js --env production
```

---

**Last Updated**: 2026-02-09  
**Version**: 1.0  
**Status**: Ready for deployment after console log cleanup
