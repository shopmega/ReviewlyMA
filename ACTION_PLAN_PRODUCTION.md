# 🎯 Action Plan - ReviewlyMA Production Readiness

**Generated:** February 16, 2026  
**Based On:** Comprehensive App Review

---

## 🚨 CRITICAL BLOCKERS (Fix Today)

### 1. Remove Binary File Blocking Lint
**File:** `EqualizerAPO-x64-1.4.2.exe` in project root

**Commands:**
```bash
# Remove the file
rm EqualizerAPO-x64-1.4.2.exe

# Add to gitignore
echo "*.exe" >> .gitignore

# Verify lint works
npm run lint
```

**Expected Result:** Lint should pass with 0 errors
**Time Estimate:** 5 minutes

---

### 2. Fix Failing Unit Tests
**Status:** 98/137 tests failing (71% failure rate)

**Commands:**
```bash
# Run tests with verbose output
npm run test:unit -- --reporter=verbose

# Run specific test file to debug
npm run test:unit -- src/components/ui/__tests__/button.test.tsx
```

**Priority Areas:**
1. UI component tests (button, card, dialog, form, input)
2. Business action tests
3. Data fetching tests

**Time Estimate:** 2-4 hours
**Note:** May require updating test configurations or fixing component implementations

---

### 3. Clean Console Logs in Production Code
**Files to Fix:**
- `src/app/actions/claim.ts` (2 instances)
- Review other action files

**Find Remaining:**
```bash
# Find all console logs in src (excluding scripts)
grep -r "console\." src/app src/components src/lib --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v "scripts"
```

**Replace with logger:**
```typescript
// Before
console.log('Verification successful:', data);

// After
import { logger } from '@/lib/logger';
logger.info('Verification successful', { data });
```

**Time Estimate:** 1 hour

---

## ⚠️ HIGH PRIORITY (This Week)

### 4. Enforce Premium Feature Gates

**Create Feature Gate Component:**
```typescript
// src/components/shared/PremiumFeature.tsx
'use client';

import { useProfile } from '@/hooks/useProfile';
import { SubscriptionTier } from '@/lib/types';

interface PremiumFeatureProps {
  tier: SubscriptionTier;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PremiumFeature({ tier, children, fallback = null }: PremiumFeatureProps) {
  const { profile } = useProfile();
  
  if (!profile) return fallback;
  
  // Check if user's tier meets requirement
  const tierLevels = { none: 0, growth: 1, gold: 2 };
  const requiredLevel = tierLevels[tier];
  const userLevel = tierLevels[profile.tier];
  
  if (userLevel >= requiredLevel) {
    return <>{children}</>;
  }
  
  return fallback;
}
```

**Apply to Features:**
```typescript
// Wrap WhatsApp button
<PremiumFeature tier="gold">
  <WhatsAppButton number={business.whatsapp_number} />
</PremiumFeature>

// Wrap cover photo
<PremiumFeature tier="growth">
  <CoverImage url={business.cover_url} />
</PremiumFeature>
```

**Files to Update:**
- Business detail page components
- Business card components
- Dashboard edit profile

**Time Estimate:** 2-3 hours

---

### 5. Verify Business Hours Functionality

**Test Checklist:**
1. ✅ Database table exists and has RLS policies
2. ✅ Dashboard edit form saves hours correctly
3. ❓ Business card displays current status (Open/Closed)
4. ❓ Business detail page shows full schedule

**Testing Steps:**
```bash
# Check if any businesses have hours
# Run in Supabase SQL Editor:
SELECT b.name, COUNT(h.*) as hours_count
FROM businesses b
LEFT JOIN business_hours h ON h.business_id = b.id
GROUP BY b.id, b.name
HAVING COUNT(h.*) > 0;
```

**If No Data:**
1. Add hours via dashboard for test business
2. Verify display on frontend
3. Test "Open Now" logic

**Time Estimate:** 2 hours

---

### 6. Remove or Complete Ghost Features

**Option A: Remove from Navigation**
```typescript
// Remove competitor-ads from dashboard nav
// File: src/app/dashboard/layout.tsx or navigation config
```

**Option B: Build Minimal UI**
- Create simple listing page
- Add create/edit forms
- Link to existing backend

**Recommendation:** Remove for now, add to roadmap

**Time Estimate:** 30 minutes (removal) OR 1 day (build UI)

---

## 📋 MEDIUM PRIORITY (Before Launch)

### 7. Verify TypeScript Compilation
```bash
# Clean build
rm -rf .next
rm -rf node_modules/.cache

# Reinstall and typecheck
npm ci
npm run typecheck
```

**Time Estimate:** 30 minutes

---

### 8. Build Production Bundle
```bash
# After fixing lint and tests
npm run build

# Verify bundle size
du -sh .next

# Test production locally
npm start
```

**Expected:** Build should complete without errors
**Time Estimate:** 15 minutes

---

### 9. Manual QA Testing Checklist

**Public Site:**
- [ ] Homepage loads with real data
- [ ] Search finds businesses
- [ ] Filters work correctly
- [ ] Business detail pages display all info
- [ ] Review submission works
- [ ] Review voting works

**Authentication:**
- [ ] Signup creates user profile
- [ ] Login works
- [ ] Password reset flow works
- [ ] Logout clears session

**Dashboard (Pro User):**
- [ ] Can view owned business
- [ ] Can edit business profile
- [ ] Can upload logo/cover/gallery
- [ ] Can reply to reviews
- [ ] Analytics display correctly
- [ ] Premium status shows correctly

**Admin Panel:**
- [ ] Can access all admin pages
- [ ] Can approve/reject claims
- [ ] Can moderate reviews
- [ ] Can edit businesses
- [ ] Can manage users

**Time Estimate:** 3-4 hours

---

## 🎯 DEPLOYMENT STEPS (After All Above Complete)

### Step 1: Final Verification
```bash
npm run lint          # Should pass
npm run typecheck     # Should pass
npm run test:unit     # Should pass (or acceptable failure rate)
npm run build         # Should complete
```

### Step 2: Environment Setup (Production)
1. Set all environment variables in hosting platform
2. Verify Supabase production instance
3. Configure email provider
4. Set up error monitoring

### Step 3: Deploy to Staging
```bash
# Vercel (recommended)
vercel --env=staging

# Or manual
npm run build
npm start
```

### Step 4: Staging QA
- Run full QA checklist on staging URL
- Test with production-like data volume
- Performance testing
- Security scanning

### Step 5: Production Deployment
```bash
# Vercel
vercel --prod

# Monitor for errors
```

### Step 6: Post-Launch Monitoring
- Watch error logs (first 24 hours)
- Monitor performance metrics
- Collect user feedback
- Plan iteration

---

## 📊 Time Estimates Summary

| Phase | Tasks | Time |
|-------|-------|------|
| **Today** | Critical blockers (1-3) | 3-5 hours |
| **This Week** | High priority (4-6) | 1-2 days |
| **Before Launch** | Medium priority (7-9) | 1 day |
| **Deployment** | Deploy + QA | 0.5 day |
| **TOTAL** | | **3-5 days** |

---

## 🎉 Success Criteria

**Definition of Done:**
- ✅ All critical blockers resolved
- ✅ Lint passes with 0 warnings
- ✅ TypeScript compiles without errors
- ✅ Tests pass (or documented acceptable failures)
- ✅ Production build succeeds
- ✅ Premium features properly gated
- ✅ Manual QA checklist 100% passed
- ✅ Deployed to staging and tested
- ✅ Production deployment successful
- ✅ Monitoring systems active

---

## 📞 Support

If blocked on any task:
1. Check existing documentation in `/docs`
2. Review error messages carefully
3. Search codebase for similar patterns
4. Ask for help with specific error details

**Documentation:**
- `DEPLOYMENT_INSTRUCTIONS.md` - Deployment guide
- `TESTING_GUIDE.md` - Testing instructions
- `PRODUCTION_DEPLOYMENT_CHECKLIST.md` - Full checklist

---

**Created:** February 16, 2026  
**Next Review:** After critical blockers resolved
