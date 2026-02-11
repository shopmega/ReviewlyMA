'use client';

import { StarRating } from '@/components/shared/StarRating';

interface ReviewSubRatingsProps {
  subRatings?: {
    workLifeBalance?: number;
    management?: number;
    careerGrowth?: number;
    culture?: number;
  };
}

export function ReviewSubRatings({ subRatings }: ReviewSubRatingsProps) {
  // Don't render if no sub-ratings or all are 0
  if (!subRatings || Object.values(subRatings).every(rating => !rating)) {
    return null;
  }

  const hasValidRatings = Object.values(subRatings).some(rating => rating && rating > 0);

  if (!hasValidRatings) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-muted/20 rounded-xl border border-border/30">
      <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
        Détails de l'évaluation
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {subRatings.workLifeBalance && subRatings.workLifeBalance > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Équilibre travail-vie privée</span>
            <div className="flex items-center gap-1">
              <StarRating rating={subRatings.workLifeBalance} readOnly size={14} />
              <span className="text-xs font-medium">{subRatings.workLifeBalance.toFixed(1)}</span>
            </div>
          </div>
        )}
        
        {subRatings.management && subRatings.management > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Management</span>
            <div className="flex items-center gap-1">
              <StarRating rating={subRatings.management} readOnly size={14} />
              <span className="text-xs font-medium">{subRatings.management.toFixed(1)}</span>
            </div>
          </div>
        )}
        
        {subRatings.careerGrowth && subRatings.careerGrowth > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Évolution de carrière</span>
            <div className="flex items-center gap-1">
              <StarRating rating={subRatings.careerGrowth} readOnly size={14} />
              <span className="text-xs font-medium">{subRatings.careerGrowth.toFixed(1)}</span>
            </div>
          </div>
        )}
        
        {subRatings.culture && subRatings.culture > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Culture d'entreprise</span>
            <div className="flex items-center gap-1">
              <StarRating rating={subRatings.culture} readOnly size={14} />
              <span className="text-xs font-medium">{subRatings.culture.toFixed(1)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
