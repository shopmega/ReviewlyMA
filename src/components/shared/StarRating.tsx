'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type StarRatingProps = {
  count?: number;
  rating: number;
  onRatingChange?: (rating: number) => void;
  size?: number;
  className?: string;
  readOnly?: boolean;
};

export function StarRating({
  count = 5,
  rating,
  onRatingChange,
  size = 20,
  className,
  readOnly = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const onMouseEnter = (index: number) => {
    if (readOnly) return;
    setHoverRating(index);
  };

  const onMouseLeave = () => {
    if (readOnly) return;
    setHoverRating(0);
  };

  const onSaveRating = (index: number) => {
    if (readOnly || !onRatingChange) return;
    onRatingChange(index);
  };

  const stars = Array(count).fill(0);

  return (
    <div className={cn('flex items-center', className)} onMouseLeave={onMouseLeave}>
      {stars.map((_, i) => {
        const index = i + 1;
        return (
          <Star
            key={index}
            className={cn(
              'transition-colors',
              !readOnly && 'cursor-pointer',
              (hoverRating || rating) >= index ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            )}
            style={{ width: size, height: size }}
            onMouseEnter={() => onMouseEnter(index)}
            onClick={() => onSaveRating(index)}
          />
        );
      })}
    </div>
  );
}
