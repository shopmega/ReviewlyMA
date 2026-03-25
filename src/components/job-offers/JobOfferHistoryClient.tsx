'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRightLeft, Filter, Sparkles } from 'lucide-react';
import type { MyJobOfferAnalysisListItem } from '@/lib/data/job-offers';
import { analytics } from '@/lib/analytics';
import { buildComparisonSummary, filterJobOfferAnalyses } from '@/lib/job-offers/history';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/components/providers/i18n-provider';

type Props = {
  analyses: MyJobOfferAnalysisListItem[];
};

function formatWords(value: string) {
  return value.replace(/_/g, ' ');
}

function formatSourceType(value: string, t: (k: string, f?: string) => string) {
  if (value === 'url') return t('jobOffers.workspace.formatting.linkSource', 'Link');
  if (value === 'paste') return t('jobOffers.workspace.formatting.pastedText', 'Paste');
  if (value === 'document') return t('jobOffers.workspace.formatting.document', 'Document');
  return value;
}

function getVerdictKey(verdict: string) {
  return `jobOffers.history.verdicts.${verdict}`;
}

function getConfidenceKey(level: string) {
  return `jobOffers.history.confidenceLevels.${level}`;
}

export function JobOfferHistoryClient({ analyses }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [verdict, setVerdict] = useState<'all' | 'insufficient_data' | 'below_market' | 'fair_market' | 'above_market' | 'strong_offer'>('all');
  const [confidence, setConfidence] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const hasTrackedOpen = useRef(false);

  const filtered = useMemo(() => filterJobOfferAnalyses(analyses, {
    query,
    verdict,
    confidence,
  }), [analyses, confidence, query, verdict]);

  const selected = useMemo(
    () => analyses.filter((item) => selectedIds.includes(item.id)).slice(0, 3),
    [analyses, selectedIds]
  );
  const comparison = useMemo(() => buildComparisonSummary(selected), [selected]);

  useEffect(() => {
    if (hasTrackedOpen.current) return;
    analytics.track('job_offer_history_opened', {
      analysis_count: analyses.length,
    });
    hasTrackedOpen.current = true;
  }, [analyses.length]);

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      let nextSelection: string[];

      if (current.includes(id)) {
        nextSelection = current.filter((item) => item !== id);
      } else if (current.length >= 3) {
        nextSelection = [...current.slice(1), id];
      } else {
        nextSelection = [...current, id];
      }

      if (nextSelection.length >= 2) {
        analytics.track('job_offer_compared', {
          selection_size: nextSelection.length,
          selected_ids: nextSelection,
        });
      }

      return nextSelection;
    });
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-slate-200 bg-slate-50/70">
        <CardContent className="grid gap-4 p-5 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <Filter className="h-3.5 w-3.5" />
              {t('jobOffers.history.filters.search', 'Search')}
            </span>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('jobOffers.history.filters.searchPlaceholder', 'Company, role, city')}
              className="h-11 rounded-xl bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t('jobOffers.history.filters.verdict', 'Verdict')}</span>
            <select
              value={verdict}
              onChange={(event) => setVerdict(event.target.value as typeof verdict)}
              className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm"
            >
              <option value="all">{t('jobOffers.history.filters.allVerdicts', 'All verdicts')}</option>
              <option value="strong_offer">{t('jobOffers.history.verdicts.strong_offer', 'Strong offer')}</option>
              <option value="above_market">{t('jobOffers.history.verdicts.above_market', 'Above market')}</option>
              <option value="fair_market">{t('jobOffers.history.verdicts.fair_market', 'Fair market')}</option>
              <option value="below_market">{t('jobOffers.history.verdicts.below_market', 'Below market')}</option>
              <option value="insufficient_data">{t('jobOffers.history.verdicts.insufficient_data', 'Insufficient data')}</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t('jobOffers.history.filters.confidence', 'Confidence')}</span>
            <select
              value={confidence}
              onChange={(event) => setConfidence(event.target.value as typeof confidence)}
              className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm"
            >
              <option value="all">{t('jobOffers.history.filters.allLevels', 'All levels')}</option>
              <option value="high">{t('jobOffers.history.confidenceLevels.high', 'High')}</option>
              <option value="medium">{t('jobOffers.history.confidenceLevels.medium', 'Medium')}</option>
              <option value="low">{t('jobOffers.history.confidenceLevels.low', 'Low')}</option>
            </select>
          </label>
        </CardContent>
      </Card>

      {selected.length >= 2 ? (
        <Card className="rounded-3xl border-sky-200 bg-[linear-gradient(135deg,rgba(239,246,255,0.9),rgba(255,255,255,1))]">
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  {t('jobOffers.history.comparison.mode', 'Compare mode')}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{t('jobOffers.history.comparison.title', 'Quick comparison')}</h2>
              </div>
              <Button variant="outline" onClick={() => setSelectedIds([])}>
                {t('jobOffers.history.actions.clearSelection', 'Clear selection')}
              </Button>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {selected.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/80 bg-white/90 p-4">
                  <p className="text-sm text-slate-500">{item.job_offers.company_name}</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-950">{item.job_offers.job_title}</h3>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">{item.job_offers.city || t('jobOffers.history.item.unknownCity', 'Unknown city')}</Badge>
                    <Badge variant="outline">{t(getVerdictKey(item.market_position_label), formatWords(item.market_position_label))}</Badge>
                    <Badge variant="outline">{t(getConfidenceKey(item.confidence_level), item.confidence_level)}</Badge>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between gap-3">
                      <span>{t('jobOffers.history.item.overallScore', 'Overall score')}</span>
                      <span className="font-semibold text-slate-950">{Math.round(item.overall_offer_score)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>{t('jobOffers.history.item.clarity', 'Clarity')}</span>
                      <span className="font-semibold text-slate-950">{Math.round(item.transparency_score)}</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button variant="outline" asChild>
                      <Link href={`/job-offers/${item.id}`}>{t('jobOffers.history.actions.openAnalysis', 'Open analysis')}</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t('jobOffers.history.comparison.bestScore', 'Best score')}</p>
                <p className="mt-2 text-sm font-bold text-slate-950">
                  {selected.find((item) => item.id === comparison.bestScoreId)?.job_offers.company_name || 'N/A'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t('jobOffers.history.comparison.clearestOffer', 'Clearest offer')}</p>
                <p className="mt-2 text-sm font-bold text-slate-950">
                  {selected.find((item) => item.id === comparison.clearestId)?.job_offers.company_name || 'N/A'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t('jobOffers.history.comparison.highConfidenceReads', 'High-confidence reads')}</p>
                <p className="mt-2 text-sm font-bold text-slate-950">{comparison.strongestConfidenceCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {filtered.length > 0 ? filtered.map((item) => {
          const isSelected = selectedIds.includes(item.id);

          return (
            <Card key={item.id} className="rounded-3xl">
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{item.job_offers.company_name}</p>
                    <h2 className="text-xl font-bold">{item.job_offers.job_title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {item.job_offers.city || t('jobOffers.history.item.unknownCity', 'Unknown city')} - {t(getVerdictKey(item.market_position_label), formatWords(item.market_position_label))} - {t('jobOffers.history.item.overallScore', 'score')} {Math.round(item.overall_offer_score)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{t(getConfidenceKey(item.confidence_level), item.confidence_level)}</Badge>
                    <Badge variant="outline">{formatSourceType(item.job_offers.source_type, t)}</Badge>
                    <Button variant={isSelected ? 'default' : 'outline'} onClick={() => toggleSelected(item.id)}>
                      {isSelected ? t('jobOffers.history.actions.selected', 'Selected') : t('jobOffers.history.actions.compare', 'Compare')}
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/job-offers/${item.id}`}>{t('jobOffers.history.actions.open', 'Open')}</Link>
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t('jobOffers.history.item.overallScore', 'Overall score')}</p>
                    <p className="mt-2 text-lg font-black text-slate-950">{Math.round(item.overall_offer_score)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t('jobOffers.history.item.clarity', 'Clarity')}</p>
                    <p className="mt-2 text-lg font-black text-slate-950">{Math.round(item.transparency_score)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <Sparkles className="h-3.5 w-3.5" />
                      {t('jobOffers.history.item.summary', 'Summary')}
                    </p>
                    <p className="mt-2 text-sm text-slate-700">{item.analysis_summary}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }) : (
          <Card className="rounded-3xl">
            <CardContent className="p-6 text-sm text-muted-foreground">
              {t('jobOffers.history.filters.noMatch', 'No analyses match your current filters.')}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
