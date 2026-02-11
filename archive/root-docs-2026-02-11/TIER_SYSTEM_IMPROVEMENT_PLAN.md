# Tier System Improvement Implementation Plan

## Overview
This document outlines the implementation plan for improving the `is_premium` and `tier` system according to the phased refactor approach.

## Phase 1: Strengthen Tier System (Immediate)

### 1.1 Update Feature Access Logic
Replace all `is_premium` checks with tier-based logic in key areas:

#### Current pattern:
```typescript
if (profile.is_premium) {
  // Grant premium access
}
```

#### New pattern:
```typescript
import { SubscriptionTier } from '@/lib/types';

function hasTierAccess(requiredTier: SubscriptionTier, userTier: SubscriptionTier): boolean {
  if (requiredTier === 'none') return true; // Everyone gets basic access
  if (requiredTier === 'growth') return userTier === 'growth' || userTier === 'pro';
  if (requiredTier === 'pro') return userTier === 'pro';
  return false;
}

// Usage
if (hasTierAccess('pro', profile.tier)) {
  // Grant pro tier access
}
```

### 1.2 Create Premium Feature Component
Create a reusable component to wrap premium features:

```tsx
// src/components/shared/PremiumFeatureGate.tsx
'use client';

import { useAuth } from '@/contexts/auth-context';
import { SubscriptionTier } from '@/lib/types';
import { ReactNode } from 'react';

interface PremiumFeatureGateProps {
  requiredTier: SubscriptionTier;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PremiumFeatureGate({ 
  requiredTier, 
  fallback = null, 
  children 
}: PremiumFeatureGateProps) {
  const { user, profile } = useAuth();

  if (!user || !profile) {
    return fallback;
  }

  const hasAccess = (() => {
    if (requiredTier === 'none') return true;
    if (requiredTier === 'growth') return ['growth', 'pro'].includes(profile.tier);
    if (requiredTier === 'pro') return profile.tier === 'pro';
    return false;
  })();

  return hasAccess ? <>{children}</> : <>{fallback};
}
```

### 1.3 Update Server-Side Access Checks
In server actions, update the access logic:

```typescript
// src/app/actions/premium.ts
export async function checkUserTierAccess(
  userId: string,
  requiredTier: SubscriptionTier
): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } } }
  );

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', userId)
    .single();

  if (!profile) return false;

  if (requiredTier === 'none') return true;
  if (requiredTier === 'growth') return ['growth', 'pro'].includes(profile.tier);
  if (requiredTier === 'pro') return profile.tier === 'pro';
  
  return false;
}
```

## Phase 2: Feature Gate Consolidation (Short-term)

### 2.1 Identify All Premium Components
Components that need tier-based protection:
- WhatsApp Button
- Affiliate Link
- Business Cover Photo
- Advanced Statistics
- Priority Support Request Form
- Lead Generation Tools
- Pinned Content Management

### 2.2 Update API Routes
Ensure API routes check tier before granting access:

```typescript
// Example API route with tier check
export async function POST(request: Request) {
  const { userId } = await requireAuth();
  
  const hasAccess = await checkUserTierAccess(userId, 'pro');
  if (!hasAccess) {
    return Response.json({ error: 'Pro tier required' }, { status: 403 });
  }
  
  // Proceed with pro-tier functionality
}
```

## Phase 3: Gradual Deprecation (Medium-term)

### 3.1 Code Cleanup
- Replace remaining `is_premium` checks with tier-based logic
- Update documentation to reflect new approach
- Add deprecation warnings for any remaining `is_premium` usage

### 3.2 Testing Strategy
- Unit tests for tier access logic
- Integration tests for premium features
- End-to-end tests for subscription flows

## Phase 4: Complete Migration (Long-term)

### 4.1 Final Migration
- Remove `is_premium` column after confirming no dependencies
- Remove sync triggers
- Simplify data models

## Implementation Timeline

### Week 1: Phase 1 Implementation
- [x] Create `PremiumFeatureGate` component
- [x] Update server-side access checks
- [x] Update key UI components with tier-based logic

### Week 2: Phase 2 Implementation  
- [x] Identify and update all premium components
- [ ] Update API routes with tier checks
- [ ] Add comprehensive testing

### Week 3-4: Testing and Validation
- [ ] Thorough testing of all tier-based features
- [ ] Fix any issues found during testing
- [ ] Document the new system

## Risk Mitigation
- Keep sync triggers active during transition
- Maintain backward compatibility where needed
- Thorough testing at each phase
- Rollback plan if critical issues arise