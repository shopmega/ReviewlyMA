import { describe, expect, it } from 'vitest';
import {
  getEffectiveTier,
  getMaxBusinessesForTier,
  hasEffectivePaidAccess,
  hasEffectiveTierAccess,
  hasTierAccess,
  isPaidTier,
} from '@/lib/tier-utils';

describe('tier-utils', () => {
  it('resolves the highest available tier between profile and business', () => {
    expect(getEffectiveTier('standard', 'gold')).toBe('gold');
    expect(getEffectiveTier('growth', 'standard')).toBe('growth');
    expect(getEffectiveTier(null, null)).toBe('standard');
  });

  it('grants access based on the effective tier', () => {
    expect(hasEffectiveTierAccess('gold', 'standard', 'gold')).toBe(true);
    expect(hasEffectiveTierAccess('growth', 'standard', 'growth')).toBe(true);
    expect(hasEffectiveTierAccess('gold', 'growth', 'growth')).toBe(false);
  });

  it('treats paid access as coming from either profile or business tier', () => {
    expect(hasEffectivePaidAccess('standard', 'growth')).toBe(true);
    expect(hasEffectivePaidAccess('gold', 'standard')).toBe(true);
    expect(hasEffectivePaidAccess('standard', 'standard')).toBe(false);
  });

  it('preserves direct tier helpers and business limits', () => {
    expect(hasTierAccess('growth', 'gold')).toBe(true);
    expect(isPaidTier('gold')).toBe(true);
    expect(getMaxBusinessesForTier('gold')).toBe(5);
  });
});
