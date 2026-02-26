'use client';

import type { Review } from '@/lib/types';
import { useMemo } from 'react';
import { Star } from 'lucide-react';

type RatingDistributionProps = {
  reviews: Review[];
};

function getConfidenceLabel(totalReviews: number): string {
  if (totalReviews >= 60) return 'Confiance elevee';
  if (totalReviews >= 20) return 'Confiance moyenne';
  return 'Confiance en construction';
}

export function RatingDistribution({ reviews }: RatingDistributionProps) {
  const totalReviews = reviews.length;

  const { rows, average, positiveShare } = useMemo(() => {
    const counts = [5, 4, 3, 2, 1].map((rating) => ({ rating, count: 0 }));
    let weightedSum = 0;
    let positiveCount = 0;

    reviews.forEach((review) => {
      const normalized = Math.min(5, Math.max(1, Math.round(review.rating)));
      const row = counts.find((item) => item.rating === normalized);
      if (row) row.count += 1;
      weightedSum += review.rating;
      if (review.rating >= 4) positiveCount += 1;
    });

    return {
      rows: counts.map((row) => ({
        ...row,
        percentage: totalReviews > 0 ? (row.count / totalReviews) * 100 : 0,
      })),
      average: totalReviews > 0 ? weightedSum / totalReviews : 0,
      positiveShare: totalReviews > 0 ? Math.round((positiveCount / totalReviews) * 100) : 0,
    };
  }, [reviews, totalReviews]);

  if (totalReviews === 0) {
    return (
      <div className="w-full space-y-2 rounded-xl border border-border/60 bg-background/70 p-3">
        <h3 className="font-semibold text-sm">Repartition des avis</h3>
        <p className="text-xs text-muted-foreground">Aucun avis publie pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-xl border border-border/60 bg-background/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-sm">Repartition des avis</h3>
        <span className="text-[11px] font-semibold text-primary">{getConfidenceLabel(totalReviews)}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border/70 bg-background px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Moyenne</p>
          <p className="text-sm font-bold flex items-center gap-1">
            {average.toFixed(1)}
            <Star className="h-3.5 w-3.5 fill-current text-amber-500" />
          </p>
        </div>
        <div className="rounded-lg border border-border/70 bg-background px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Avis 4-5 etoiles</p>
          <p className="text-sm font-bold">{positiveShare}%</p>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.rating} className="grid grid-cols-[36px_1fr_48px] items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">{row.rating}★</span>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${row.percentage}%` }} />
            </div>
            <span className="text-[11px] text-right text-muted-foreground font-medium">{row.percentage.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

