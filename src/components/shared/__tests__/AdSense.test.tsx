import { afterEach, describe, expect, it } from 'vitest';
import { AdSense } from '@/components/shared/AdSense';

describe('AdSense rendering logic', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_ADSENSE_PUB_ID;
  });

  it('returns a script element for valid enabled config', () => {
    const element = AdSense({ enabled: true, autoAdsEnabled: true, pubId: 'ca-pub-1234567890' });
    expect(element).not.toBeNull();
    expect((element as any).props.src).toBe(
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890'
    );
  });

  it('normalizes pub-* format to ca-pub-*', () => {
    const element = AdSense({ enabled: true, autoAdsEnabled: true, pubId: 'pub-1234567890' });
    expect((element as any).props.src).toBe(
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890'
    );
  });

  it('uses NEXT_PUBLIC_ADSENSE_PUB_ID fallback', () => {
    process.env.NEXT_PUBLIC_ADSENSE_PUB_ID = 'ca-pub-999999';
    const element = AdSense({ enabled: true, autoAdsEnabled: true });
    expect((element as any).props.src).toBe(
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-999999'
    );
  });

  it('returns null when disabled', () => {
    expect(AdSense({ enabled: false, autoAdsEnabled: true, pubId: 'ca-pub-123' })).toBeNull();
  });

  it('returns null when auto ads is disabled', () => {
    expect(AdSense({ enabled: true, autoAdsEnabled: false, pubId: 'ca-pub-123' })).toBeNull();
  });

  it('returns null for invalid ids', () => {
    expect(AdSense({ enabled: true, autoAdsEnabled: true, pubId: 'ca-pub-XXXXXXXXXXXXXXXX' })).toBeNull();
    expect(AdSense({ enabled: true, autoAdsEnabled: true, pubId: 'not-a-pub-id' })).toBeNull();
  });
});
