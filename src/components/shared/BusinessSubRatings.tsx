'use client';

import { Review } from '@/lib/types';
import { StarRating } from '@/components/shared/StarRating';
import { useMemo } from 'react';

type BusinessSubRatingsProps = {
  reviews: Review[];
};

export function BusinessSubRatings({ reviews }: BusinessSubRatingsProps) {
  const subRatingsAvg = useMemo(() => {
    if (!reviews || reviews.length === 0) {
      return null;
    }

    // Calculate averages for each sub-rating category
    const workLifeBalanceRatings = reviews
      .map(r => r.subRatings?.workLifeBalance)
      .filter(r => r !== undefined && r !== null) as number[];
    
    const managementRatings = reviews
      .map(r => r.subRatings?.management)
      .filter(r => r !== undefined && r !== null) as number[];
    
    const careerGrowthRatings = reviews
      .map(r => r.subRatings?.careerGrowth)
      .filter(r => r !== undefined && r !== null) as number[];
    
    const cultureRatings = reviews
      .map(r => r.subRatings?.culture)
      .filter(r => r !== undefined && r !== null) as number[];

    const avg = {
      workLifeBalance: workLifeBalanceRatings.length > 0 
        ? workLifeBalanceRatings.reduce((sum: number, val: number) => sum + val, 0) / workLifeBalanceRatings.length 
        : null,
      management: managementRatings.length > 0 
        ? managementRatings.reduce((sum: number, val: number) => sum + val, 0) / managementRatings.length 
        : null,
      careerGrowth: careerGrowthRatings.length > 0 
        ? careerGrowthRatings.reduce((sum: number, val: number) => sum + val, 0) / careerGrowthRatings.length 
        : null,
      culture: cultureRatings.length > 0 
        ? cultureRatings.reduce((sum: number, val: number) => sum + val, 0) / cultureRatings.length 
        : null,
    };

    // Check if any sub-rating exists
    const hasSubRatings = Object.values(avg).some(r => r !== null);
    
    return hasSubRatings ? avg : null;
  }, [reviews]);

  if (!subRatingsAvg) {
    return null;
  }

  return (
    <div className="mt-6 space-y-3">
      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
        Détails de la note
      </h4>
      
      <div className="space-y-2">
        {subRatingsAvg.workLifeBalance !== null && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Équilibre travail-vie privée</span>
            <div className="flex items-center gap-2">
              <StarRating rating={subRatingsAvg.workLifeBalance} readOnly size={14} />
              <span className="text-xs font-medium">{subRatingsAvg.workLifeBalance.toFixed(1)}</span>
            </div>
          </div>
        )}
        
        {subRatingsAvg.management !== null && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Management</span>
            <div className="flex items-center gap-2">
              <StarRating rating={subRatingsAvg.management} readOnly size={14} />
              <span className="text-xs font-medium">{subRatingsAvg.management.toFixed(1)}</span>
            </div>
          </div>
        )}
        
        {subRatingsAvg.careerGrowth !== null && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Évolution de carrière</span>
            <div className="flex items-center gap-2">
              <StarRating rating={subRatingsAvg.careerGrowth} readOnly size={14} />
              <span className="text-xs font-medium">{subRatingsAvg.careerGrowth.toFixed(1)}</span>
            </div>
          </div>
        )}
        
        {subRatingsAvg.culture !== null && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Culture d'entreprise</span>
            <div className="flex items-center gap-2">
              <StarRating rating={subRatingsAvg.culture} readOnly size={14} />
              <span className="text-xs font-medium">{subRatingsAvg.culture.toFixed(1)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}