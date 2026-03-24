'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Crown, Plus, Settings, Star, Store } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getUserPremiumStatus, setPrimaryBusiness } from '@/app/actions/premium';
import { useBusiness } from '@/contexts/BusinessContext';
import { buildDashboardBusinessHref } from '@/lib/dashboard-business-routing';
import type { SubscriptionTier } from '@/lib/types';

interface PremiumStatus {
  isPremium: boolean;
  maxBusinesses: number;
  subscriptionTier: SubscriptionTier;
  expiresAt?: string;
}

export default function MultiBusinessDashboard() {
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { allBusinesses, currentBusiness, switchBusiness, refreshBusinesses, isLoading: businessLoading } = useBusiness();

  useEffect(() => {
    async function loadData() {
      if (businessLoading) return;

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        const premium = await getUserPremiumStatus(user.id);
        setPremiumStatus(premium);

        const requestedBusinessId = searchParams.get('id');
        const activeBusinessId =
          (requestedBusinessId && allBusinesses.some((business) => business.id === requestedBusinessId)
            ? requestedBusinessId
            : null) ||
          currentBusiness?.id ||
          allBusinesses.find((business) => business.isPrimary)?.id ||
          allBusinesses[0]?.id ||
          '';

        setSelectedBusiness(activeBusinessId);
      } catch (error) {
        console.error('Error loading business dashboard data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load business dashboard data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [allBusinesses, businessLoading, currentBusiness?.id, router, searchParams, toast]);

  const syncDashboardRoute = (businessId: string) => {
    const nextHref = buildDashboardBusinessHref(pathname, searchParams.toString(), businessId);
    if (nextHref) {
      router.replace(nextHref);
    }
  };

  const handleSetPrimaryBusiness = async (businessId: string) => {
    setActionLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const result = await setPrimaryBusiness(user.id, businessId);
      if (result.status === 'success') {
        await switchBusiness(businessId);
        syncDashboardRoute(businessId);
        await refreshBusinesses();
        setSelectedBusiness(businessId);
        toast({
          title: 'Success',
          description: 'Primary business updated successfully',
        });
        return;
      }

      toast({
        title: 'Error',
        description: result.message,
        variant: 'destructive',
      });
    } catch (error) {
      console.error('Error setting primary business:', error);
      toast({
        title: 'Error',
        description: 'Failed to update primary business',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectBusiness = async (businessId: string) => {
    setSelectedBusiness(businessId);
    await switchBusiness(businessId);
    syncDashboardRoute(businessId);
  };

  const handleAddBusiness = () => {
    const maxBusinesses = premiumStatus?.maxBusinesses || 1;
    if (allBusinesses.length >= maxBusinesses) {
      toast({
        title: 'Business limit reached',
        description: `This account can manage up to ${maxBusinesses} business${maxBusinesses > 1 ? 'es' : ''}.`,
        variant: 'destructive',
      });
      return;
    }

    router.push('/claim');
  };

  if (loading || businessLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 w-3/4 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-200" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 rounded bg-gray-200" />
                  <div className="h-3 w-5/6 rounded bg-gray-200" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const maxBusinesses = premiumStatus?.maxBusinesses || 1;

  return (
    <div className="space-y-6">
      <Alert className="border-blue-200 bg-blue-50">
        <Crown className="h-4 w-4 text-blue-600" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <span className="font-medium">Limite d'entreprises</span>
            <span className="ml-2 text-sm text-muted-foreground">
              ({allBusinesses.length}/{maxBusinesses} entreprises)
            </span>
          </div>
        </AlertDescription>
      </Alert>

      {allBusinesses.length > 1 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Select active business
            </CardTitle>
            <CardDescription>
              Choose which business to manage. The rest of the dashboard will follow this selection.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Select value={selectedBusiness} onValueChange={(value) => void handleSelectBusiness(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a business" />
                </SelectTrigger>
                <SelectContent>
                  {allBusinesses.map((business) => (
                    <SelectItem key={business.id} value={business.id}>
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        {business.name}
                        {business.isPrimary ? (
                          <Badge variant="secondary" className="text-xs">
                            Primary
                          </Badge>
                        ) : null}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedBusiness && allBusinesses.find((business) => business.id === selectedBusiness)?.isPrimary !== true ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleSetPrimaryBusiness(selectedBusiness)}
                  disabled={actionLoading}
                >
                  Set as Primary
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {allBusinesses.map((business) => (
          <Card key={business.id} className={`transition-all hover:shadow-lg ${selectedBusiness === business.id ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  <CardTitle className="text-lg">{business.name}</CardTitle>
                </div>
                {business.isPrimary ? (
                  <Badge variant="default" className="text-xs">
                    Primary
                  </Badge>
                ) : null}
              </div>
              <CardDescription>Role: {business.role}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 text-sm">
                  <div className="flex items-center gap-1" title="Note moyenne">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span>{business.overall_rating ? Number(business.overall_rating).toFixed(1) : 'N/A'}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={selectedBusiness === business.id ? 'default' : 'outline'}
                    onClick={() => void handleSelectBusiness(business.id)}
                    className="flex-1"
                  >
                    {selectedBusiness === business.id ? 'Active' : 'Select'}
                  </Button>

                  <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/business/${business.id}`)}>
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>

                {!business.isPrimary && allBusinesses.length > 1 ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleSetPrimaryBusiness(business.id)}
                    disabled={actionLoading}
                    className="w-full text-xs"
                  >
                    Make Primary
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}

        {allBusinesses.length < maxBusinesses ? (
          <Card className="cursor-pointer border-dashed border-2 transition-colors hover:border-primary" onClick={handleAddBusiness}>
            <CardContent className="flex h-full min-h-[200px] flex-col items-center justify-center">
              <Plus className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="font-semibold">Ajouter une entreprise</h3>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                {maxBusinesses > 1
                  ? `Ajouter une autre entreprise (${allBusinesses.length}/${maxBusinesses})`
                  : 'Chaque compte peut gerer un seul etablissement'}
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
