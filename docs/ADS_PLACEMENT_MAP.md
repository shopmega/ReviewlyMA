# Ads Placement Map

This document maps internal ad placements to routes/components.

## Placement IDs

- `home_top_banner`
- `directory_top_banner`
- `directory_inline`
- `business_profile_inline`
- `business_profile_sidebar`
- `referrals_top_banner`
- `referrals_inline`
- `referrals_detail_sidebar`
- `salary_page_top_banner`
- `salary_page_inline`
- `salary_compare_top_banner`
- `salary_role_city_inline`
- `salary_sector_city_inline`
- `salary_share_top_banner`

## Route Mapping

- `/`:
  - `home_top_banner`

- `/businesses`
- `/categorie/[categorySlug]`
- `/ville/[citySlug]`
- `/ville/[citySlug]/[categorySlug]`:
  - `directory_top_banner`
  - `directory_inline`

- `/businesses/[slug]`:
  - `business_profile_inline`
  - `business_profile_sidebar`
  - Context passed: `businessId`

- `/parrainages`
- `/parrainages/ville/[citySlug]`
- `/parrainages/poste/[roleSlug]`
- `/parrainages/entreprise/[companySlug]`:
  - `referrals_top_banner`
  - `referrals_inline`

- `/parrainages/demandes`:
  - `referrals_top_banner`
  - `referrals_inline`

- `/parrainages/[id]`:
  - `referrals_detail_sidebar`

- `/parrainages/demandes/[id]`:
  - `referrals_detail_sidebar`

- `/salaires`:
  - `salary_page_top_banner`
  - `salary_page_inline`

- `/salaires/comparaison`:
  - `salary_compare_top_banner`

- `/salaires/role/[roleSlug]/[citySlug]`:
  - `salary_role_city_inline`
  - Context passed: `roleSlug`, `citySlug`

- `/salaires/secteur/[sectorSlug]/[citySlug]`:
  - `salary_sector_city_inline`
  - Context passed: `sectorSlug`, `citySlug`

- `/salaires/partager`:
  - `salary_share_top_banner`

## Targeting Fields (Dashboard)

Configured in `/dashboard/advertising` via `targeting_criteria` + `target_business_ids`:

- `placements: string[]`
- `salary.citySlugs: string[]`
- `salary.roleSlugs: string[]`
- `salary.sectorSlugs: string[]`
- `cta_url: string`
- `cta_label: string`
- `target_business_ids: string[]`

## Notes

- If `placements` is empty, ads are eligible across all placements.
- `target_business_ids` filtering only applies where `businessId` context is provided.
- Salary filters only apply where salary context is provided (`citySlug`, `roleSlug`, `sectorSlug`).
