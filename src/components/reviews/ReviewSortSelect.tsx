'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ReviewSortOption } from '@/lib/reviews/review-helpers';

type ReviewSortSelectProps = {
  value: ReviewSortOption;
  onChange: (value: ReviewSortOption) => void;
  labels: Record<ReviewSortOption, string>;
  className?: string;
};

export function ReviewSortSelect({ value, onChange, labels, className = 'w-full sm:w-[180px]' }: ReviewSortSelectProps) {
  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue as ReviewSortOption)}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="newest">{labels.newest}</SelectItem>
        <SelectItem value="oldest">{labels.oldest}</SelectItem>
        <SelectItem value="rating">{labels.rating}</SelectItem>
        <SelectItem value="helpful">{labels.helpful}</SelectItem>
      </SelectContent>
    </Select>
  );
}
