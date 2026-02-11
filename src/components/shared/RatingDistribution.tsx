'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, LabelList } from 'recharts';
import type { Review } from '@/lib/types';
import { useMemo } from 'react';

type RatingDistributionProps = {
  reviews: Review[];
};

export function RatingDistribution({ reviews }: RatingDistributionProps) {
  const totalReviews = reviews.length;
  const ratingCounts = useMemo(() => {
    const counts = [
      { rating: 5, count: 0 },
      { rating: 4, count: 0 },
      { rating: 3, count: 0 },
      { rating: 2, count: 0 },
      { rating: 1, count: 0 },
    ];
    reviews.forEach(review => {
      const index = counts.findIndex(c => c.rating === Math.floor(review.rating));
      if (index !== -1) {
        counts[index].count++;
      }
    });
    return counts.map(c => ({...c, percentage: totalReviews > 0 ? (c.count / totalReviews) * 100 : 0 }));
  }, [reviews, totalReviews]);
  
  return (
    <div className="w-full space-y-2">
        <h3 className="font-semibold text-md">Répartition des avis</h3>
        <ResponsiveContainer width="100%" height={120}>
            <BarChart data={ratingCounts} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis 
                    type="category" 
                    dataKey="rating"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `${value} ★`}
                    width={40}
                />
                <Bar dataKey="count" radius={[4, 4, 4, 4]} className="fill-primary">
                   <LabelList 
                        dataKey="percentage" 
                        position="right" 
                        formatter={(value: number) => `${value.toFixed(0)}%`}
                        className="text-xs fill-muted-foreground"
                    />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    </div>
  );
}
