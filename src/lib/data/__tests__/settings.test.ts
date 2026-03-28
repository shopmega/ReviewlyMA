import { describe, expect, it } from 'vitest';
import { getDefaultSettings, normalizeSiteSettings } from '../settings';

describe('site settings normalization', () => {
  it('provides verification method defaults without retired runtime flags', () => {
    const defaults = getDefaultSettings();

    expect(defaults.verification_methods).toEqual(['email', 'phone', 'document', 'video']);
    expect('premium_enabled' in defaults).toBe(false);
    expect('enable_messaging' in defaults).toBe(false);
    expect('enable_interviews' in defaults).toBe(false);
    expect('default_language' in defaults).toBe(false);
    expect('require_email_verification' in defaults).toBe(false);
  });

  it('normalizes verification methods from persisted settings', () => {
    const normalized = normalizeSiteSettings({
      enable_claims: true,
      verification_methods: ['email', 'video', '', 'phone'] as any,
    });

    expect(normalized.verification_methods).toEqual(['email', 'video', 'phone']);
  });

  it('filters unsupported premium payment methods from persisted settings', () => {
    const normalized = normalizeSiteSettings({
      payment_methods_enabled: ['bank_transfer', 'paypal', 'stripe', 'chari_ma'] as any,
    });

    expect(normalized.payment_methods_enabled).toEqual(['bank_transfer', 'chari_ma']);
  });
});
