'use client';

import { useEffect } from 'react';

function parseCookieBoolean(name: string): boolean | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!match) return null;
  const value = decodeURIComponent(match[1]).trim().toLowerCase();
  if (value === 'true' || value === '1' || value === 'yes' || value === 'granted') return true;
  if (value === 'false' || value === '0' || value === 'no' || value === 'denied') return false;
  return null;
}

function parseStorageBoolean(key: string): boolean | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return null;
    const value = raw.trim().toLowerCase();
    if (value === 'true' || value === '1' || value === 'yes' || value === 'granted') return true;
    if (value === 'false' || value === '0' || value === 'no' || value === 'denied') return false;
  } catch {
    return null;
  }
  return null;
}

function resolveConsentState(): boolean | null {
  const cookieKeys = ['tracking_consent', 'cookie_consent', 'analytics_consent'];
  for (const key of cookieKeys) {
    const parsed = parseCookieBoolean(key);
    if (parsed !== null) return parsed;
  }

  const storageKeys = ['tracking_consent', 'cookie_consent', 'analytics_consent'];
  for (const key of storageKeys) {
    const parsed = parseStorageBoolean(key);
    if (parsed !== null) return parsed;
  }

  return null;
}

export function TrackingConsentBridge() {
  useEffect(() => {
    const consent = resolveConsentState();
    if (consent === null) return;

    window.dispatchEvent(
      new CustomEvent('avis:tracking-consent', {
        detail: consent
          ? {
              analytics_storage: 'granted',
              ad_storage: 'granted',
              ad_user_data: 'granted',
              ad_personalization: 'granted',
            }
          : {
              analytics_storage: 'denied',
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
            },
      }),
    );
  }, []);

  return null;
}
