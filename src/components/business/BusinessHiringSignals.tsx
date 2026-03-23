'use client';

import { useEffect } from 'react';
import { BriefcaseBusiness, Building2, CircleAlert, Eye, FileBadge2, TrendingUp } from 'lucide-react';
import type { JobOfferBusinessInsights } from '@/lib/types';
import { analytics } from '@/lib/analytics';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  insights: JobOfferBusinessInsights | null;
};

function formatPercent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A';
  return `${Math.round(value)}%`;
}

function formatWorkModel(value: JobOfferBusinessInsights['dominant_work_model']) {
  if (!value) return 'Non defini';
  if (value === 'onsite') return 'Sur site';
  if (value === 'hybrid') return 'Hybride';
  return 'Remote';
}

function formatContractType(value: JobOfferBusinessInsights['dominant_contract_type']) {
  if (!value) return 'Non defini';
  return value.toUpperCase();
}

function getCompetitivenessLabel(insights: JobOfferBusinessInsights) {
  const above = insights.above_market_rate ?? 0;
  const below = insights.below_market_rate ?? 0;

  if (above >= 45 && above > below) return 'Plutot competitif';
  if (below >= 45 && below > above) return 'Plutot sous le marche';
  return 'Signal mixte';
}

function getSignalBadge(insights: JobOfferBusinessInsights) {
  if (insights.approved_offer_count >= 5) {
    return {
      label: 'Signal exploitable',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    };
  }

  return {
    label: 'Signal limite',
    className: 'border-amber-200 bg-amber-50 text-amber-900',
  };
}

export function BusinessHiringSignals({ insights }: Props) {
  useEffect(() => {
    if (!insights || insights.approved_offer_count < 3) return;
    analytics.track('job_offer_business_insight_viewed', {
      approved_offer_count: insights.approved_offer_count,
      salary_disclosure_rate: insights.salary_disclosure_rate,
      dominant_work_model: insights.dominant_work_model,
    }, insights.business_id);
  }, [insights]);

  if (!insights || insights.approved_offer_count < 3) {
    return null;
  }

  const signalBadge = getSignalBadge(insights);
  const cards = [
    {
      label: 'Offres analysees',
      value: String(insights.approved_offer_count),
      icon: BriefcaseBusiness,
    },
    {
      label: 'Salaire visible',
      value: formatPercent(insights.salary_disclosure_rate),
      icon: Eye,
    },
    {
      label: 'Clarte moyenne',
      value: formatPercent(insights.avg_transparency_score),
      icon: FileBadge2,
    },
    {
      label: 'Lecture marche',
      value: getCompetitivenessLabel(insights),
      icon: TrendingUp,
    },
  ];

  return (
    <Card className="rounded-2xl border-sky-200/70 bg-[linear-gradient(135deg,rgba(240,249,255,0.9),rgba(255,255,255,1))] shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={signalBadge.className}>
            Hiring Signals
          </Badge>
          <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
            Offres approuvees uniquement
          </Badge>
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl font-black tracking-tight text-slate-950">
            Lecture agregee des offres publiees
          </CardTitle>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Ces signaux resument la maniere dont cette entreprise formule ses offres d emploi. Ils completent les avis et
            les salaires, sans exposer d analyse privee individuelle.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/80 bg-white/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                <item.icon className="h-4 w-4 text-sky-700" />
              </div>
              <p className="mt-3 text-lg font-black text-slate-950">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Mode de travail dominant</p>
            <p className="mt-2 text-base font-bold text-slate-950">{formatWorkModel(insights.dominant_work_model)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Contrat dominant</p>
            <p className="mt-2 text-base font-bold text-slate-950">{formatContractType(insights.dominant_contract_type)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Salaire non divulgue</p>
            <p className="mt-2 text-base font-bold text-slate-950">{formatPercent(insights.missing_salary_rate)}</p>
          </div>
        </div>

        {insights.top_hiring_roles && insights.top_hiring_roles.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Top hiring roles</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {insights.top_hiring_roles.map((role) => (
                <Badge key={`${role.role_key}-${role.offer_count}`} variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                  {role.role_label} ({role.offer_count})
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Ce bloc n apparait qu a partir de 3 offres approuvees. En dessous de 5 offres, le signal reste indicatif et ne
            doit pas etre lu comme un verdict definitif sur l employeur.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Building2 className="h-3.5 w-3.5" />
          Basé sur les offres liées à cette entreprise après modération.
        </div>
      </CardContent>
    </Card>
  );
}
