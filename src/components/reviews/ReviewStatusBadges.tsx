'use client';

import { Badge } from '@/components/ui/badge';

type AppealStatus = 'open' | 'in_review' | 'accepted' | 'rejected' | null | undefined;
type ModerationStatus = 'rejected' | 'hidden' | 'deleted' | null | undefined;

export function ReviewAppealStatusBadge({
  status,
  labels,
}: {
  status: AppealStatus;
  labels: {
    open: string;
    in_review: string;
    accepted: string;
    rejected: string;
  };
}) {
  if (!status) return null;
  if (status === 'open') return <Badge variant="outline">{labels.open}</Badge>;
  if (status === 'in_review') return <Badge variant="outline" className="border-orange-500 text-orange-600">{labels.in_review}</Badge>;
  if (status === 'accepted') return <Badge className="bg-emerald-600 text-white">{labels.accepted}</Badge>;
  return <Badge variant="secondary">{labels.rejected}</Badge>;
}

export function ReviewModerationStatusBadge({
  status,
  labels,
}: {
  status: ModerationStatus;
  labels: {
    rejected: string;
    hidden: string;
    deleted: string;
  };
}) {
  if (!status) return null;
  if (status === 'rejected') return <Badge variant="secondary">{labels.rejected}</Badge>;
  if (status === 'hidden') return <Badge variant="secondary">{labels.hidden}</Badge>;
  return <Badge variant="secondary">{labels.deleted}</Badge>;
}
