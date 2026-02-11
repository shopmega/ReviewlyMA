# User Role & Premium Features Comparison

## Summary: User vs Pro vs Premium

| Feature/Aspect | **User** | **Pro** | **Pro + Premium** |
|---|---|---|---|
| **Role in DB** | `role: 'user'` | `role: 'pro'` | `role: 'pro'` + `is_premium: true` |
| **Access Level** | Regular user | Company owner/manager | Company owner with premium perks |
| **Dashboard Access** | ❌ No | ✅ Yes | ✅ Yes |
| **Company ID** | `NULL` | Set to business_id | Set to business_id |

---

## 🔐 ACCESS CONTROL & GATING

### Middleware Protection (`/src/lib/supabase/middleware.ts`)

#### Admin Routes (`/admin/*`)
```typescript
✅ Allowed: role === 'admin'
❌ Blocked: Any other role
↪️ Redirect: → / (home)
```

#### Dashboard Routes (`/dashboard/*`)
```
Route: /dashboard/*

IF user.role === 'user':
  ✅ Allow access to /dashboard/pending (show pending status)
  ✅ If has approved claim → allow dashboard access
  ✅ If has pending claim → redirect to /dashboard/pending
  ❌ If no claim → redirect to /pour-les-pros

IF user.role === 'pro':
  ✅ Allow full dashboard access IF business_id exists
  ❌ Block if no business_id → redirect to /pour-les-pros

IF user.role !== 'admin' AND user.role !== 'pro':
  ❌ Block → redirect to /pour-les-pros
```

#### Special Case: `/dashboard/pending`
- No premium check
- Shows pending claim status
- Allows user to wait for admin approval

---

## 📊 FEATURE BREAKDOWN

### 1. Dashboard - Main Page (`/dashboard/page.tsx`)
```
✅ Pro users can access

Features available to ALL pro users:
- Business name display
- Business statistics
- Quick links to sections
- No premium gating
```

### 2. Dashboard - Reviews (`/dashboard/reviews/page.tsx`)
```
✅ Pro users can access
✅ View all reviews for their business
✅ Reply to reviews (ALL pro users can do this)

NO PREMIUM GATING - This is a pro feature, not premium
```

### 3. Dashboard - Updates/Announcements (`/dashboard/updates/page.tsx`)
```
✅ Pro users can access
✅ Publish announcements
✅ Edit announcements
✅ Delete announcements

NO PREMIUM GATING - This is a pro feature, not premium
```

### 4. Dashboard - Analytics (`/dashboard/analytics/page.tsx`)
```
Check: isPremium = profile?.is_premium || false

✅ Pro users see:
  - Basic stats (total reviews, average rating, profile views)
  - Card headers visible

❌ Pro (non-premium) users see:
  - Advanced charts BLOCKED with overlay
  - Blur effect + "Analyses Avancées" paywall
  - Blur effect + "Distribution Détaillée" paywall
  - Lock icon on UI

✅ Pro + Premium users see:
  - Full analytics including:
    - Monthly review trends (bar chart)
    - Rating distribution (chart)
  - All advanced features unlocked
```

### 5. Dashboard - Messages (`/dashboard/messages/page.tsx`)
```
Check: isPremium = profile?.is_premium || false

✅ Pro users see:
  - Page title with Lock icon
  - "Messagerie Premium" overlay
  - Message area blurred out
  - CTA: "Passer à Premium" button

❌ Pro (non-premium) users:
  - Cannot access messaging features
  - Full page blocked behind paywall

✅ Pro + Premium users:
  - Can send/receive direct messages
  - Feature fully unlocked
```

### 6. Dashboard - Widget (`/dashboard/widget/page.tsx`)
```
✅ All pro users can access
✅ Get widget embed code
✅ Instructions to install widget

NO PREMIUM GATING
```

### 7. Business Profile Page (`/businesses/[slug]/page.tsx`)
```
Display premium badge:
  IF business.is_premium:
    Show: <Zap icon> "Établissement Premium"
    
This is for display only - doesn't restrict access
All users can view premium businesses
```

### 8. Business Cards (`/components/shared/BusinessCard.tsx`)
```
IF business.is_premium:
  Show premium badge on card

This is cosmetic only - doesn't restrict access
```

---

## 📈 PREMIUM FEATURE MATRIX

| Feature | User | Pro | Pro + Premium |
|---------|------|-----|--------------|
| **View businesses** | ✅ | ✅ | ✅ |
| **Write reviews** | ✅ | ✅ | ✅ |
| **Dashboard access** | ❌ | ✅ | ✅ |
| **Reply to reviews** | ❌ | ✅ | ✅ |
| **Post announcements** | ❌ | ✅ | ✅ |
| **View analytics (basic)** | ❌ | ✅ | ✅ |
| **View analytics (advanced)** | ❌ | ❌ | ✅ |
| **Direct messaging** | ❌ | ❌ | ✅ |
| **Widget code** | ❌ | ✅ | ✅ |

---

## 🔄 HOW ROLES ARE ASSIGNED

### User → Pro Conversion
1. User claims a business via `/claim` page
2. Admin reviews claim in `/admin/revendications`
3. Admin clicks "Approve" button
4. `updateClaimStatus('approved')` is called
5. **Result:**
   - `profiles.role` → `'pro'`
   - `profiles.business_id` → business ID
   - **NOT automatically premium**

### Adding Premium Status
1. Admin goes to `/admin/utilisateurs` (users management)
2. Admin clicks dropdown menu on user
3. Admin selects "Passer Premium" or "Retirer Premium"
4. `toggleUserPremium(userId, isPremium)` is called
5. **Result:**
   - `profiles.is_premium` → `true` or `false`
   - If user has a business: `businesses.is_premium` → same value

---

## ⚠️ CURRENT ISSUES & OBSERVATIONS

### Issue 1: Admin Claiming Pages
When an admin claims a page:
- Admin is already `role: 'admin'`
- Creates a new user profile or updates existing
- Profile might get set as both 'admin' AND 'premium'
- **Root cause:** Admin actions might be setting is_premium incorrectly

**Files involved:**
- `/src/app/actions/claim-admin.ts` (line 77-82) - Only sets role to 'pro', NOT admin
- Check if there's separate logic adding is_premium

### Issue 2: Business Deletion
When a business is deleted:
```typescript
// From: /src/app/actions/admin.ts (line 324-327)
await serviceClient
    .from('profiles')
    .update({ business_id: null, role: 'user' })
    .eq('business_id', businessId);
```

**What happens:**
- ✅ business_id → NULL
- ✅ role → 'user'
- ⚠️ is_premium → **PRESERVED** (unchanged)

**Impact:**
- Pro users lose their pro status
- But keep premium status (if they had it)
- They become regular users with premium perks (inconsistent state)

### Issue 3: No Premium Self-Service
Currently, only admins can set premium status
- No payment gateway integrated
- Users cannot upgrade themselves
- Premium is admin-only feature

---

## 🎯 GATING IMPLEMENTATION PATTERNS

### Pattern 1: Component-Level Gating (Most Common)
```typescript
// In dashboard pages
const isPremium = profile?.is_premium || false;

if (!isPremium) {
  return <PaywallOverlay />;
}

return <PremiumFeature />;
```

**Used in:**
- `/dashboard/analytics/page.tsx`
- `/dashboard/messages/page.tsx`

### Pattern 2: Middleware Route Gating
```typescript
// In middleware.ts
if (request.nextUrl.pathname.startsWith('/dashboard')) {
  if (!roleData?.role === 'pro') {
    redirect('/pour-les-pros');
  }
}
```

**Used for:**
- `/admin/*` routes
- `/dashboard/*` routes

### Pattern 3: Database-Level Gating (None Currently)
- No RLS policies checking is_premium
- Security risk: Someone could modify profile in DB

---

## 🚀 RECOMMENDED FIXES

### 1. Fix Business Deletion
Update to preserve consistent state:

```typescript
// Current (bad)
await serviceClient
    .from('profiles')
    .update({ business_id: null, role: 'user' })
    .eq('business_id', businessId);

// Better
await serviceClient
    .from('profiles')
    .update({ 
      business_id: null, 
      role: 'user',
      is_premium: false  // Remove premium too
    })
    .eq('business_id', businessId);
```

### 2. Add RLS Policy for Premium Features
```sql
-- Prevent non-premium users from accessing premium data
CREATE POLICY "Premium users only for analytics"
ON business_analytics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_premium = true
  )
);
```

### 3. Clarify Admin Premium Assignment
- Document when/why admins assign premium
- Add audit log for premium toggle
- Consider requiring reason/notes

### 4. Add Premium Payment Flow
- Integrate payment processor (Stripe, etc.)
- Add self-service premium purchase
- Auto-set is_premium on successful payment

---

## 🔍 FILES TO REVIEW

### Core Logic
- `/src/lib/supabase/middleware.ts` - Route protection
- `/src/app/actions/admin.ts` - Role/premium changes
- `/src/app/actions/claim-admin.ts` - Claim approval

### Feature Gating
- `/src/app/dashboard/analytics/page.tsx` - Premium analytics
- `/src/app/dashboard/messages/page.tsx` - Premium messaging
- `/src/hooks/useBusinessProfile.ts` - Profile loading

### UI Components
- `/src/components/shared/BusinessCard.tsx` - Premium badge display
- `/src/app/(admin)/admin/utilisateurs/page.tsx` - Admin user management

---

## 📋 QUICK REFERENCE

### Profile Fields
```typescript
type Profile = {
  id: string;              // User ID
  email: string;
  full_name: string;
  role: 'user' | 'pro' | 'admin';
  is_premium: boolean;     // Only used for pro users
  business_id?: string;    // Only for pro users
  suspended?: boolean;
  created_at: string;
};
```

### Business Fields
```typescript
type Business = {
  id: string;
  name: string;
  is_premium?: boolean;    // Display badge
  // ... other fields
};
```

---

## ✅ SUMMARY

**User Role System:**
- 3 roles: `user`, `pro`, `admin`
- `is_premium` only meaningful for `pro` role
- Premium is separate from role assignment

**Feature Gating:**
- Pro features behind `/dashboard` middleware check
- Premium features behind `is_premium` component check
- No payment integration yet

**Security:**
- Middleware protects routes ✅
- Component-level gating used ✅
- No RLS policies for premium ❌
- No audit logging ❌

