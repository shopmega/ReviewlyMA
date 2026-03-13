# Current Frontend UI Blueprint

## 1 Product Overview

This blueprint restructures the platform into a cohesive, hierarchy-driven product. It resolves the previous fragmentation by elevating Employer Discovery as the primary user mental model, integrating Referrals as a contextual layer within business discovery, and unifying the visual and routing architecture.

- App type: Employer intelligence platform (Discovery + Reviews + Salaries) with integrated Referral Marketplace and Professional SaaS tools.
- Primary public user goal: Discover employers, evaluate reputation (reviews/salaries), and connect via referrals.
- Primary business-owner goal: Manage reputation and acquire talent via a unified dashboard.
- Core architectural shift: Consolidation of duplicate routes, standardization of mobile navigation, and a unified Progressive Gating auth model.
- Main modules: Discovery (Home/Directory/Profiles), Intelligence (Salaries), Connections (Referrals), Professional Tools (Dashboard), Administration.
- Navigation style:
  - Public: Persistent top header with contextual Smart Search; discovery-first hierarchy.
  - Dashboard: Persistent left sidebar with business-switcher as the root anchor.
  - Admin: Dense left sidebar + global utility top bar.

## 2 Navigation Architecture

### Public Navigation

The navigation is simplified to prioritize the core loop: Search -> Evaluate -> Connect.

- Top Header (Desktop):
  - Left: Logo.
  - Center: Primary Nav Group (`Entreprises` | `Salaires` | `Referrals`).
  - Note: Categories and Cities moved to the directory page and footer to reduce cognitive load.
  - Right: Utility Group (`Search` icon | Theme Toggle | `Ecrire un avis` primary button | `Login` | `Pour les pros` secondary outline button).
- Mobile: Hamburger menu revealing a prioritized list: Search, Home, Businesses, Salaries, Referrals, Pro Landing, Login.

### Secondary And Contextual Navigation

- Business Profiles: Tabbed navigation (`Overview` | `Reviews` | `Salaries` | `Referrals`). This integrates referrals directly into the business context.
- Breadcrumbs: Implemented universally on all deep-content pages (Profiles, Categories, Cities, Admin sections) using a consistent `Home > Parent > Current` pattern.
- Footer: Four-column matrix maintained but reorganized to separate Discovery (Categories/Cities) from Resources (Blog/Reports) and Corporate (About/Legal).

### Dashboard Navigation

- Left Sidebar:
  - Top: Business Switcher (dropdown with search).
  - Core: Dashboard Home, Reviews, Messages, Profile Editor.
  - Growth: Premium, Advertising, Salary Benchmark.
  - Support: Help Center, Settings.
- Mobile: Collapsible drawer accessible via a persistent bottom action bar.

## 3 Page Inventory (Rationalized)

### Public Discovery And Business Profiles

Consolidated referral routes into business profiles to centralize intelligence.

- `Home` (`/`) - Discovery entry point.
- `Businesses` (`/businesses`) - Master directory.
- `Business detail` (`/businesses/[slug]`) - Unified profile with tabs for Overview, Reviews, Salaries, and Referrals.
- `Write review` (`/businesses/[slug]/review`) - Contextual review submission.
- `Categories hub` (`/categories`) - Sector browsing.
- `Category page` (`/categorie/[categorySlug]`) - Sector-specific directory.
- `Cities hub` (`/villes`) - Geographic browsing.
- `City page` (`/ville/[citySlug]`) - City-specific directory.
- `Top rated` (`/top-rated`) - Ranking page.
- `Recently added` (`/recently-added`) - Freshness feed.
- `Write a review` (`/review`) - Generic review flow (business picker first).

### Salary Intelligence

Unified all salary routes under `/salaires`. Legacy `/salary` routes deprecated/redirected.

- `Salary hub` (`/salaires`) - Benchmarks and trends.
- `Salary comparison` (`/salaires/comparaison`) - Workspace.
- `Share salary` (`/salaires/partager`) - Contribution flow.
- `Role/City detail` (`/salaires/[roleSlug]/[citySlug]`) - Canonical SEO landing page.

### Referrals Marketplace

Referrals act as a standalone feed but also link deeply into Business Profiles.

- `Referrals marketplace` (`/parrainages`) - Combined feed (Offers & Demands).
- `New referral offer` (`/parrainages/offre/new`) - Publication form.
- `New referral demand` (`/parrainages/demande/new`) - Publication form.
- `Referral inbox` (`/parrainages/messages`) - Unified messaging center.
- Removed: Standalone company referral routes (now handled via Business Profile tabs).

### Professional And Auth

- `Pro landing` (`/pro`) - B2B marketing (simplified URL from `/pour-les-pros`).
- `Claim flow` (`/claim`) - Business lookup and verification.
- `Login / Signup` (`/login`, `/signup`) - Unified auth screens.
- `User Profile` (`/profil`) - User account hub.

### Dashboard (Protected)

- `Dashboard home` (`/dashboard`) - Command center.
- `Dashboard reviews` (`/dashboard/avis`) - Review management.
- `Dashboard profile` (`/dashboard/etablissement`) - Unified profile editor (info, media, amenities).
- `Dashboard premium` (`/dashboard/premium`) - Subscription management.
- `Dashboard analytics` (`/dashboard/statistiques`) - Performance metrics.

### Admin

- `Admin home` (`/admin`) - KPI overview.
- `Admin moderation` (`/admin/moderation`) - Unified queue (Reviews, Salaries, Claims, Business Suggestions).
- `Admin businesses` (`/admin/etablissements`) - Business CMS.
- `Admin users` (`/admin/utilisateurs`) - User management.
- `Admin settings` (`/admin/parametres`) - Platform configuration.

## 4 Detailed Page Layouts

### Business Detail (The Core Unit)

Redesigned for mobile-first evaluation.

- Hero (Compact): Sticky top bar on mobile. High-res cover (slim) with overlaid Logo, Verification Badge, and Name. Rating summary prominent.
- Action Strip: Fixed bottom bar on mobile (Primary: `Write Review`, Secondary: `Save/Share`). Desktop: Horizontal strip below hero.
- Content Body:
  - Left Col (2/3): Trust Metrics Card -> Tabbed Content (Reviews as default, then Salaries, then Referrals) -> Similar Businesses.
  - Right Col (1/3): Sticky sidebar with Map, Contact Card, `Claim this business` CTA, and Ad Slot.
- Referrals Tab: Instead of a separate page, referrals for this company load as a filtered list within the tab context.

### Directory Listing Template

Consistent pattern for `/businesses`, `/categories`, and `/villes`.

- Header: Title + descriptive intro text.
- Search/Filter Bar: Sticky top bar on mobile containing Search input + Filter Toggle button.
- Layout: Two-column desktop (Filters left, Results right).
- Filters: Checkbox accordions for Category, City, Rating.
- Results: Card grid. Active filters appear as removable chips above the grid.
- Empty State: Illustration + Clear Filters CTA.

### Salary Intelligence Pages

- Hub: Hero with average salary trends -> Category cards -> Top roles list.
- Detail Page: Large KPI card (Avg Salary) -> Distribution Histogram -> `Compare` action -> Recent submissions list.
- Gating: The Distribution Histogram and Recent Submissions are behind a Soft Gate (blur with `Sign up to see details` overlay).

### Dashboard

- Shell: Consistent left sidebar.
- Home: Welcome banner -> Action Checklist (for example `Add your logo`) -> KPI Grid (`Views`, `Reviews`) -> Recent Activity feed.
- Review Management: Filter bar (`Replied` / `Unreplied`) -> Stacked list of Review Cards with inline `Reply` textarea.

## 5 Reusable UI Components

### Foundations

- `Button`: Variants (`Primary`, `Secondary`, `Ghost`, `Destructive`). Sizes (`Sm`, `Md`, `Lg`).
- `Input`: Text, Select, Search (with icon).
- `Card`: Base container.
  - Variant A (Public): Elevated shadow, `rounded-xl`, hover transform.
  - Variant B (Dashboard): Flat border, `rounded-lg`, minimal shadow.

### Composites

- `Business Card`: Optimized for scanning. Cover image (16:9), Logo overlap, Title, Rating stars (prominent), Location chip, `View` arrow.
- `Review Card`: Clean layout. User avatar/role header. Star rating. Review text. Interaction bar (`Helpful`, `Report`).
- `Stat Card`: For Dashboard/Admin. Icon + Label + Large Value + Trend indicator (up/down arrow).
- `Search Autocomplete`: Global component. Suggests Categories, Companies, and Roles simultaneously.
- `Gatekeeper Overlay`: Reusable component to lock premium content. Blurs background children, renders a centered `Unlock` card.

## 6 Data Presentation Patterns

- Business Data: Card-first for browsing; Hero + tabbed detail for deep viewing.
- User Content (Reviews/Salaries): List-based with heavy use of metadata chips (Role, Contract Type, City).
- Hierarchical Data (Categories/Cities): Grid of cards for top-level, list/table for drill-down.
- Gated Data: Consistent blur + CTA pattern. The user sees the shape of the data (for example a blurred chart) but must convert to see the values.

## 7 Design Language

- Typography: Inter (or IBM Plex Sans). Clear hierarchy: H1 (page titles), H2 (section headers), H3 (card titles), Body.
- Color System:
  - Primary: Blue-600 (Trust, CTAs).
  - Secondary: Amber-500 (Warnings, Highlights).
  - Neutral: Slate grays (Text, Borders).
  - Semantic: Green (Success), Red (Destructive/Error).
- Spacing: 8px grid system.
- Radius:
  - Public UI: Large radius (12px-16px) for a friendly, modern feel.
  - Dashboard UI: Medium radius (8px) for density and utility.
- Iconography: Lucide icons, 1.5px stroke, consistent sizing (16px, 20px, 24px).

## 8 Resolution Of Previous UX Issues

| Issue Area | Resolution Strategy |
| --- | --- |
| Global IA | Simplified top navigation by moving Categories and Cities to discovery hubs/footer. Distinct separation of User (Profile) vs Business (Dashboard) modes. |
| Route Architecture | Consolidated routes. `/salary` redirects to `/salaires`. Company referrals moved to `/businesses/[slug]/referrals`. |
| Auth/Gating Model | Implemented Progressive Gating: Soft-gate for reading (limited data), Hard-gate for contributing or detailed insights. |
| Mobile Layout | Business hero is now compact. Primary actions moved to a fixed bottom bar on mobile for thumb accessibility. |
| Component Consistency | Defined two distinct Card variants (Public vs Dashboard) but unified the underlying typography and color tokens. |
| Visual Interruptions | Ads are confined to specific slots (Sidebar rail, in-feed card at position 4) to minimize content disruption. |

## 9 Implementation Priorities

- Route Migration: Redirect legacy `/salary` and `/parrainages/entreprise` routes to the new canonical structures.
- Component Library: Build the Card variants and Gatekeeper Overlay first to support the new UI views.
- Business Profile Refactor: Implement the tabbed interface to house Reviews, Salaries, and Referrals in one shell.
- Mobile Navigation: Deploy the fixed bottom action bar on Business Detail pages.
