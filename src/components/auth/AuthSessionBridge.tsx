'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

function hasServerAuthCookie() {
  return document.cookie
    .split(';')
    .some((cookie) => /sb-[^=]+-auth-token=/.test(cookie.trim()));
}

export function AuthSessionBridge() {
  useEffect(() => {
    const supabase = createClient();

    const repairSessionCookie = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session || hasServerAuthCookie()) {
          return;
        }

        await supabase.auth.refreshSession();
      } catch {
        // Best-effort repair only.
      }
    };

    void repairSessionCookie();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        void repairSessionCookie();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
