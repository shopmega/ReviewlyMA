'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReviewsSection } from '@/components/business/ReviewsSection';
import { SalarySection } from '@/components/business/SalarySection';
import type { Business, SalaryEntry, SalaryStats } from '@/lib/types';
import { useI18n } from '@/components/providers/i18n-provider';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { CalendarClock, ShieldCheck, TrendingUp, FileCheck } from 'lucide-react';
import { analytics } from '@/lib/analytics';

type BusinessInsightsTabsProps = {
  business: Business;
  enableSalaries: boolean;
  salaryStats: SalaryStats;
  salaryEntries: SalaryEntry[];
  salaryRoles?: string[];
  salaryDepartments?: string[];
  salaryIntervals?: Array<{ id: string; label: string; min: number; max: number }>;
};

export function BusinessInsightsTabs({
  business,
  enableSalaries,
  salaryStats,
  salaryEntries,
  salaryRoles = [],
  salaryDepartments = [],
  salaryIntervals = [],
}: BusinessInsightsTabsProps) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const ctaExperiment = 'business_profile_trust_panel_v1';
  const reviewCount = business.reviews.length;
  const salaryCount = salaryStats.count;
  const defaultTab = useMemo(() => {
    const requestedTab = searchParams.get('tab');
    if (enableSalaries && requestedTab === 'salaries') return 'salaries';
    if (enableSalaries && reviewCount === 0 && salaryCount > 0) return 'salaries';
    return 'reviews';
  }, [searchParams, enableSalaries, reviewCount, salaryCount]);
  const confidenceLabel = useMemo(() => {
    const signalScore = reviewCount + salaryCount;
    if (signalScore >= 50) return t('business.trust.high', 'Confiance elevee');
    if (signalScore >= 15) return t('business.trust.medium', 'Confiance moyenne');
    return t('business.trust.low', 'Confiance en construction');
  }, [reviewCount, salaryCount, t]);
  const latestDateLabel = useMemo(() => {
    const candidateDates: number[] = [];
    business.reviews.forEach((review) => {
      const ms = Date.parse(review.date);
      if (!Number.isNaN(ms)) candidateDates.push(ms);
    });
    salaryEntries.forEach((salary) => {
      const ms = Date.parse(salary.created_at);
      if (!Number.isNaN(ms)) candidateDates.push(ms);
    });
    if (business.created_at) {
      const ms = Date.parse(business.created_at);
      if (!Number.isNaN(ms)) candidateDates.push(ms);
    }
    if (candidateDates.length === 0) return t('business.trust.noDate', 'Date indisponible');
    return new Date(Math.max(...candidateDates)).toLocaleDateString('fr-MA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [business.created_at, business.reviews, salaryEntries, t]);
  const isClaimed = Boolean(business.is_claimed || business.owner_id);

  return (
    <section className="space-y-4" id="insights">
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-background to-sky-500/5 p-5 md:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isClaimed ? 'default' : 'outline'} className="rounded-full">
              <FileCheck className="mr-1 h-3.5 w-3.5" />
              {isClaimed ? t('business.trust.claimed', 'Profil revendique') : t('business.trust.unclaimed', 'Profil non revendique')}
            </Badge>
            <Badge variant="outline" className="rounded-full border-primary/30 text-primary">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              {t('business.trust.moderated', 'Moderation active sur les contributions')}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">{t('business.trust.reviews', 'Avis publies')}</p>
              <p className="text-lg font-bold">{reviewCount}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">{t('business.trust.salaries', 'Salaires publies')}</p>
              <p className="text-lg font-bold">{salaryCount}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">{t('business.trust.lastUpdate', 'Derniere activite')}</p>
              <p className="text-sm font-bold flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4 text-primary" />
                {latestDateLabel}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">{t('business.trust.confidence', 'Niveau de confiance')}</p>
              <p className="text-sm font-bold flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-primary" />
                {confidenceLabel}
              </p>
            </div>
          </div>

          {!isClaimed && (
            <p className="text-xs text-muted-foreground">
              {t('business.trust.claimPrompt', 'Vous representez cette entreprise ? ')}
              <Link
                href={`/claim/new?businessId=${business.id}`}
                className="text-primary font-semibold hover:underline"
                onClick={() => analytics.trackCtaClick('claim_listing', 'trust_panel_inline', 'business_profile', 'business_profile_trust_panel', ctaExperiment, business.id)}
              >
                {t('business.trust.claimPromptLink', 'Revendiquer la fiche')}
              </Link>
            </p>
          )}
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="h-12 rounded-xl bg-muted/50 p-1">
          <TabsTrigger value="reviews" className="rounded-lg px-5 font-semibold">
            {t('business.tabs.reviews', 'Avis')} ({reviewCount})
          </TabsTrigger>
          {enableSalaries && (
            <TabsTrigger value="salaries" className="rounded-lg px-5 font-semibold">
              {t('business.tabs.salaries', 'Salaires')} ({salaryCount})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="reviews" className="mt-0">
          <ReviewsSection business={business} />
        </TabsContent>

        {enableSalaries && (
          <TabsContent value="salaries" className="mt-0">
            <SalarySection
              businessId={business.id}
              businessCity={business.city}
              stats={salaryStats}
              salaries={salaryEntries}
              roles={salaryRoles}
              departments={salaryDepartments}
              intervals={salaryIntervals}
            />
          </TabsContent>
        )}
      </Tabs>
    </section>
  );
}
