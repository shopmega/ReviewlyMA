import { describe, expect, it } from 'vitest';

import { appendBusinessIdToHref, buildDashboardBusinessHref } from '@/lib/dashboard-business-routing';

describe('dashboard business routing helpers', () => {
  it('adds the selected business query to dashboard routes', () => {
    expect(buildDashboardBusinessHref('/dashboard', '', 'biz-2')).toBe('/dashboard?id=biz-2');
    expect(buildDashboardBusinessHref('/dashboard/companies', 'tab=all', 'biz-2')).toBe('/dashboard/companies?tab=all&id=biz-2');
  });

  it('switches business detail routes by pathname instead of query params', () => {
    expect(buildDashboardBusinessHref('/dashboard/business/biz-1', '', 'biz-2')).toBe('/dashboard/business/biz-2');
  });

  it('preserves non-business routes when no dashboard business context exists', () => {
    expect(buildDashboardBusinessHref('/profile', '', 'biz-2')).toBeNull();
    expect(appendBusinessIdToHref('/dashboard/avis', null)).toBe('/dashboard/avis');
  });

  it('appends the selected business id to dashboard navigation hrefs', () => {
    expect(appendBusinessIdToHref('/dashboard/avis', 'biz-2')).toBe('/dashboard/avis?id=biz-2');
    expect(appendBusinessIdToHref('/dashboard/avis?filter=pending', 'biz-2')).toBe('/dashboard/avis?filter=pending&id=biz-2');
    expect(appendBusinessIdToHref('/dashboard/business/biz-1', 'biz-2')).toBe('/dashboard/business/biz-1');
  });
});
