'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { AlertTriangle, Check, Clock3, Eye, ShieldAlert, Star, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { StarRating } from '@/components/shared/StarRating';

type ReviewStatus =
  | 'draft'
  | 'submitted'
  | 'pending'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'hidden'
  | 'under_investigation'
  | 'edited_requires_review'
  | 'appealed'
  | 'restored'
  | 'deleted';

type SlaState = 'no_sla' | 'healthy' | 'at_risk' | 'breached';

type ReviewSubRatings = {
  work_life_balance: number | null;
  management: number | null;
  career_growth: number | null;
  culture: number | null;
} | null | undefined;

export function AdminReviewStatusBadge({
  status,
  labels,
}: {
  status: ReviewStatus;
  labels: {
    pending: string;
    toReview: string;
    validated: string;
    published: string;
    investigation: string;
    rejected: string;
    removed: string;
  };
}) {
  switch (status) {
    case 'pending':
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest"><Clock3 className="mr-1 h-3 w-3" /> {labels.pending}</Badge>;
    case 'draft':
    case 'submitted':
    case 'edited_requires_review':
    case 'appealed':
      return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest"><Eye className="mr-1 h-3 w-3" /> {labels.toReview}</Badge>;
    case 'approved':
    case 'restored':
      return <Badge className="bg-emerald-500 text-white border-0 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest"><Check className="mr-1 h-3 w-3" /> {labels.validated}</Badge>;
    case 'published':
      return <Badge className="bg-green-500 text-white border-0 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-green-500/20"><Check className="mr-1 h-3 w-3" /> {labels.published}</Badge>;
    case 'hidden':
    case 'under_investigation':
      return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest"><ShieldAlert className="mr-1 h-3 w-3" /> {labels.investigation}</Badge>;
    case 'rejected':
      return <Badge className="bg-rose-500 text-white border-0 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest"><X className="mr-1 h-3 w-3" /> {labels.rejected}</Badge>;
    case 'deleted':
      return <Badge variant="secondary" className="font-black text-[9px] uppercase tracking-widest">{labels.removed}</Badge>;
    default:
      return <Badge variant="secondary" className="font-black text-[9px] uppercase tracking-widest">{status}</Badge>;
  }
}

export function AdminReviewSlaBadge({
  state,
  dueAt,
  labels,
}: {
  state: SlaState;
  dueAt?: string | null;
  labels: {
    atRisk: string;
    breached: string;
    due: string;
    none: string;
  };
}) {
  return (
    <div>
      {state === 'no_sla' ? (
        <span className="text-xs text-muted-foreground">{labels.none}</span>
      ) : state === 'healthy' ? (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest">
          <Check className="h-3 w-3 mr-1" /> OK
        </Badge>
      ) : state === 'at_risk' ? (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
          <Clock3 className="h-3 w-3 mr-1" /> {labels.atRisk}
        </Badge>
      ) : (
        <Badge className="bg-rose-500 text-white border-0 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest">
          <ShieldAlert className="h-3 w-3 mr-1" /> {labels.breached}
        </Badge>
      )}
      {dueAt ? (
        <div className="text-[9px] text-muted-foreground mt-1 font-bold tabular-nums">
          {labels.due}: {new Date(dueAt).toLocaleDateString('fr-FR')}
        </div>
      ) : null}
    </div>
  );
}

export function AdminReviewSubratings({
  subRatings,
  labels,
}: {
  subRatings: ReviewSubRatings;
  labels: {
    workLife: string;
    management: string;
    career: string;
    culture: string;
  };
}) {
  if (!subRatings) return null;

  const items = [
    { key: 'work_life_balance', label: labels.workLife, value: subRatings.work_life_balance },
    { key: 'management', label: labels.management, value: subRatings.management },
    { key: 'career_growth', label: labels.career, value: subRatings.career_growth },
    { key: 'culture', label: labels.culture, value: subRatings.culture },
  ].filter((item) => item.value != null);

  if (items.length === 0) return null;

  return (
    <div className="text-[10px] space-y-0.5">
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-1">
          <span className="text-muted-foreground w-16 truncate">{item.label}</span>
          <StarRating rating={item.value as number} size={10} readOnly />
        </div>
      ))}
    </div>
  );
}

export function AdminReviewKpiCard({
  icon: Icon,
  value,
  title,
  iconWrapClassName,
  badge,
}: {
  icon: LucideIcon;
  value: ReactNode;
  title: string;
  iconWrapClassName: string;
  badge?: ReactNode;
}) {
  return (
    <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${iconWrapClassName}`}>
            <Icon className="h-6 w-6" />
          </div>
          {badge}
        </div>
        <p className="text-3xl font-black tabular-nums">{value}</p>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{title}</p>
      </CardContent>
    </Card>
  );
}

export function AdminReviewInlineRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-black text-lg tabular-nums">{rating}</span>
      <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
    </div>
  );
}

export function AdminReviewFilterBadge({
  tone,
  children,
}: {
  tone: 'queue' | 'urgent' | 'attention';
  children: ReactNode;
}) {
  const toneClassName =
    tone === 'queue'
      ? 'border-blue-500/20 text-blue-600'
      : tone === 'urgent'
        ? 'border-rose-500/20 text-rose-600'
        : 'border-amber-500/20 text-amber-600';

  return (
    <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-widest ${toneClassName}`}>
      {children}
    </Badge>
  );
}
