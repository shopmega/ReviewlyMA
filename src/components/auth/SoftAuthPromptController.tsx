'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SoftAuthDialog } from '@/components/auth/SoftAuthDialog';

const SESSION_SHOWN_KEY = 'soft_auth_shown_session_v1';
const DISMISS_UNTIL_KEY = 'soft_auth_dismiss_until_v1';
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const SCROLL_TRIGGER_RATIO = 0.35;

function isTargetPath(pathname: string): boolean {
  if (/^\/businesses\/[^/]+(?:\/reviews)?$/i.test(pathname)) return true;
  if (/^\/salary(?:\/|$)/i.test(pathname)) return true;
  if (/^\/salaires(?:\/|$)/i.test(pathname)) return true;
  return false;
}

function isExcludedPath(pathname: string): boolean {
  return (
    /^\/login$/i.test(pathname) ||
    /^\/signup$/i.test(pathname) ||
    /^\/admin(?:\/|$)/i.test(pathname) ||
    /^\/dashboard(?:\/|$)/i.test(pathname)
  );
}

export function SoftAuthPromptController() {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const syncAuth = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      setAuthStatus(error || !data.user ? 'unauthenticated' : 'authenticated');
    };

    syncAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setAuthStatus(session?.user ? 'authenticated' : 'unauthenticated');
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    // Always close prompt on auth pages or once user is authenticated.
    if (authStatus === 'authenticated' || (pathname && isExcludedPath(pathname))) {
      setOpen(false);
    }
  }, [pathname, authStatus]);

  useEffect(() => {
    if (!pathname) return;
    if (authStatus !== 'unauthenticated') return;
    if (isExcludedPath(pathname)) return;
    if (!isTargetPath(pathname)) return;

    const dismissedUntil = Number(localStorage.getItem(DISMISS_UNTIL_KEY) || '0');
    if (dismissedUntil > Date.now()) return;

    if (sessionStorage.getItem(SESSION_SHOWN_KEY) === '1') return;
    if (open) return;

    const tryTriggerByScroll = () => {
      const documentEl = document.documentElement;
      const scrollTop = window.scrollY || documentEl.scrollTop || 0;
      const scrollable = Math.max(documentEl.scrollHeight - window.innerHeight, 0);
      if (scrollable <= 0) return;

      const ratio = scrollTop / scrollable;
      if (ratio >= SCROLL_TRIGGER_RATIO) {
        setOpen(true);
        sessionStorage.setItem(SESSION_SHOWN_KEY, '1');
      }
    };

    tryTriggerByScroll();
    window.addEventListener('scroll', tryTriggerByScroll, { passive: true });
    window.addEventListener('resize', tryTriggerByScroll);

    return () => {
      window.removeEventListener('scroll', tryTriggerByScroll);
      window.removeEventListener('resize', tryTriggerByScroll);
    };
  }, [pathname, authStatus, open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (open && !nextOpen) {
      localStorage.setItem(DISMISS_UNTIL_KEY, String(Date.now() + DISMISS_COOLDOWN_MS));
    }
    setOpen(nextOpen);
  };

  if (!pathname || authStatus !== 'unauthenticated') return null;

  return (
    <SoftAuthDialog
      open={open}
      onOpenChange={handleOpenChange}
      nextPath={pathname}
      intent="scroll_soft_prompt"
      title="Profitez de plus de fonctionnalites avec un compte gratuit"
      description="Connectez-vous pour voter, suivre les entreprises, publier un salaire ou gerer vos interactions."
    />
  );
}
