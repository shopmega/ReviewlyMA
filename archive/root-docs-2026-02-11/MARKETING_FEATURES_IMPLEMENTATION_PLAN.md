# Marketing Features Implementation Plan

## Overview
This document outlines the implementation plan for features that are described in marketing materials but are missing or not fully implemented in the Avis.ma application. The goal is to bridge the gap between marketing promises and actual functionality.

## Identified Gaps

### 1. Ad Removal on Business Pages (Major Gap)
**Marketing Promise**: "Suppression des pubs concurrentes" (Removal of competing ads) is prominently featured as a premium feature.

**Reality**: No actual ad removal functionality exists in the codebase.

### 2. Priority Placement in Search Results (Partially Implemented)
**Marketing Promise**: "Visibilité prioritaire" (Priority visibility) and "Votre entreprise apparaît en haut des recherches".

**Reality**: Basic implementation exists but lacks advanced features.

### 3. Enhanced Customer Support (Minimal Implementation)
**Marketing Promise**: "Support Prioritaire" (Priority Support).

**Reality**: No dedicated support channels implemented.

### 4. Content Pinning Feature (Incomplete)
**Marketing Promise**: "Contenu Épinglé" (Pinned Content).

**Reality**: No pinning functionality found.

### 5. Advanced Search/Filtering for Premium Visibility
**Marketing Promise**: Features like "Search Ads" and "Annonces Concurrentes".

**Reality**: No competitor ad system or advanced search algorithms implemented.

## Implementation Roadmap

### Phase 1: Core Infrastructure (Weeks 1-2)

#### Task 1: Implement Advertising System with Premium Ad-Blocking Capability
- Create ad inventory table in Supabase
- Implement ad serving logic
- Add premium ad-blocking functionality
- Create admin panel for ad management

**Files to modify/create:**
- `supabase/migrations/add-advertising-system.sql`
- `src/lib/supabase/types.ts` (add Ad type)
- `src/app/admin/ads/page.tsx` (admin panel for ads)
- `src/components/ads/AdComponent.tsx` (ad display component)
- `src/lib/ads/server-actions.ts` (ad management functions)

#### Task 2: Create Support Ticket System for Premium Users
- Create tickets table in Supabase
- Implement ticket submission and management
- Add priority queue for premium users
- Create user interface for submitting tickets

**Files to modify/create:**
- `supabase/migrations/add-support-tickets.sql`
- `src/lib/supabase/types.ts` (add Ticket type)
- `src/app/support/page.tsx` (support ticket interface)
- `src/app/admin/tickets/page.tsx` (admin ticket management)
- `src/lib/tickets/server-actions.ts` (ticket management functions)

### Phase 2: Enhanced Features (Weeks 3-4)

#### Task 3: Enhance Search Algorithm with Premium Placement Features
- Implement bidding system for premium placement
- Add sponsored results section
- Create auction mechanics for search positions
- Update existing search functionality

**Files to modify:**
- `src/lib/data.ts` (update search function)
- `src/components/search/SponsoredResults.tsx` (sponsored results component)
- `src/app/dashboard/advertising/page.tsx` (premium placement dashboard)

#### Task 4: Create Content Pinning Feature for Premium Businesses
- Add pinning functionality to business profiles
- Implement sticky content display
- Create moderation for pinned content
- Add business dashboard controls

**Files to modify/create:**
- `supabase/migrations/add-content-pinning.sql`
- `src/lib/supabase/types.ts` (add PinnedContent type)
- `src/components/business/PinnedContent.tsx` (pinned content display)
- `src/app/dashboard/pinned-content/page.tsx` (pinning dashboard)

### Phase 3: Advanced Integration (Weeks 5-6)

#### Task 5: Implement Competitor Advertisement System
- Display premium businesses on competitor pages
- Implement cross-promotion features
- Create revenue sharing models
- Add analytics for competitor ads

**Files to modify/create:**
- `supabase/migrations/add-competitor-ads.sql`
- `src/components/business/CompetitorAds.tsx` (competitor ads display)
- `src/app/dashboard/competitor-ads/page.tsx` (competitor ad management)

#### Task 6: Improve /review Page Performance
- Add pagination and filtering
- Implement review sorting options
- Optimize database queries
- Add loading states

**Files to modify:**
- `src/app/review/page.tsx` (improve review page)
- `src/lib/data.ts` (add review filtering/sorting functions)

### Phase 4: Rating System Enhancement (Week 7)

#### Task 7: Implement Unused Rating Dimensions
- Add support for 'Détails (optionnel)', 'Service', 'Qualité', 'Q/P', and 'Ambiance'
- Update review submission forms
- Update review display components
- Update rating calculation algorithms

**Files to modify:**
- `src/components/reviews/ReviewForm.tsx` (enhanced rating form)
- `src/components/reviews/ReviewCard.tsx` (enhanced review display)
- `src/lib/data.ts` (update rating calculations)

### Phase 5: Testing and Documentation (Week 8)

#### Task 8: Create Comprehensive Testing Suite
- Unit tests for new server actions
- Integration tests for ad system
- E2E tests for premium features
- Performance tests

#### Task 9: Document New Features
- Update marketing materials
- Create user guides for new features
- Update developer documentation
- Add feature release notes

## Database Schema Changes

### Ad Inventory Table
```sql
CREATE TABLE ads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  advertiser_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_business_ids UUID[],
  targeting_criteria JSONB,
  budget_cents INTEGER DEFAULT 0,
  spent_cents INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- Policies for ad creators
CREATE POLICY "Users can view their own ads" ON ads
  FOR SELECT USING (auth.uid() = advertiser_id);

CREATE POLICY "Users can create ads" ON ads
  FOR INSERT WITH CHECK (auth.uid() = advertiser_id);

CREATE POLICY "Users can update their ads" ON ads
  FOR UPDATE USING (auth.uid() = advertiser_id);

-- Policy for admins
CREATE POLICY "Admins can manage all ads" ON ads
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### Support Tickets Table
```sql
CREATE TABLE support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category VARCHAR(50),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Policies for ticket owners
CREATE POLICY "Users can view their own tickets" ON support_tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets" ON support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their tickets" ON support_tickets
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy for support staff (admins)
CREATE POLICY "Admins can manage all tickets" ON support_tickets
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### Pinned Content Table
```sql
CREATE TABLE pinned_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  media_urls TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pinned_content ENABLE ROW LEVEL SECURITY;

-- Policies for business owners
CREATE POLICY "Business owners can view their pinned content" ON pinned_content
  FOR SELECT USING (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Business owners can create pinned content" ON pinned_content
  FOR INSERT WITH CHECK (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Business owners can update their pinned content" ON pinned_content
  FOR UPDATE USING (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));

-- Policy for admins
CREATE POLICY "Admins can manage all pinned content" ON pinned_content
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

## Implementation Details

### Ad Blocking for Premium Users
The ad blocking functionality will be implemented by checking user subscription status in the middleware and components:

```typescript
// In ad display components
const showAds = !user?.is_premium || user.tier === 'pro';

// Or for business pages specifically
const showCompetingAds = !business.is_premium;
```

### Priority Placement Algorithm
The search algorithm will be enhanced to include sponsored results while maintaining fairness:

```typescript
// Enhanced search with sponsored results
const query = baseQuery
  .select('*')
  .or(`tier.lte.${userTier},is_sponsored.eq.true`)  // Include sponsored items regardless of tier
  .order('is_sponsored', { ascending: false })      // Sponsored items first
  .order('tier', { ascending: false })              // Then by tier
  .order('is_premium', { ascending: false })        // Then premium status
  .order('overall_rating', { ascending: false });   // Finally by rating
```

## Success Metrics
- Increase in premium subscriptions due to fulfilled marketing promises
- Improved user satisfaction scores
- Higher engagement with new features
- Better conversion rates from free to premium

## Timeline
- Total estimated duration: 8 weeks
- Phase 1: Weeks 1-2 (Core infrastructure)
- Phase 2: Weeks 3-4 (Enhanced features)
- Phase 3: Weeks 5-6 (Advanced integration)
- Phase 4: Week 7 (Rating system enhancement)
- Phase 5: Week 8 (Testing and documentation)

## Budget Considerations
- Development time: 8 weeks of engineering effort
- Potential infrastructure costs for ad serving
- Analytics and monitoring tools
- Possible third-party integrations for support system