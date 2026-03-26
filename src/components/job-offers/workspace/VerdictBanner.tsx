'use client';

import { CheckCircle2, XCircle, AlertTriangle, TrendingDown, TrendingUp, Minus, ShieldAlert } from 'lucide-react';
import type { JobOfferDecisionWorkspace } from '@/lib/types';
import { formatMoney } from '@/lib/job-offers/workspace';
import { useI18n } from '@/components/providers/i18n-provider';

type Props = {
  workspace: JobOfferDecisionWorkspace;
};

const TIER_CONFIG = {
  accept: {
    icon: CheckCircle2,
    chipClass: 'bg-emerald-600 text-white',
    surfaceClass: 'border-emerald-300 bg-emerald-50/80',
    labelKey: 'jobOffers.verdicts.decision.accept',
    labelFallback: 'ACCEPTER',
    eyebrowKey: 'jobOffers.verdicts.strong.eyebrow',
    eyebrowFallback: 'Signal positif',
  },
  negotiate: {
    icon: AlertTriangle,
    chipClass: 'bg-amber-500 text-white',
    surfaceClass: 'border-amber-300 bg-amber-50/80',
    labelKey: 'jobOffers.verdicts.decision.negotiate',
    labelFallback: 'NÉGOCIER',
    eyebrowKey: 'jobOffers.verdicts.fair.eyebrow',
    eyebrowFallback: 'Lecture équilibrée',
  },
  avoid: {
    icon: XCircle,
    chipClass: 'bg-rose-600 text-white',
    surfaceClass: 'border-rose-300 bg-rose-50/80',
    labelKey: 'jobOffers.verdicts.decision.avoid',
    labelFallback: 'PRUDENCE',
    eyebrowKey: 'jobOffers.verdicts.weak.eyebrow',
    eyebrowFallback: 'Signal de vigilance',
  },
} as const;

const RISK_PILL = {
  low: { label: '🟢 Risque faible', class: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  moderate: { label: '🟠 Risque modéré', class: 'bg-amber-100 text-amber-800 border-amber-200' },
  high: { label: '🔴 Risque élevé', class: 'bg-rose-100 text-rose-800 border-rose-200' },
} as const;

function getRiskLevel(riskFlagCount: number): keyof typeof RISK_PILL {
  if (riskFlagCount <= 1) return 'low';
  if (riskFlagCount <= 3) return 'moderate';
  return 'high';
}

export function VerdictBanner({ workspace }: Props) {
  const { t } = useI18n();
  const { decisionTier, salaryGapPercent, analysis } = workspace;
  const config = TIER_CONFIG[decisionTier];
  const TierIcon = config.icon;
  const riskLevel = getRiskLevel(analysis.risk_flags.length);
  const riskPill = RISK_PILL[riskLevel];

  const gapLabel = salaryGapPercent != null
    ? salaryGapPercent > 0
      ? `+${Math.abs(Math.round(salaryGapPercent))}% au-dessus du marché`
      : `${Math.abs(Math.round(salaryGapPercent))}% en-dessous du marché`
    : null;

  const GapIcon = salaryGapPercent == null ? Minus : salaryGapPercent > 0 ? TrendingUp : TrendingDown;
  const gapIconClass = salaryGapPercent == null
    ? 'text-slate-500'
    : salaryGapPercent > 0
    ? 'text-emerald-600'
    : 'text-rose-600';

  return (
    <div className={`rounded-[1.8rem] border p-5 md:p-7 ${config.surfaceClass}`}>
      {/* Eyebrow */}
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
        {t(workspace.verdict.eyebrow)}
      </p>

      {/* Verdict chip */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-base font-black tracking-tight ${config.chipClass}`}>
          <TierIcon className="h-5 w-5" />
          {t(config.labelKey, config.labelFallback)}
        </span>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${riskPill.class}`}>
          {riskPill.label}
        </span>
      </div>

      {/* Stats row */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {/* Salary position */}
        <div className="rounded-[1.2rem] border border-white/70 bg-white/80 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t('jobOffers.workspace.dimensions.compensation.title', 'Rémunération')}
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            <GapIcon className={`h-4 w-4 ${gapIconClass}`} />
            <p className="text-sm font-bold text-slate-950">
              {gapLabel
                ? gapLabel
                : t('jobOffers.workspace.formatting.notDisclosed', 'Non partagé')}
            </p>
          </div>
        </div>

        {/* Risk signals */}
        <div className="rounded-[1.2rem] border border-white/70 bg-white/80 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t('jobOffers.verdict.riskSignals', 'Signaux de risque')}
          </p>
          <div className="mt-2 space-y-1">
            {workspace.concerns.slice(0, 2).map((concern, i) => (
              <p key={i} className="text-xs leading-5 text-slate-700">{t(concern)}</p>
            ))}
            {workspace.concerns.length === 0 && (
              <p className="text-xs text-slate-500">{t('jobOffers.verdict.noMajorConcerns', 'Aucun risque majeur')}</p>
            )}
          </div>
        </div>

        {/* MonRH Integration CTA */}
        <a 
          href="https://monrh.vercel.app" 
          target="_blank" 
          rel="noopener noreferrer"
          className="group rounded-[1.2rem] border border-primary/20 bg-primary/5 px-4 py-4 transition-all hover:bg-primary/10"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Simulation Paie (MonRH)
            </p>
            <TrendingUp className="h-4 w-4 text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <p className="mt-2 text-sm font-bold text-primary">Calculer mon Net</p>
          <p className="mt-1 text-[10px] leading-4 text-primary/70 italic">Calculer l'impact IR, CNSS et CIMR sur monrh.vercel.app</p>
        </a>
      </div>
    </div>
  );
}
