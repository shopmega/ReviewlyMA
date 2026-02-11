# Avis.ma - Technical Debt & Codebase Audit (January 2026)

## 1. Executive Summary
The codebase is generally well-structured using Next.js 14 App Router and Supabase. However, there are significant areas of code duplication in the Dashboard logic and scalability concerns regarding the "Public Filters" implementation.

**Health Score:** 7/10
**Critical Issues:** 0
**High Priority Issues:** 2 (Duplicated Auth Logic, Client-Side Filtering)

## 2. Redundancies & Code Duplication
### 🔴 High Priority: Dashboard Auth & Data Fetching
**Location:** `src/app/dashboard/(analytics|updates|widget)/page.tsx`
**Issue:**
There is near-identical logic repeated across 3+ files to:
1.  Check current user session.
2.  Fetch user profile.
3.  Verify `business_id` existence.
4.  Handle loading/error states.

**Risk:**
If the auth logic changes (e.g., adding a new role check), it must be updated in multiple places. Inconsistent error handling (e.g., one page redirecting, another showing an alert) degrades UX.

**Recommendation:**
Refactor into a custom hook: `useBusinessProfile()`.

```typescript
// Proposed Hook Signature
const { business, loading, error } = useBusinessProfile();
```

## 3. Scalability & Performance (Deadends in Logic)
### 🟠 Medium Priority: Public Filters (Business List)
**Location:** `src/components/shared/BusinessList.tsx`
**Issue:**
The filtering logic (`search`, `category`, `type`) happens entirely on the **client-side**. The page fetches *all* businesses (`getBusinesses()`) and then filters them in memory.
*   **Current State:** Works fine for < 100 businesses.
*   **Future State:** Will crash the browser or cause massive TTI (Time to Interactive) delays with 1000+ businesses.

**Recommendation:**
Move filtering to the server-side (Supabase query params).

## 4. Race Conditions & Stability
### 🟡 Low Priority: Layout Overlaps
**Status**: ✅ Fixed
**Issue:** Dashboard Sidebar overlapped with the sticky Header.
**Fix**: Added `mt-16` and height calculation to `src/app/dashboard/layout.tsx`.

### 🟡 Low Priority: Unmounted Component State Updates
**Location:** `src/app/dashboard/analytics/page.tsx`
**Issue:**
Async fetch calls (`fetchAnalytics`) set state without checking if the component is still mounted.
**Risk:**
Console warnings if user navigates away quickly. (Modern React minimizes the impact, but it's still best practice to handle).

## 5. Incomplete Implementations
### 🟠 Medium Priority: "Relevance" Sorting
**Location:** `src/components/shared/BusinessList.tsx`
**Issue:**
The 'Relevance' sort option is the default but has an empty implementation (`case 'relevance': break;`). It effectively does "random" (database order) sorting.


### 🟡 Low Priority: Missing Fallbacks
**Location:** `src/components/shared/BusinessWidget.tsx`
**Issue:** Code relies on `(business as any)` casting to handle `snake_case` vs `camelCase` discrepancies, implying the type definitions don't fully match the Supabase schema or Mock data.



### 🟡 Low Priority: Email Notifications
**Location:** `src/app/actions/email.ts`
**Issue:**
Emails are currently just logged to the console (`console.log`) instead of being sent via an SMTP or API provider (like Resend or SendGrid).
**Risk:**
Production users will not receive claim approvals or updates.
**Fix:**
Integrate an email service provider.

### 🟡 Low Priority: Bookmark & Share
**Location:** `src/components/shared/BusinessActions.tsx`
**Issue:**
- **Share:** Uses `navigator.share` which is good for mobile, but has a simple fallback `copyToClipboard` for desktop. No "Share to Social Media" buttons.
- **Bookmark (Save):** Displays a "Feature Coming Soon" toast. No backend implementation exists for saving favorites.
**Impact:**
Users expect these standard features to work.

### 🟡 Low Priority: Popular Searches
**Location:** `src/components/shared/HomeClient.tsx`
**Issue:**
The `popularSearches` array is hardcoded (`Restaurants à Casablanca`, `Salons de coiffure`, etc.).
**Impact:**
Does not reflect actual user behavior or trending businesses.

### 🟡 Low Priority: Pagination
**Location:** `src/components/shared/BusinessList.tsx`
**Issue:**
No pagination logic exists. The list renders *all* filtered businesses at once.
**Impact:**
Performance degradation as the database grows.

### 🟡 Low Priority: Forgot Password
**Location:** `src/app/forgot-password/page.tsx`
**Issue:**
The email sending logic is mocked (likely in `src/app/actions/auth.ts`) similar to the claim emails.
**Impact:**
Users cannot actually reset passwords in production without an email provider.

## 7. UX/UI Patterns & Enhancements
### 🔵 Enhancement: Carousel Tags (Mobile)
**Location:** `src/components/shared/HomeClient.tsx`
**Issue:**
- **Popular Searches:** Rendered as a multi-line wrapped list (`flex-wrap`).
- **Categories:** Rendered as a vertical grid (`grid-cols-2`) on mobile.
**Impact:** 
Pushing valuable content (like "Seasonal Collections") too far down the page on mobile devices.
**Recommendation:**
Replace static grids with a **Horizontal Scroll/Carousel** for tags and categories on mobile breakpoints to improve content density and modernization.

## 8. Next Actions
1.  **Refactor**: Create `useBusinessProfile` hook to clean up Dashboard pages.
2.  **Feature**: Implement proper Server-Side Filtering for businesses.
3.  **Feature**: Implement "Save/Bookmark" functionality (Database table `saved_businesses`).
4.  **UI/UX**: Convert Mobile Categories/Tags to Horizontal Carousels.
5.  **Integration**: Add real email sending logic.
