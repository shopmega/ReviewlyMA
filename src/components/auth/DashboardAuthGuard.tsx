'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface DashboardAuthGuardProps {
  children: React.ReactNode;
  requireProAccess?: boolean;
  allowedPaths?: string[];
}

export function DashboardAuthGuard({
  children,
  requireProAccess = true,
  allowedPaths = ['/dashboard/pending', '/dashboard/premium'],
}: DashboardAuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          router.push(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }

        setHasSession(true);
      } catch (sessionError) {
        console.error('Dashboard session check failed:', sessionError);
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
      } finally {
        setIsLoading(false);
      }
    }

    void checkSession();
  }, [pathname, router, requireProAccess, allowedPaths]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking session...</p>
        </div>
      </div>
    );
  }

  if (!hasSession) {
    return null;
  }

  return <>{children}</>;
}
