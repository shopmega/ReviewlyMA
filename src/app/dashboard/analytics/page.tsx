'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Star, TrendingUp, Users, AlertCircle, BriefcaseBusiness, FileBadge2, BadgePercent } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { cn } from '@/lib/utils';
import { PremiumFeatureGate } from '@/components/shared/PremiumFeatureGate';
import { useI18n } from '@/components/providers/i18n-provider';
import type { JobOfferBusinessInsights, JobOfferBusinessMonthlyTrend } from '@/lib/types';

type BusinessStats = {
  businessName: string;
  totalReviews: number;
  averageRating: number;
  monthlyData: { name: string; reviews: number }[];
  ratingDistribution: { rating: number; count: number }[];
  views: number;
  leads: number;
  whatsappClicks: number;
  affiliateClicks: number;
};

function formatPercent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A';
  return `${Math.round(value)}%`;
}

function formatWorkModel(value: JobOfferBusinessInsights['dominant_work_model']) {
  if (!value) return 'Not defined';
  if (value === 'onsite') return 'On-site';
  if (value === 'hybrid') return 'Hybrid';
  return 'Remote';
}

function formatContractType(value: JobOfferBusinessInsights['dominant_contract_type']) {
  if (!value) return 'Not defined';
  return value.toUpperCase();
}

function getHiringSignalLabel(insights: JobOfferBusinessInsights | null) {
  if (!insights) return 'No usable signal yet';
  if (insights.approved_offer_count >= 5) return 'Usable signal';
  return 'Directional only';
}

function getHiringMixData(insights: JobOfferBusinessInsights | null) {
  if (!insights) return [];

  return [
    { label: 'On-site', value: insights.onsite_rate ?? 0 },
    { label: 'Hybrid', value: insights.hybrid_rate ?? 0 },
    { label: 'Remote', value: insights.remote_rate ?? 0 },
  ].filter((item) => item.value > 0);
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl bg-card/50" />
        ))}
      </div>
      <Card className="bg-card/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function AnalyticsPage() {
  const { businessId, loading: profileLoading, error: profileError } = useBusinessProfile();
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [hiringInsights, setHiringInsights] = useState<JobOfferBusinessInsights | null>(null);
  const [hiringTrend, setHiringTrend] = useState<JobOfferBusinessMonthlyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, tf, locale } = useI18n();
  const dateLocale = locale === 'fr' ? 'fr-FR' : locale === 'ar' ? 'ar-MA' : 'en-US';

  useEffect(() => {
    if (profileLoading || !businessId) return;
    if (profileError) {
      setLoading(false);
      return;
    }

    async function fetchAnalytics() {
      const supabase = createClient();

      const { data: business } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('id', businessId)
        .single();

      if (!business) {
        setLoading(false);
        return;
      }

      const { data: reviews } = await supabase
        .from('reviews')
        .select('id, rating, date, created_at')
        .eq('business_id', businessId);

      const reviewsList = reviews || [];
      const totalReviews = reviewsList.length;
      const averageRating = totalReviews > 0
        ? reviewsList.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

      const now = new Date();
      const monthlyData: { name: string; reviews: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const monthReviews = reviewsList.filter((r) => {
          const d = new Date(r.created_at || r.date);
          return d >= monthStart && d <= monthEnd;
        }).length;

        monthlyData.push({
          name: monthDate.toLocaleDateString(dateLocale, { month: 'short' }),
          reviews: monthReviews,
        });
      }

      const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
        rating,
        count: reviewsList.filter((r) => r.rating === rating).length,
      }));

      const { data: analytics } = await supabase
        .from('business_analytics')
        .select('*')
        .eq('business_id', businessId);

      const { data: hiring } = await supabase
        .from('job_offer_business_insights')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();

      const { data: hiringTrendRows } = await supabase
        .from('job_offer_business_monthly_trends')
        .select('*')
        .eq('business_id', businessId)
        .order('month_date', { ascending: true });

      const views = analytics?.filter((a) => a.event_type === 'page_view').length || 0;
      const whatsappClicks = analytics?.filter((a) => a.event_type === 'whatsapp_click').length || 0;
      const affiliateClicks = analytics?.filter((a) => a.event_type === 'affiliate_click').length || 0;
      const leads =
        analytics?.filter((a) =>
          ['phone_click', 'website_click', 'contact_form', 'whatsapp_click', 'affiliate_click'].includes(a.event_type)
        ).length || 0;

      setStats({
        businessName: business.name,
        totalReviews,
        averageRating,
        monthlyData,
        ratingDistribution,
        views,
        leads,
        whatsappClicks,
        affiliateClicks,
      });
      setHiringInsights((hiring as JobOfferBusinessInsights | null) ?? null);
      setHiringTrend((hiringTrendRows as JobOfferBusinessMonthlyTrend[] | null) ?? []);

      setLoading(false);
    }

    fetchAnalytics();
  }, [businessId, dateLocale, profileError, profileLoading]);

  if (profileLoading || loading) {
    return <AnalyticsSkeleton />;
  }

  if (profileError || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold font-headline">
          {t('dashboardAnalyticsPage.errors.accessDenied', 'Access denied')}
        </h1>
        <p className="text-muted-foreground">{profileError || t('dashboardAnalyticsPage.errors.unknown', 'Unknown error')}</p>
        <Button asChild>
          <Link href="/pro">{t('dashboardAnalyticsPage.errors.claimBusiness', 'Claim a business')}</Link>
        </Button>
      </div>
    );
  }

  const statCards = [
    {
      name: t('dashboardAnalyticsPage.cards.totalReviews', 'Total reviews'),
      value: stats.totalReviews.toString(),
      icon: Star,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      name: t('dashboardAnalyticsPage.cards.averageRating', 'Average rating'),
      value: stats.averageRating.toFixed(1),
      icon: TrendingUp,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      name: t('dashboardAnalyticsPage.cards.profileViews', 'Profile views'),
      value: stats.views.toString(),
      icon: Eye,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      name: t('dashboardAnalyticsPage.cards.leads', 'Lead conversions'),
      value: stats.leads.toString(),
      icon: Users,
      color: 'text-info',
      bg: 'bg-info/10',
    },
  ];
  const hiringStatCards = hiringInsights ? [
    {
      name: 'Approved offers',
      value: String(hiringInsights.approved_offer_count),
      icon: BriefcaseBusiness,
      color: 'text-sky-600',
      bg: 'bg-sky-500/10',
    },
    {
      name: 'Salary disclosure',
      value: formatPercent(hiringInsights.salary_disclosure_rate),
      icon: BadgePercent,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
    },
    {
      name: 'Offer clarity',
      value: formatPercent(hiringInsights.avg_transparency_score),
      icon: FileBadge2,
      color: 'text-amber-600',
      bg: 'bg-amber-500/10',
    },
    {
      name: 'Benchmark confidence',
      value: formatPercent(hiringInsights.avg_benchmark_confidence_score),
      icon: TrendingUp,
      color: 'text-violet-600',
      bg: 'bg-violet-500/10',
    },
  ] : [];
  const hiringMixData = getHiringMixData(hiringInsights);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          {t('dashboardAnalyticsPage.header.title', 'Analytics')}
        </h1>
        <p className="text-muted-foreground text-lg">
          {tf('dashboardAnalyticsPage.header.subtitle', 'Performance analysis for {businessName}.', {
            businessName: stats.businessName,
          })}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card
            key={stat.name}
            className="rounded-xl border border-border bg-card shadow-none transition-colors hover:bg-secondary/20"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground font-body uppercase tracking-in-wider">
                {stat.name}
              </CardTitle>
              <div className={cn('p-2 rounded-lg', stat.bg, stat.color)}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-headline">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-xl border border-border bg-card shadow-none">
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="font-headline">Hiring Offer Analytics</CardTitle>
              <CardDescription>
                Aggregated signals from approved analyzed job offers linked to this business.
              </CardDescription>
            </div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {getHiringSignalLabel(hiringInsights)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {hiringInsights && hiringInsights.approved_offer_count >= 3 ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {hiringStatCards.map((stat) => (
                  <div
                    key={stat.name}
                    className="rounded-xl border border-border bg-background/60 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        {stat.name}
                      </p>
                      <div className={cn('rounded-lg p-2', stat.bg, stat.color)}>
                        <stat.icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-3 text-2xl font-black font-headline">{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-background/60 p-5">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-foreground">Hiring profile</h3>
                    <p className="text-sm text-muted-foreground">
                      Dominant structure across approved offers.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-card p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Work model</p>
                      <p className="mt-2 text-lg font-bold">{formatWorkModel(hiringInsights.dominant_work_model)}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Contract</p>
                      <p className="mt-2 text-lg font-bold">{formatContractType(hiringInsights.dominant_contract_type)}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Above market share</p>
                      <p className="mt-2 text-lg font-bold">{formatPercent(hiringInsights.above_market_rate)}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Missing salary share</p>
                      <p className="mt-2 text-lg font-bold">{formatPercent(hiringInsights.missing_salary_rate)}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background/60 p-5">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-foreground">Work model mix</h3>
                    <p className="text-sm text-muted-foreground">
                      Distribution across approved offers.
                    </p>
                  </div>
                  {hiringMixData.length > 0 ? (
                    <div className="space-y-4">
                      {hiringMixData.map((item) => (
                        <div key={item.label} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-foreground">{item.label}</span>
                            <span className="text-muted-foreground">{formatPercent(item.value)}</span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-secondary/60">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-500"
                              style={{ width: `${Math.max(0, Math.min(item.value, 100))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Work-model data is still too thin to summarize.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background/60 p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-foreground">Hiring trend</h3>
                  <p className="text-sm text-muted-foreground">
                    Monthly clarity and disclosure trend from approved offers.
                  </p>
                </div>
                {hiringTrend.length > 0 ? (
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hiringTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/50" />
                        <XAxis
                          dataKey="month_key"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          dy={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          domain={[0, 100]}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                          }}
                        />
                        <Bar dataKey="avg_transparency_score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={18} />
                        <Bar dataKey="salary_disclosure_rate" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} barSize={18} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Trend data will appear once enough approved offers accumulate over multiple months.
                  </p>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                This block is shown from 3 approved offers. Below 5 offers, treat the read as directional rather than conclusive.
              </p>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-background/40 p-5 text-sm text-muted-foreground">
              No usable employer hiring signal yet. This section becomes informative once at least 3 approved analyzed offers are linked to this business.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <PremiumFeatureGate
          level="gold"
          title={t('dashboardAnalyticsPage.gates.whatsappTitle', 'WhatsApp tracking')}
          description={t('dashboardAnalyticsPage.gates.whatsappDescription', 'Enable Business GOLD to view WhatsApp leads.')}
        >
          <Card className="relative overflow-hidden rounded-xl border border-border bg-card shadow-none">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground">
                  {t('dashboardAnalyticsPage.whatsapp.cardTitle', 'WhatsApp clicks')}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-foreground tabular-nums">{stats.whatsappClicks}</div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1">
                {t('dashboardAnalyticsPage.whatsapp.caption', 'New direct contacts')}
              </p>
            </CardContent>
          </Card>
        </PremiumFeatureGate>

        <PremiumFeatureGate
          level="gold"
          title={t('dashboardAnalyticsPage.gates.bookingTitle', 'Booking tracking')}
          description={t('dashboardAnalyticsPage.gates.bookingDescription', 'Track external bookings with the GOLD plan.')}
        >
          <Card className="relative overflow-hidden rounded-xl border border-border bg-card shadow-none">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground">
                  {t('dashboardAnalyticsPage.booking.cardTitle', 'Affiliate links / bookings')}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-foreground tabular-nums">{stats.affiliateClicks}</div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1">
                {t('dashboardAnalyticsPage.booking.caption', 'Redirects to your links')}
              </p>
            </CardContent>
          </Card>
        </PremiumFeatureGate>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="relative overflow-hidden rounded-xl border border-border bg-card shadow-none">
          <PremiumFeatureGate
            level="growth"
            title={t('dashboardAnalyticsPage.gates.advancedTitle', 'Advanced analytics')}
            description={t('dashboardAnalyticsPage.gates.advancedDescription', 'Upgrade to Growth or Gold to unlock full review history.')}
          >
            <CardHeader>
              <CardTitle className="font-headline">
                {t('dashboardAnalyticsPage.timeline.title', 'Reviews over time')}
              </CardTitle>
              <CardDescription>
                {t('dashboardAnalyticsPage.timeline.description', 'Trend over the last 6 months')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/50" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                      }}
                      cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                    />
                    <Bar dataKey="reviews" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </PremiumFeatureGate>
        </Card>

        <Card className="relative overflow-hidden rounded-xl border border-border bg-card shadow-none">
          <PremiumFeatureGate
            level="growth"
            title={t('dashboardAnalyticsPage.gates.distributionTitle', 'Detailed distribution')}
            description={t('dashboardAnalyticsPage.gates.distributionDescription', 'Analyze your rating distribution in detail with Growth or Gold.')}
          >
            <CardHeader>
              <CardTitle className="font-headline">
                {t('dashboardAnalyticsPage.distribution.title', 'Rating distribution')}
              </CardTitle>
              <CardDescription>
                {t('dashboardAnalyticsPage.distribution.description', 'Breakdown by star count')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {stats.ratingDistribution.map(({ rating, count }) => {
                  const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                  return (
                    <div key={rating} className="flex items-center gap-4">
                      <div className="flex items-center gap-1 w-12">
                        <span className="font-bold text-lg">{rating}</span>
                        <Star className="h-4 w-4 fill-warning text-warning" />
                      </div>
                      <div className="flex-1 h-3 bg-secondary/50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-12 text-sm text-muted-foreground text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </PremiumFeatureGate>
        </Card>
      </div>
    </div>
  );
}
