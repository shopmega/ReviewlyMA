'use client';

import { Control, useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { StarRating } from '@/components/shared/StarRating';
import type { ReviewFormData } from '@/lib/types';

type SubRatingInputProps = {
  name: keyof ReviewFormData;
  label: string;
  control: Control<ReviewFormData>;
};

export function SubRatingInput({ name, label, control }: SubRatingInputProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <FormLabel className="text-base text-muted-foreground">{label}</FormLabel>
            <FormControl>
              <StarRating
                rating={field.value as number}
                onRatingChange={(value) => field.onChange(value)}
                size={24}
              />
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
