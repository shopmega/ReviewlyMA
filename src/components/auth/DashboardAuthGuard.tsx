'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface DashboardAuthGuardProps {
  children: React.ReactNode;
  requireProAccess?: boolean; // If true, requires pro role or approved claim
  allowedPaths?: string[]; // Paths that don't require pro access
}

export function DashboardAuthGuard({ 
  children, 
  requireProAccess = true,
  allowedPaths = ['/dashboard/pending', '/dashboard/premium']
}: DashboardAuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      try {
        const supabase = createClient();
        
        // 1. Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          console.error('AuthGuard: No authenticated user');
          router.push('/login?next=' + encodeURIComponent(pathname));
          return;
        }

        // 2. If pro access is not required or path is allowed, grant access
        if (!requireProAccess || allowedPaths.includes(pathname)) {
          setIsAuthorized(true);
          setIsLoading(false);
          return;
        }

        // 3. Check pro access requirements
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, business_id')
          .eq('id', user.id)
          .single();

        let hasAccess = false;

        // Check pro role and business_id
        if (profile?.role === 'pro' && profile?.business_id) {
          hasAccess = true;
        } else {
          // Check approved claims
          const { data: approvedClaim } = await supabase
            .from('business_claims')
            .select('id')
            .eq('user_id', user.id)
            .or('claim_state.eq.verified,status.eq.approved')
            .maybeSingle();

          if (approvedClaim) {
            hasAccess = true;
          } else {
            // Check pending claims
            const { data: pendingClaim } = await supabase
              .from('business_claims')
              .select('id')
              .eq('user_id', user.id)
              .or('claim_state.eq.verification_pending,status.eq.pending')
              .maybeSingle();

            if (pendingClaim && pathname !== '/dashboard/pending') {
              router.push('/dashboard/pending');
              return;
            } else if (!pendingClaim) {
              router.push('/pour-les-pros');
              return;
            } else {
              hasAccess = true; // Allow access to pending page
            }
          }
        }

        setIsAuthorized(hasAccess);

      } catch (error) {
        console.error('AuthGuard: Access check failed:', error);
        router.push('/login?next=' + encodeURIComponent(pathname));
      } finally {
        setIsLoading(false);
      }
    }

    checkAccess();
  }, [router, pathname, requireProAccess, allowedPaths]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Vérification de l'accès...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Redirect will happen in useEffect
  }

  return <>{children}</>;
}
