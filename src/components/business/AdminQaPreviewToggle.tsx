'use client';

import { useMemo, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, SlidersHorizontal } from 'lucide-react';
import type { QaPreviewMode } from '@/lib/qa-preview';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type AdminQaPreviewToggleProps = {
  mode: QaPreviewMode;
};

const options: Array<{ value: QaPreviewMode; label: string }> = [
  { value: 'real', label: 'Donnees reelles' },
  { value: 'empty', label: 'Etat vide' },
  { value: 'low', label: 'Faible volume' },
  { value: 'medium', label: 'Volume moyen' },
  { value: 'high', label: 'Volume eleve' },
];

export function AdminQaPreviewToggle({ mode }: AdminQaPreviewToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selectedLabel = useMemo(() => {
    return options.find((option) => option.value === mode)?.label || options[0].label;
  }, [mode]);

  const onModeChange = (nextMode: QaPreviewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextMode === 'real') {
      params.delete('qa_preview');
    } else {
      params.set('qa_preview', nextMode);
    }

    const query = params.toString();
    const href = query ? `${pathname}?${query}` : pathname;

    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[240px] rounded-xl border border-primary/20 bg-background/95 p-3 shadow-xl backdrop-blur">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        <span>Admin QA Preview</span>
      </div>
      <div className="space-y-2">
        <Select value={mode} onValueChange={(value) => onModeChange(value as QaPreviewMode)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder={selectedLabel} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <SlidersHorizontal className="h-3 w-3" />
          {isPending ? 'Mise a jour...' : selectedLabel}
        </p>
      </div>
    </div>
  );
}
