import { describe, expect, it } from 'vitest';
import { hasSufficientSampleSize, MIN_PUBLIC_SAMPLE_SIZE } from '@/lib/salary-policy';

describe('salary-policy', () => {
  it('uses a fixed k-anonymity threshold', () => {
    expect(MIN_PUBLIC_SAMPLE_SIZE).toBe(5);
  });

  it('returns false for null/undefined/low counts', () => {
    expect(hasSufficientSampleSize(undefined)).toBe(false);
    expect(hasSufficientSampleSize(null)).toBe(false);
    expect(hasSufficientSampleSize(0)).toBe(false);
    expect(hasSufficientSampleSize(4)).toBe(false);
  });

  it('returns true for threshold and above', () => {
    expect(hasSufficientSampleSize(5)).toBe(true);
    expect(hasSufficientSampleSize(42)).toBe(true);
  });
});

