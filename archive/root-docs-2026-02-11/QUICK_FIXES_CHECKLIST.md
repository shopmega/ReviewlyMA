# Quick Fixes Checklist - Avis.ma

## 🔴 CRITICAL - Must Fix Before Launch (Est. 8-10 hours)

### ☐ Pro User Signup (2 hours)
- [ ] Connect `/pour-les-pros/signup/page.tsx` form to server action
- [ ] Create `createProSignup()` action in `/src/app/actions/auth.ts`
- [ ] Create initial business record
- [ ] Create business claim record
- [ ] Test end-to-end signup flow

### ☐ Pro Claims → User Linking (2 hours)
- [ ] Update `/admin/revendications/page.tsx` approval handler
- [ ] When approved: Update `profiles.business_id` & `profiles.role = 'pro'`
- [ ] Send confirmation email to user
- [ ] Test claim approval redirects user to dashboard

### ☐ Updates/Announcements Form (2 hours)
- [ ] Add `submitUpdate()` server action
- [ ] Connect form in `/dashboard/updates/page.tsx`
- [ ] Store to `updates` table in database
- [ ] Refresh UI after successful submit
- [ ] Add validation & error handling

### ☐ Widget Functionality (2 hours)
- [ ] Make `/dashboard/widget/page.tsx` a client component
- [ ] Add copy-to-clipboard handler to button
- [ ] Fetch actual business ID from `profiles.business_id`
- [ ] Fix hardcoded "localhost:9002" → use env variable
- [ ] Test copy functionality

### ☐ Admin Role Checks (2 hours)
- [ ] Add role verification to middleware for `/admin` routes
- [ ] Add role check in admin page components
- [ ] Test unauthorized access is blocked
- [ ] Add proper error UI for unauthorized users

---

## 🟠 HIGH PRIORITY - Should Fix Soon (3-5 hours each)

### ☐ Admin User Management
**File**: `/src/app/(admin)/admin/utilisateurs/page.tsx`
- [ ] Implement "Changer le rôle" button handler (1 hour)
  - [ ] Add modal/dropdown to select new role
  - [ ] Update `profiles.role` in database
  - [ ] Refresh table after update
- [ ] Implement "Suspendre le compte" button handler (1 hour)
  - [ ] Add confirmation dialog
  - [ ] Update suspension status
  - [ ] Log admin action

### ☐ Admin Business Management
**File**: `/src/app/(admin)/admin/etablissements/page.tsx`
- [ ] Implement "Supprimer" button handler (1 hour)
  - [ ] Add delete confirmation modal
  - [ ] Delete from database
  - [ ] Handle cascade deletes (reviews, updates, etc)
  - [ ] Refresh table

### ☐ Business Hours Feature (4 hours)
- [ ] Create `business_hours` table in Supabase
  - Columns: `id, business_id, day, open_time, close_time, is_open`
- [ ] Add hours form to `/dashboard/edit-profile/page.tsx`
- [ ] Update `mapBusinessFromDB()` in `/src/lib/data.ts`
- [ ] Display hours on `/businesses/[slug]/page.tsx`
- [ ] Display hours on business widget

### ☐ Maintenance Mode Enforcement (2 hours)
**File**: `/src/lib/supabase/middleware.ts`
- [ ] Check `site_settings.maintenance_mode` in middleware
- [ ] If enabled and user not admin: show maintenance page
- [ ] Create maintenance page UI
- [ ] Test with mode enabled/disabled

---

## 🟡 MEDIUM PRIORITY - Nice to Have (2-3 hours each)

### ☐ Analytics Metrics
**File**: `/src/app/dashboard/analytics/page.tsx`
- [ ] Add `views_count` to businesses table
- [ ] Track page views on `/businesses/[slug]` page
- [ ] Display in analytics dashboard
- [ ] Add leads tracking (contact form submissions)

### ☐ Advanced Search/Filters
- [ ] Add category filter to home page
- [ ] Add rating filter to business list
- [ ] Add price range filter
- [ ] Add amenities filter
- [ ] Persist filter selections in URL

### ☐ Error Handling Polish
- [ ] Add error boundaries to all dashboard pages
- [ ] Standardize error messages
- [ ] Add retry buttons where appropriate
- [ ] Log errors to monitoring service

---

## 🟢 LOW PRIORITY - Polish (1 hour each)

### ☐ TypeScript Cleanup
- [ ] Replace `any` types with proper interfaces
- [ ] Add strict mode to tsconfig
- [ ] Fix TypeScript warnings

### ☐ UI Polish
- [ ] Disable non-functional buttons instead of showing them
- [ ] Add visual feedback when actions are pending
- [ ] Add toast notifications for all actions
- [ ] Improve loading states

### ☐ Documentation
- [ ] Add JSDoc comments to server actions
- [ ] Document database schema
- [ ] Add development guide to README

---

## Testing Checklist

### Pro User Flow
- [ ] Create account on `/pour-les-pros/signup`
- [ ] Verify business claim created as "pending"
- [ ] Admin approves claim in `/admin/revendications`
- [ ] User can access `/dashboard`
- [ ] User can see their business info

### Pro Dashboard
- [ ] User can edit profile and changes save
- [ ] User can post updates/announcements
- [ ] User can see analytics
- [ ] User can copy widget code
- [ ] User can respond to reviews

### Admin Functions
- [ ] Admin can see all businesses
- [ ] Admin can toggle featured status
- [ ] Admin can view users and change roles
- [ ] Admin can delete businesses (with confirmation)
- [ ] Admin can moderate reviews & reports
- [ ] Admin can change site settings
- [ ] Admin can see statistics

### Access Control
- [ ] Non-authenticated users cannot access `/dashboard`
- [ ] Non-pro users cannot access `/dashboard`
- [ ] Non-admin users cannot access `/admin`
- [ ] During maintenance mode: only admins can access site

---

## Deployment Checklist

Before deploying to production:

- [ ] All critical issues fixed
- [ ] All high priority issues fixed (or documented as known)
- [ ] Environment variables configured correctly
- [ ] Database migrations run
- [ ] All forms validate and submit correctly
- [ ] Error handling tested
- [ ] Mobile responsive tested
- [ ] Performance tested (lighthouse)
- [ ] Security audit completed
- [ ] User flows tested end-to-end

---

## Quick Reference: What's Broken?

| Feature | Status | Fix Time |
|---------|--------|----------|
| Pro signup | ❌ Broken | 2 hrs |
| Post updates | ❌ Broken | 2 hrs |
| Claims approval | ⚠️ Partial | 2 hrs |
| Widget copy | ❌ Broken | 1 hr |
| Admin user role change | ❌ Broken | 1 hr |
| Admin delete business | ❌ Broken | 1 hr |
| Business hours | ❌ Missing | 4 hrs |
| Messages | ❌ Missing | 6 hrs |
| Maintenance mode | ⚠️ Partial | 2 hrs |
| Role verification | ⚠️ Missing | 2 hrs |

**Total Critical Time: ~8-10 hours**
**Total All Issues: ~25-30 hours**

---

## Where to Start

1. **Day 1**: Fix pro signup + claims linking (2 people can work in parallel)
2. **Day 2**: Fix updates form + widget (simple wins)
3. **Day 3**: Add admin handlers + business hours
4. **Day 4**: Implement RBAC + maintenance mode
5. **Day 5+**: Polish, testing, deployment prep
