import type { JobOfferEmployerContext } from '@/lib/types';
import { formatEmployerSignal } from '@/lib/job-offers/workspace';
import { Badge } from '@/components/ui/badge';

type Props = {
  signal: JobOfferEmployerContext['signal_label'];
};

export function EmployerSignalBadge({ signal }: Props) {
  return (
    <Badge variant="outline" className={getSignalTone(signal)}>
      {formatEmployerSignal(signal)}
    </Badge>
  );
}

function getSignalTone(signal: JobOfferEmployerContext['signal_label']) {
  if (signal === 'strong') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  if (signal === 'mixed') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-slate-200 bg-slate-100 text-slate-700';
}
