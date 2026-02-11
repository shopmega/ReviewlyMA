# Avis.ma - Dead Code, Gaps & Deadends Analysis

**Date**: January 29, 2026  
**Status**: Comprehensive Analysis Complete

---

## 📊 EXECUTIVE SUMMARY

This analysis identifies **unused code**, **feature gaps**, and **deadend paths** in the Avis.ma codebase. The project has excellent UI/UX but suffers from incomplete backend implementations and some unused components.

### Key Findings:
- **Unused Dependencies**: 3 packages not used in code
- **Unused Components**: 20+ components used only once or never
- **Missing Features**: 12 major functionality gaps
- **Placeholder Content**: 8 "Coming Soon" implementations
- **TODO/FIXME Count**: 7 technical debt items

---

## 🗑️ DEAD CODE ANALYSIS

### 1. Unused Dependencies
**Found by**: `depcheck` analysis

```bash
# Unused production dependencies
@genkit-ai/next        # AI integration placeholder
firebase               # Firebase integration (never used)
patch-package          # Patching dependencies (not needed)

# Unused dev dependencies
@vitejs/plugin-react   # Vite plugin (Next.js project)
@vitest/coverage-v8    # Test coverage (tests not fully implemented)
postcss                # CSS processing (handled by Tailwind)

# Missing dependencies
redis                  # Used in rate-limiter but not declared
web-vitals             # Used in performance hooks but not declared
puppeteer              # Used in simple-test.js but not declared
```

**Impact**: Bloats node_modules, increases install time, potential security risks

---

### 2. Unused/Underused Components

#### Components Used Only Once (Potential Dead Code)
These components are exported but only imported in one place, suggesting they might be:
- Over-engineered (should be inline)
- Candidates for deletion
- Need refactoring to be reusable

| Component | Usage Count | Location | Recommendation |
|-----------|-------------|----------|----------------|
| ActivityFeed | 1 | `src/app/dashboard/page.tsx` | ✅ Keep - Dashboard feature |
| AdminHeader | 1 | `src/app/(admin)/layout.tsx` | ✅ Keep - Admin layout |
| AdminSkeleton | 1 | `src/app/(admin)/admin/page.tsx` | ⚠️ Consider inline |
| BulkActions | 1 | `src/components/admin/BulkActions.tsx` | ⚠️ Check if used elsewhere |
| BusinessSidebar | 1 | `src/app/business/[id]/page.tsx` | ✅ Keep - Business page |
| CompetitorAds | 1 | `src/components/business/CompetitorAds.tsx` | ⚠️ Verify business value |
| ConsolidatedAnalytics | 1 | `src/app/dashboard/analytics/page.tsx` | ✅ Keep - Analytics feature |
| ConditionalFooter | 1 | `src/app/layout.tsx` | ✅ Keep - Layout logic |
| DeleteReviewDialog | 1 | `src/components/reviews/DeleteReviewDialog.tsx` | ✅ Keep - Review management |
| FollowButton | 1 | `src/components/business/FollowButton.tsx` | ✅ Keep - Business feature |
| PhotoLightbox | 1 | `src/components/shared/PhotoLightbox.tsx` | ✅ Keep - Gallery feature |
| RatingDistribution | 1 | `src/components/reviews/RatingDistribution.tsx` | ✅ Keep - Reviews feature |
| SearchAutocomplete | 1 | `src/components/shared/SearchAutocomplete.tsx` | ✅ Keep - Search feature |
| ShareButton | 1 | `src/components/business/ShareButton.tsx` | ✅ Keep - Sharing feature |
| SubRatingInput | 1 | `src/components/reviews/SubRatingInput.tsx` | ✅ Keep - Review feature |
| collapsible | 1 | UI component library | ✅ Keep - ShadCN component |
| menubar | 1 | UI component library | ✅ Keep - ShadCN component |
| popover | 1 | UI component library | ✅ Keep - ShadCN component |
| toaster | 1 | UI component library | ✅ Keep - ShadCN component |

#### Components Never Used (Dead Code)
| Component | File Path | Recommendation |
|-----------|-----------|----------------|
| AdComponent | `src/components/ads/AdComponent.tsx` | 🗑️ DELETE - No ad system implemented |
| BusinessHero | `src/components/business/BusinessHero.tsx` | 🗑️ DELETE - Not imported anywhere |
| SponsoredResults | `src/components/search/SponsoredResults.tsx` | 🗑️ DELETE - No sponsorship system |
| MonitoringProvider | `src/components/providers/MonitoringProvider.tsx` | ⚠️ Check if needed for analytics |
| GoogleAnalytics | `src/components/shared/GoogleAnalytics.tsx` | ⚠️ Check if used in AnalyticsConfig |
| HomeClient | `src/app/page-client.tsx` | 🗑️ DELETE - Not imported |
| PremiumFeatureGate | `src/components/shared/PremiumFeatureGate.tsx` | ⚠️ Check if premium features implemented |
| BusinessWidgetServer | `src/components/business/BusinessWidgetServer.tsx` | ⚠️ Check widget implementation status |
| SubRatingBar | `src/components/reviews/SubRatingBar.tsx` | 🗑️ DELETE - Not used, SubRatingInput exists |
| Breadcrumb | `src/components/shared/Breadcrumb.tsx` | ⚠️ Check if breadcrumb navigation needed |
| BreakingNewsBar | `src/components/shared/BreakingNewsBar.tsx` | 🗑️ DELETE - No news system |
| AnalyticsChart | `src/components/analytics/AnalyticsChart.tsx` | ⚠️ Check if used in analytics dashboard |
| Test Files | `src/components/**/*test.tsx` | ⚠️ Keep if implementing tests later |

---

## ⚠️ FUNCTIONALITY GAPS

### 1. **Pro User Signup - Completely Broken**
**Severity**: 🔴 CRITICAL  
**Location**: `/src/app/pour-les-pros/signup/page.tsx`

**Issue**: Form has no backend connection
```tsx
<form className="space-y-4">  // ❌ No action prop
  <Input id="fullName" />
  <Button type="submit">Créer mon compte</Button>  // ❌ Does nothing
</form>
```

**Missing**:
- Server action for signup
- Business claim creation
- Pro role assignment
- Email verification flow

---

### 2. **Updates/Announcements - No Backend**
**Severity**: 🔴 CRITICAL  
**Location**: `/src/app/dashboard/updates/page.tsx`

**Issue**: Form has UI but no submission handler
```tsx
<Button>
  <Megaphone className="mr-2"/>
  Publier  // ❌ No onClick handler
</Button>
```

**Missing**:
- Server action `submitUpdate()`
- Database table for updates
- Update publishing logic

---

### 3. **Widget Embedding - Broken**
**Severity**: 🔴 CRITICAL  
**Location**: `/src/app/dashboard/widget/page.tsx`

**Issues**:
- Hardcoded business ID: `const MOCK_BUSINESS_ID = 'bimo-cafe';`
- Copy button has no functionality
- No actual widget generation

**Missing**:
- Dynamic business ID fetching
- Copy-to-clipboard implementation
- Widget code generation endpoint

---

### 4. **Business Claims Not Linked to Users**
**Severity**: 🔴 CRITICAL  
**Location**: `/src/app/(admin)/admin/revendications/page.tsx`

**Issue**: Claims can be approved but don't link user to business
```tsx
// Only updates claim status, no user-business linking
await supabase.from('business_claims').update({ status }).eq('id', id);
```

**Missing**:
- Logic to update `profiles.business_id`
- Role assignment to 'pro'
- Dashboard access linking

---

### 5. **Business Hours - Missing Implementation**
**Severity**: 🟠 HIGH  
**Location**: Multiple files

**Issues**:
- `hours: [] // TODO: Add hours to DB schema` (in data.ts)
- No `business_hours` table
- No hours management UI
- No hours display on business pages

**Missing**:
- Database schema
- CRUD operations for hours
- Business edit form fields
- Display components

---

### 6. **Admin User Management - Partial**
**Severity**: 🟠 HIGH  
**Location**: `/src/app/(admin)/admin/utilisateurs/page.tsx`

**Missing Handlers**:
```tsx
<DropdownMenuItem>
  <Shield className="mr-2 h-4 w-4" />
  Changer le rôle  // ❌ No handler
</DropdownMenuItem>

<DropdownMenuItem className="text-destructive">
  Suspendre le compte  // ❌ No handler
</DropdownMenuItem>
```

**Missing**:
- Role change functionality
- Account suspension logic
- User deactivation workflows

---

### 7. **Admin Business Management - Partial**
**Severity**: 🟠 HIGH  
**Location**: `/src/app/(admin)/admin/etablissements/page.tsx`

**Missing**:
```tsx
<DropdownMenuItem className="text-destructive">
  Supprimer  // ❌ No handler
</DropdownMenuItem>
```

**Missing**:
- Business deletion confirmation
- Cascade deletion handling
- Data retention policies

---

### 8. **Messages System - Completely Missing**
**Severity**: 🟠 HIGH  
**Location**: `/src/app/dashboard/messages/page.tsx`

**Issue**: Placeholder only
```tsx
<Card>
  <CardTitle>Bientôt disponible</CardTitle>
  <p>La messagerie directe sera bientôt disponible ici.</p>
</Card>
```

**Missing Entire Feature**:
- Messages database tables
- Real-time messaging
- Conversation threads
- Message notifications
- Contact form integration

---

### 9. **Analytics Placeholders**
**Severity**: 🟡 MEDIUM  
**Location**: `/src/app/dashboard/analytics/page.tsx`

**Issues**:
```tsx
{ name: 'Vues du profil', value: '--', change: 'Bientôt' },
{ name: 'Leads générés', value: '--', change: 'Bientôt' },
```

**Missing**:
- View tracking implementation
- Lead capture tracking
- Analytics logging service
- Database schema for metrics

---

### 10. **Maintenance Mode Not Enforced**
**Severity**: 🟡 MEDIUM  
**Location**: `/src/app/(admin)/admin/parametres/page.tsx`

**Issue**: Setting exists but middleware doesn't check it
```tsx
const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
// Settings saved but never checked in middleware
```

**Missing**:
- Middleware enforcement
- User redirect logic
- Admin bypass mechanism

---

### 11. **Role-Based Access Control (Incomplete)**
**Severity**: 🟠 HIGH  
**Location**: `/src/lib/supabase/middleware.ts`

**Issue**: Middleware doesn't verify user roles
```tsx
// Just passes through - no role verification
if (request.nextUrl.pathname.startsWith('/_next')) {
  return supabaseResponse;
}
```

**Missing**:
- Admin role verification
- Pro role verification
- Unauthorized redirect logic

---

### 12. **Email Service Integration - Partial**
**Severity**: 🟡 MEDIUM  
**Location**: Multiple files

**Issues**:
- TODO comments: `// TODO: Integrate with email service`
- `console.log` instead of actual sending
- No production email provider

**Missing**:
- Email service provider (SendGrid/Resend)
- Template system
- Delivery status tracking
- Error handling

---

## 🚫 DEADENDS & BROKEN FLOWS

### 1. **Pro Dashboard Access Deadend**
**Flow**: User claims business → Admin approves → User still can't access dashboard
**Reason**: Claims don't update user role/business linking
**Impact**: User gets stuck with no recourse

### 2. **Verification Code Resend - Missing**
**Location**: Claim verification flow
**Issue**: No "Resend Code" button if user doesn't receive email
**Impact**: Users permanently stuck if email fails

### 3. **Business Updates - No Edit/Delete**
**Issue**: Once posted, updates can't be edited or deleted
**Missing**: Update management CRUD operations

### 4. **Category Management - Limited**
**Issue**: Categories can be added/removed in admin, but:
- No category icons management
- No subcategory validation
- No orphaned business cleanup

### 5. **Premium Subscription Deadend**
**Issue**: 
- UI has premium badges/pricing
- Backend logic exists (tier field, RLS)
- But no subscription purchase flow

### 6. **Import System Unused**
**Location**: `/src/app/(admin)/admin/etablissements/import/csv-import-form.tsx`
**Issue**: Full import system exists but unclear if connected to database
**Impact**: Administrative bulk import might not work

### 7. **Settings Auto-close Toast Notification**
**Location**: `/src/lib/onboarding.ts`
**Issue**: Toast notification auto-closes after 3 seconds, user might miss it
**Impact**: Users don't see important onboarding steps

### 8. **Business Gallery Upload - Sequential**
**Issue**: Files uploaded one-by-one instead of parallel
**Performance**: 5 files = 10 seconds upload time
**Impact**: Poor user experience during claim submission

---

## 📋 PLACEHOLDER CONTENT

### Pages Showing "Coming Soon"
1. `/src/app/dashboard/messages/page.tsx` - "Bientôt disponible"
2. `/src/app/dashboard/analytics/page.tsx` - "Bientôt" for metrics
3. `/src/app/dashboard/support/page.tsx` - Basic support form only
4. Various admin pages with placeholder metrics

### Components with Placeholder Text
- Analytics dashboard metrics showing "--"
- "Bientôt" labels for unimplemented features
- Generic "Coming Soon" cards

---

## 🛠️ RECOMMENDATIONS

### Immediate Fixes (High Priority)
1. **Remove Unused Dependencies**
   ```bash
   npm uninstall @genkit-ai/next firebase patch-package
   npm uninstall -D @vitejs/plugin-react @vitest/coverage-v8 postcss
   npm install redis web-vitals puppeteer
   ```

2. **Delete Unused Components**
   - `AdComponent`
   - `BusinessHero`
   - `SponsoredResults`
   - `HomeClient`
   - `SubRatingBar`
   - `BreakingNewsBar`

3. **Implement Critical Backend Connections**
   - Pro signup form submission
   - Updates/announcements backend
   - Widget copy functionality
   - Claims → user linking

### Medium Priority
4. **Complete Admin Functionality**
   - User role change
   - Account suspension
   - Business deletion

5. **Implement Missing Features**
   - Business hours system
   - Messages system
   - Analytics tracking

### Long-term Improvements
6. **Add Proper Testing**
   - Unit tests for utility functions
   - Integration tests for critical flows
   - E2E tests for user journeys

7. **Improve Error Handling**
   - Replace console statements with proper logging
   - Add error boundaries to all pages
   - Implement structured error reporting

8. **Complete Documentation**
   - Inline code comments
   - API documentation
   - Deployment guides

---

## 📊 IMPACT ASSESSMENT

| Category | Count | Severity | Estimated Fix Time |
|----------|-------|----------|-------------------|
| Unused Dependencies | 3 | Low | 1 hour |
| Unused Components | 8 | Low-Medium | 2-3 hours |
| Critical Gaps | 4 | High | 8-10 hours |
| High Priority Gaps | 4 | High | 6-8 hours |
| Medium Priority Gaps | 4 | Medium | 4-6 hours |
| Deadend Flows | 8 | Medium | 5-7 hours |
| Placeholder Content | 8 | Low | 2-3 hours |

**Total Estimated Time**: 28-38 hours for complete cleanup

---

## ✅ QUICK WINS (1-2 hours each)

1. ✅ Remove unused dependencies
2. ✅ Delete clearly unused components
3. ✅ Add copy-to-clipboard to widget
4. ✅ Fix sequential gallery uploads (parallel)
5. ✅ Add "Resend Code" functionality
6. ✅ Implement admin user role change
7. ✅ Add maintenance mode middleware check

---

## 📝 CONCLUSION

The Avis.ma codebase has:
- **Excellent UI/UX foundation** with ShadCN components
- **Strong architecture** with good separation of concerns
- **Significant backend gaps** preventing full functionality
- **Some dead code** that can be safely removed
- **Clear path to completion** with prioritized action items

**Next Steps**:
1. Start with dependency/component cleanup (low risk)
2. Implement critical backend connections (high impact)
3. Address admin functionality gaps
4. Complete missing features incrementally

The project is ~70% complete and can be fully functional with focused effort on the identified gaps.