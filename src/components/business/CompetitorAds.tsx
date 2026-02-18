'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Target, Coins, ExternalLink } from 'lucide-react';
import { CompetitorAd } from '@/lib/types';
import { getActiveCompetitorAdsForBusiness, trackCompetitorAdEvent } from '@/lib/competitor-ads/server-actions';
import { useToast } from '@/hooks/use-toast';

interface CompetitorAdsProps {
  businessId: string;
  trackingEnabled?: boolean;
  className?: string;
}

const CompetitorAds: React.FC<CompetitorAdsProps> = ({ 
  businessId, 
  trackingEnabled = true,
  className = '' 
}) => {
  const [ads, setAds] = useState<CompetitorAd[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const viewerSessionIdRef = useRef<string>('');
  const trackedImpressionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storageKey = 'competitor_ad_viewer_session_id';
    const existing = window.localStorage.getItem(storageKey);
    if (existing) {
      viewerSessionIdRef.current = existing;
      return;
    }

    const generated = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(storageKey, generated);
    viewerSessionIdRef.current = generated;
  }, []);

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

  useEffect(() => {
    if (!trackingEnabled || ads.length === 0) return;

    for (const ad of ads) {
      const trackingKey = `${ad.id}:${businessId}`;
      if (trackedImpressionsRef.current.has(trackingKey)) continue;

      trackedImpressionsRef.current.add(trackingKey);
      void trackCompetitorAdEvent({
        adId: ad.id,
        targetBusinessId: businessId,
        eventType: 'impression',
        viewerSessionId: viewerSessionIdRef.current || undefined,
      });
    }
  }, [ads, businessId, trackingEnabled]);

  const handleAdClick = (ad: CompetitorAd) => {
    if (!trackingEnabled) return;
    void trackCompetitorAdEvent({
      adId: ad.id,
      targetBusinessId: businessId,
      eventType: 'click',
      viewerSessionId: viewerSessionIdRef.current || undefined,
    });
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
                
                <Button size="sm" variant="outline" asChild>
                  <a
                    href={`/businesses/${ad.advertiser_business_id}`}
                    onClick={() => handleAdClick(ad)}
                    className="inline-flex items-center"
                  >
                    Visiter <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
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
