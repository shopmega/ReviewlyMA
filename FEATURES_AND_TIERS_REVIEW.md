
# 🕵️ Features & Tiers Enforcement Review

## 1. Feature Inconsistencies & Dead Ends

### 🚨 Critical Dead Ends
1.  **Business Hours (Database vs UI)**
    *   **Dead End**: `BusinessCard.tsx` tries to display opening status, and `types.ts` defines `DayHours`, but there is **no table** or consistent column in the database for structured hours.
    *   **Impact**: Hours displayed are likely mocked or hardcoded, leading to user mistrust.
    *   **Fix**: Create `business_hours` table (1:N relation) and fully wire it.

2.  **Affiliate Links (Premium Feature)**
    *   **Dead End**: `Company` type has `affiliate_link`, but there is unlikely any tracking or dashboard view for clicks on this link.
    *   **Impact**: Pro users can't see the value (ROI) of this feature.
    *   **Fix**: Add click tracking to `business_analytics`.

3.  **"Updates" / "Annonces"**
    *   **Inconsistency**: We removed `/announcements` (public page), but `updates` (business posts) still exist in the schema.
    *   **Risk**: If these updates aren't shown on the Business Detail page, the feature is useless for Pros.
    *   **Action**: Verify `BusinessDetail` displays these updates.

## 2. Tier Feature Enforcement Gaps

| Feature | Tier Intended | Current State | Risk |
|---|---|---|---|
| **Affiliate Links** | 🌟 Pro Only | **Not Enforced**. Any business row can technically have this string. | Free users might get premium features if DB is edited manually. |
| **WhatsApp Button** | 🌟 Pro Only | **Not Enforced**. UI renders it if string exists. | Needs `is_premium` check in UI before rendering. |
| **Cover Photo** | 📈 Growth+ | **Not Enforced**. UI renders if URL exists. | Needs `tier != 'none'` check in UI. |
| **Competitor Ads** | 🌟 Pro Only | **Missing**. Schema exists (`competitor_ads`) but no UI to buy/configure them. | "Ghost feature" in database. |
| **Priority Support** | 🌟 Pro Only | **Manual**. No ticket system linkage to tier. | Ops burden. |

## 3. Hidden / "Ghost" Features
*   **`competitor_ads`**: Table exists, type exists, but no Dashboard UI found.
*   **`support_tickets`**: Type exists, but no user-facing form found.
*   **`pinned_content`**: Likely intended for Admins, but no UI found.

## 4. Recommendations for Next Sprint

1.  **Enforce UI Gates**: Wrap premium components (`BusinessCover`, `WhatsAppButton`, `AffiliateLink`) in a `<PremiumFeature tier="pro">` wrapper component to strictly enforce limits on the client side.
2.  **Clean Up Ghosts**: Hide `competitor_ads` mentions until it's actually built.
3.  **Fix Hours**: This is a basic directory feature that is currently broken/mocked. Priority #1 for data.

