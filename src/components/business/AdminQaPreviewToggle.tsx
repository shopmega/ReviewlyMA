'use client';

import { useMemo, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, SlidersHorizontal } from 'lucide-react';
import type { QaPreviewMode, QaPreviewState } from '@/lib/qa-preview';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type AdminQaPreviewToggleProps = {
  state: QaPreviewState;
};

const options: Array<{ value: QaPreviewMode; label: string }> = [
  { value: 'real', label: 'Donnees reelles' },
  { value: 'empty', label: 'Etat vide' },
  { value: 'low', label: 'Faible volume' },
  { value: 'medium', label: 'Volume moyen' },
  { value: 'high', label: 'Volume eleve' },
];
const optionMap = Object.fromEntries(options.map((option) => [option.value, option.label])) as Record<QaPreviewMode, string>;

export function AdminQaPreviewToggle({ state }: AdminQaPreviewToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const stateLabel = useMemo(() => {
    return `Avis: ${optionMap[state.reviews]} | Salaires: ${optionMap[state.salaries]}`;
  }, [state.reviews, state.salaries]);

  const applyState = (next: QaPreviewState) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('qa_preview');
    params.delete('qa_reviews');
    params.delete('qa_salaries');

    if (next.reviews === next.salaries) {
      if (next.reviews !== 'real') {
        params.set('qa_preview', next.reviews);
      }
    } else {
      if (next.reviews !== 'real') {
        params.set('qa_reviews', next.reviews);
      }
      if (next.salaries !== 'real') {
        params.set('qa_salaries', next.salaries);
      }
    }

    const query = params.toString();
    const href = query ? `${pathname}?${query}` : pathname;

    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  };

  const onDimensionChange = (dimension: 'reviews' | 'salaries', nextMode: QaPreviewMode) => {
    applyState({
      ...state,
      [dimension]: nextMode,
    });
  };

  const isRealMode = state.reviews === 'real' && state.salaries === 'real';

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[280px] rounded-xl border border-primary/20 bg-background/95 p-3 shadow-xl backdrop-blur">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        <span>Admin QA Preview</span>
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-muted-foreground">Avis (rating)</Label>
          <Select value={state.reviews} onValueChange={(value) => onDimensionChange('reviews', value as QaPreviewMode)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={optionMap[state.reviews]} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={`reviews-${option.value}`} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-muted-foreground">Salaires</Label>
          <Select value={state.salaries} onValueChange={(value) => onDimensionChange('salaries', value as QaPreviewMode)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={optionMap[state.salaries]} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={`salaries-${option.value}`} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!isRealMode && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-full text-xs"
            onClick={() => applyState({ reviews: 'real', salaries: 'real' })}
          >
            Retour aux donnees reelles
          </Button>
        )}
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <SlidersHorizontal className="h-3 w-3" />
          {isPending ? 'Mise a jour...' : stateLabel}
        </p>
      </div>
    </div>
  );
}
