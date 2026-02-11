'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Store,
  Plus,
  Settings,
  Star,
  Eye,
  Crown,
  Users
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getUserBusinesses, setPrimaryBusiness, addBusinessToUser } from '@/app/actions/premium';

interface Business {
  id: string;
  name: string;
  role: string;
  isPrimary: boolean;
  overallRating: number;
  reviewCount: number;
}

interface PremiumStatus {
  isPremium: boolean;
  maxBusinesses: number;
  subscriptionTier: string;
  expiresAt?: string;
}

export default function MultiBusinessDashboard() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Load businesses and premium status
      const businessesData = await getUserBusinesses(user.id);

      setBusinesses(businessesData.businesses);
      setPremiumStatus({
        isPremium: businessesData.maxAllowed > 1,
        maxBusinesses: businessesData.maxAllowed,
        subscriptionTier: businessesData.maxAllowed > 1 ? 'premium' : 'basic'
      });

      // Set selected business to primary
      const primaryBusiness = businessesData.businesses.find(b => b.isPrimary);
      if (primaryBusiness) {
        setSelectedBusiness(primaryBusiness.id);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimaryBusiness = async (businessId: string) => {
    setActionLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const result = await setPrimaryBusiness(user.id, businessId);

      if (result.status === 'success') {
        await loadData();
        toast({
          title: 'Success',
          description: 'Primary business updated successfully'
        });
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error setting primary business:', error);
      toast({
        title: 'Error',
        description: 'Failed to update primary business',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddBusiness = () => {
    const maxBusinesses = premiumStatus?.maxBusinesses || 1;
    if (businesses.length >= maxBusinesses) {
      toast({
        title: 'Business limit reached',
        description: 'Each account can manage only one business.',
        variant: 'destructive'
      });
      return;
    }

    router.push('/claim');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
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
      {/* Premium Status Banner */}
      <Alert className="border-blue-200 bg-blue-50">
        <Crown className="h-4 w-4 text-blue-600" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <span className="font-medium">
              Limite d'entreprises
            </span>
            <span className="text-sm ml-2 text-muted-foreground">
              ({businesses.length}/{maxBusinesses} entreprises)
            </span>
          </div>
        </AlertDescription>
      </Alert>

      {/* Business Selector */}
      {businesses.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Select Active Business
            </CardTitle>
            <CardDescription>
              Choose which business to manage. Your dashboard will show data for the selected business.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a business" />
                </SelectTrigger>
                <SelectContent>
                  {businesses.map((business) => (
                    <SelectItem key={business.id} value={business.id}>
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        {business.name}
                        {business.isPrimary && (
                          <Badge variant="secondary" className="text-xs">
                            Primary
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedBusiness && businesses.find(b => b.id === selectedBusiness)?.isPrimary !== true && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetPrimaryBusiness(selectedBusiness)}
                  disabled={actionLoading}
                >
                  Set as Primary
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Business Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {businesses.map((business) => (
          <Card
            key={business.id}
            className={`transition-all hover:shadow-lg ${selectedBusiness === business.id ? 'ring-2 ring-primary' : ''
              }`}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  <CardTitle className="text-lg">{business.name}</CardTitle>
                </div>
                {business.isPrimary && (
                  <Badge variant="default" className="text-xs">
                    Primary
                  </Badge>
                )}
              </div>
              <CardDescription>
                Role: {business.role}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Quick Stats - We'll need to fetch these */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-1" title="Note Moyenne">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span>{business.overallRating ? Number(business.overallRating).toFixed(1) : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1" title="Nombre d'avis">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span>{business.reviewCount || 0} avis</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={selectedBusiness === business.id ? "default" : "outline"}
                    onClick={() => setSelectedBusiness(business.id)}
                    className="flex-1"
                  >
                    {selectedBusiness === business.id ? 'Active' : 'Select'}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/dashboard/business/${business.id}`)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>

                {!business.isPrimary && businesses.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSetPrimaryBusiness(business.id)}
                    disabled={actionLoading}
                    className="w-full text-xs"
                  >
                    Make Primary
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add Business Card */}
        {businesses.length < (premiumStatus?.maxBusinesses || 1) && (
          <Card
            className="border-dashed border-2 hover:border-primary transition-colors cursor-pointer"
            onClick={handleAddBusiness}
          >
            <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px]">
              <Plus className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold">Ajouter une entreprise</h3>
              <p className="text-sm text-muted-foreground text-center mt-2">
                {maxBusinesses > 1
                  ? `Ajouter une autre entreprise (${businesses.length}/${maxBusinesses})`
                  : 'Chaque compte peut gérer un seul établissement'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>

    </div>
  );
}
