'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Target, Coins, ExternalLink } from 'lucide-react';
import { CompetitorAd } from '@/lib/types';
import { getActiveCompetitorAdsForBusiness } from '@/lib/competitor-ads/server-actions';
import { useToast } from '@/hooks/use-toast';

interface CompetitorAdsProps {
  businessId: string;
  className?: string;
}

const CompetitorAds: React.FC<CompetitorAdsProps> = ({ 
  businessId, 
  className = '' 
}) => {
  const [ads, setAds] = useState<CompetitorAd[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadCompetitorAds();
  }, [businessId]);

  const loadCompetitorAds = async () => {
    setLoading(true);
    const result = await getActiveCompetitorAdsForBusiness(businessId);
    if (result.success) {
      setAds(result.ads || []);
    } else {
      toast({
        title: 'Erreur',
        description: result.error || 'Impossible de charger les annonces concurrentes',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  if (loading || ads.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Badge variant="secondary" className="bg-red-100 text-red-800">
          Annonces Concurrentes
        </Badge>
        <span className="text-sm text-muted-foreground">Suggestions d'autres entreprises</span>
      </div>
      
      <div className="space-y-4">
        {ads.map((ad) => (
          <Card 
            key={ad.id} 
            className="border-red-200 bg-gradient-to-br from-red-50 to-pink-50 hover:shadow-md transition-shadow"
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-red-600" />
                <CardTitle className="text-lg font-semibold text-gray-900">{ad.title}</CardTitle>
                <Badge variant="outline" className="text-xs bg-red-100 border-red-300 ml-auto">
                  Annonce
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 mb-3">{ad.content}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    <span>Budget: {(ad.budget_cents / 100).toFixed(2)} MAD</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Coins className="h-3 w-3" />
                    <span>Dépensé: {(ad.spent_cents / 100).toFixed(2)} MAD</span>
                  </div>
                </div>
                
                <Button size="sm" variant="outline">
                  Visiter <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CompetitorAds;