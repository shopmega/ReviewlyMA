'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

export default function DashboardAuthTest() {
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated' | 'error'>('loading');
  const [accessStatus, setAccessStatus] = useState<'loading' | 'granted' | 'denied'>('loading');
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    async function testAuth() {
      try {
        const supabase = createClient();
        
        // Test 1: Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          setAuthStatus('unauthenticated');
          setAccessStatus('denied');
          return;
        }
        
        setAuthStatus('authenticated');
        setUserInfo({ id: user.id, email: user.email });
        
        // Test 2: Check dashboard access
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, business_id')
          .eq('id', user.id)
          .single();
        
        let hasAccess = false;
        
        if (profile?.role === 'pro' && profile?.business_id) {
          hasAccess = true;
        } else {
          const { data: approvedClaim } = await supabase
            .from('business_claims')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'approved')
            .maybeSingle();
          
          hasAccess = !!approvedClaim;
        }
        
        setAccessStatus(hasAccess ? 'granted' : 'denied');
        
      } catch (error) {
        console.error('Auth test error:', error);
        setAuthStatus('error');
        setAccessStatus('denied');
      }
    }
    
    testAuth();
  }, []);

  if (authStatus === 'loading' || accessStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Testing authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Dashboard Auth Test</h1>
          <p className="text-muted-foreground">Testing authentication and access control</p>
        </div>
        
        {/* Auth Status */}
        <div className={`p-4 rounded-lg border ${
          authStatus === 'authenticated' 
            ? 'bg-green-50 border-green-200' 
            : authStatus === 'unauthenticated'
            ? 'bg-red-50 border-red-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center gap-3">
            {authStatus === 'authenticated' && <CheckCircle className="h-5 w-5 text-green-600" />}
            {authStatus === 'unauthenticated' && <AlertTriangle className="h-5 w-5 text-red-600" />}
            {authStatus === 'error' && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
            <div>
              <p className="font-semibold">Authentication Status</p>
              <p className="text-sm text-muted-foreground capitalize">{authStatus}</p>
              {userInfo && (
                <p className="text-xs text-muted-foreground mt-1">
                  User: {userInfo.email}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Access Status */}
        <div className={`p-4 rounded-lg border ${
          accessStatus === 'granted' 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-3">
            {accessStatus === 'granted' ? (
              <Shield className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            <div>
              <p className="font-semibold">Dashboard Access</p>
              <p className="text-sm text-muted-foreground capitalize">{accessStatus}</p>
            </div>
          </div>
        </div>
        
        {/* Summary */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            {authStatus === 'authenticated' && accessStatus === 'granted' 
              ? '✅ Authentication and access control working correctly'
              : authStatus === 'unauthenticated'
              ? '🔒 Properly blocking unauthorized access'
              : '⚠️ Check authentication configuration'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
