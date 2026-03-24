'use client';

import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, AlertTriangle, Activity, Download, Calendar, Zap, Search, BriefcaseBusiness, FileBadge2, Link2 } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChartComponent,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getAdminAnalytics } from '@/app/actions/analytics';
import {
  AnalyticsProgressMetricsCard,
  AnalyticsQueueHealthCard,
  AnalyticsRankedQueryList,
  AnalyticsSectionCard,
  analyticsTooltipStyle,
  AnalyticsSpotlightCard,
  AnalyticsTopEmployersCard,
  AnalyticsUnresolvedCompaniesCard,
} from '@/components/admin/analytics/AdminAnalyticsPanels';
import { useI18n } from '@/components/providers/i18n-provider';
import { AppEmptyState } from '@/components/shared/AppEmptyState';
import { MetricCard } from '@/components/shared/MetricCard';
import { PageIntro } from '@/components/shared/PageIntro';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalBusinesses: number;
    totalReviews: number;
    avgRating: number;
    totalRevenue: number;
    totalMessages: number;
    totalSearches: number;
  };
  userMetrics: {
    userGrowth: Array<{ month: string; users: number }>;
  };
  businessMetrics: {
    businessGrowth: Array<{ month: string; businesses: number }>;
    categoryDistribution: Array<{ name: string; value: number }>;
    cityDistribution: Array<{ name: string; value: number }>;
  };
  searchMetrics?: {
    searchGrowth: Array<{ month: string; searches: number }>;
    topQueries: Array<{ name: string; value: number }>;
  };
  jobOfferMetrics?: {
    totalJobOffers: number;
    approvedJobOffers: number;
    mappedApprovedJobOffers: number;
    companiesWithSignals: number;
    avgSalaryDisclosure: number;
    avgOfferTransparency: number;
    lowConfidenceRate: number;
    mappingQueueSize: number;
    unresolvedMappings: number;
    mediumConfidenceMappings: number;
    lowConfidenceMappings: number;
    manualRelinks: number;
    automatedBackfills: number;
    unlinks: number;
    topUnresolvedCompanies: Array<{
      name: string;
      count: number;
    }>;
    topEmployers: Array<{
      businessId: string;
      name: string;
      approvedOfferCount: number;
      salaryDisclosureRate: number;
      avgTransparencyScore: number;
    }>;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const { t, tf, locale } = useI18n();

  const numberLocale = locale === 'fr' ? 'fr-FR' : locale === 'ar' ? 'ar-MA' : 'en-US';
  const numberFormatter = useMemo(() => new Intl.NumberFormat(numberLocale), [numberLocale]);
  const formatMad = (value: number) => `${numberFormatter.format(value)} MAD`;

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const realData = await getAdminAnalytics();
      if (realData) {
        setData(realData as unknown as AnalyticsData);
      }
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    if (!data) return;

    const csvContent = [
      [
        t('adminAnalyticsPage.export.metricHeader', 'Metric'),
        t('adminAnalyticsPage.export.valueHeader', 'Value'),
      ],
      [t('adminAnalyticsPage.stats.totalUsers', 'Total users'), data.overview.totalUsers],
      [t('adminAnalyticsPage.stats.activeUsers', 'Active users'), data.overview.activeUsers],
      [t('adminAnalyticsPage.export.totalBusinesses', 'Total businesses'), data.overview.totalBusinesses],
      [t('adminAnalyticsPage.export.totalReviews', 'Total reviews'), data.overview.totalReviews],
      [t('adminAnalyticsPage.export.averageRating', 'Average rating'), data.overview.avgRating],
      [t('adminAnalyticsPage.stats.estimatedRevenue', 'Estimated revenue (premium)'), formatMad(data.overview.totalRevenue)],
      [t('adminAnalyticsPage.export.totalMessages', 'Total messages'), data.overview.totalMessages],
      [t('adminAnalyticsPage.stats.totalSearches', 'Total searches'), data.overview.totalSearches || 0],
      ['Total job offers', data.jobOfferMetrics?.totalJobOffers || 0],
      ['Approved job offers', data.jobOfferMetrics?.approvedJobOffers || 0],
      ['Mapped approved job offers', data.jobOfferMetrics?.mappedApprovedJobOffers || 0],
      ['Companies with hiring signals', data.jobOfferMetrics?.companiesWithSignals || 0],
      ['Mapping queue size', data.jobOfferMetrics?.mappingQueueSize || 0],
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary border-t-2 border-t-transparent" />
        <p className="text-muted-foreground font-medium animate-pulse">
          {t('adminAnalyticsPage.loading.data', 'Loading analytics data...')}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <AppEmptyState
        className="max-w-md mx-auto mt-20"
        icon={<AlertTriangle className="h-8 w-8 text-amber-500" />}
        title={t('adminAnalyticsPage.unavailable.title', 'Data unavailable')}
        description={t('adminAnalyticsPage.unavailable.description', 'Unable to load analytics right now.')}
        action={
          <Button onClick={fetchAnalyticsData} className="rounded-xl px-10 h-12 shadow-lg shadow-primary/20">
            {t('adminAnalyticsPage.unavailable.retry', 'Retry')}
          </Button>
        }
      />
    );
  }

  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316'];
  const ownerClaimRate = Math.round((data.overview.totalBusinesses / (data.overview.totalUsers || 1)) * 100);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageIntro
        badge={t('adminAnalyticsPage.header.badge', 'Insights hub')}
        title={t('adminAnalyticsPage.header.title', 'Performance analytics')}
        description={t('adminAnalyticsPage.header.subtitle', 'Track growth and engagement across the platform')}
        actions={
          <div className="flex bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-1.5 rounded-2xl border border-border/50 shadow-sm gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-44 h-10 border-none bg-transparent hover:bg-muted font-bold rounded-xl transition-colors">
                <Calendar className="mr-2 h-4 w-4 text-primary" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="7d">{t('adminAnalyticsPage.timeRange.last7Days', 'Last 7 days')}</SelectItem>
                <SelectItem value="30d">{t('adminAnalyticsPage.timeRange.last30Days', 'Last 30 days')}</SelectItem>
                <SelectItem value="90d">{t('adminAnalyticsPage.timeRange.last90Days', 'Last 90 days')}</SelectItem>
                <SelectItem value="1y">{t('adminAnalyticsPage.timeRange.lastYear', 'Last year')}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportData} variant="ghost" className="h-10 rounded-xl font-bold hover:bg-primary/10 hover:text-primary transition-all">
              <Download className="h-4 w-4 mr-2" />
              {t('adminAnalyticsPage.actions.exportCsv', 'Export CSV')}
            </Button>
          </div>
        }
        className="rounded-3xl border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: t('adminAnalyticsPage.stats.totalUsers', 'Total users'),
            value: data.overview.totalUsers,
            icon: Users,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
          },
          {
            label: t('adminAnalyticsPage.stats.activeUsers', 'Active users'),
            value: data.overview.activeUsers,
            icon: Activity,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
          },
          {
            label: t('adminAnalyticsPage.stats.totalSearches', 'Total searches'),
            value: data.overview.totalSearches || 0,
            icon: Search,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
          },
          {
            label: t('adminAnalyticsPage.stats.estimatedRevenue', 'Estimated revenue (premium)'),
            value: formatMad(data.overview.totalRevenue),
            icon: Zap,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10',
          },
        ].map((stat, i) => (
          <MetricCard
            key={i}
            title={stat.label}
            value={String(stat.value)}
            icon={stat.icon}
            className="border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl group"
            headerClassName="pb-2"
            titleClassName="text-xs font-black uppercase tracking-widest text-muted-foreground"
            valueClassName="text-3xl font-black"
            iconWrapClassName={`${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}
          />
        ))}
      </div>

      <Tabs value={selectedMetric} onValueChange={setSelectedMetric} className="space-y-8">
        <TabsList className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-border/50 h-14 p-1.5 rounded-2xl w-full max-w-lg">
          <TabsTrigger value="overview" className="flex-1 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm transition-all">
            {t('adminAnalyticsPage.tabs.overview', 'Overview')}
          </TabsTrigger>
          <TabsTrigger value="users" className="flex-1 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm transition-all">
            {t('adminAnalyticsPage.tabs.users', 'Users')}
          </TabsTrigger>
          <TabsTrigger value="businesses" className="flex-1 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm transition-all">
            {t('adminAnalyticsPage.tabs.businesses', 'Businesses')}
          </TabsTrigger>
          <TabsTrigger value="jobs" className="flex-1 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm transition-all">
            Job offers
          </TabsTrigger>
          <TabsTrigger value="search" className="flex-1 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm transition-all">
            {t('adminAnalyticsPage.tabs.search', 'Search')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <AnalyticsSectionCard
              title={t('adminAnalyticsPage.overview.growthTrend.title', 'Growth trend')}
              description={t('adminAnalyticsPage.overview.growthTrend.description', 'Monthly new-user growth')}
            >
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={data.userMetrics.userGrowth}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                    <Tooltip contentStyle={analyticsTooltipStyle} cursor={{ stroke: '#6366f1', strokeWidth: 2 }} />
                    <Area type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorUsers)" />
                  </AreaChart>
                </ResponsiveContainer>
            </AnalyticsSectionCard>

            <AnalyticsSectionCard
              title={t('adminAnalyticsPage.overview.cityDistribution.title', 'City distribution')}
              description={t('adminAnalyticsPage.overview.cityDistribution.description', 'Geographic concentration of businesses')}
              contentClassName="px-0 pb-0 flex flex-col items-center"
            >
                <ResponsiveContainer width="100%" height={280}>
                  <RechartsPieChartComponent>
                    <Pie
                      data={data.businessMetrics.cityDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {data.businessMetrics.cityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="stroke-background stroke-[4px]" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={analyticsTooltipStyle} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontWeight: 600, fontSize: '12px' }} />
                  </RechartsPieChartComponent>
                </ResponsiveContainer>
            </AnalyticsSectionCard>
          </div>
        </TabsContent>

        <TabsContent value="users" className="animate-in fade-in duration-300">
          <AnalyticsSectionCard
            title={t('adminAnalyticsPage.users.title', 'User engagement')}
            description={t('adminAnalyticsPage.users.description', 'Acquisition flow over the last 6 months')}
            className="border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl p-8"
            contentClassName="px-0 pb-0 pt-10"
          >
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.userMetrics.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontWeight: 600 }} />
                  <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} contentStyle={analyticsTooltipStyle} />
                  <Bar dataKey="users" fill="#6366f1" radius={[10, 10, 4, 4]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
          </AnalyticsSectionCard>
        </TabsContent>

        <TabsContent value="businesses" className="animate-in fade-in duration-300 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <AnalyticsSectionCard
              title={t('adminAnalyticsPage.businesses.growth.title', 'Business growth')}
              description={t('adminAnalyticsPage.businesses.growth.description', 'New businesses per month')}
              className="lg:col-span-2 border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl p-6"
            >
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.businessMetrics.businessGrowth}>
                    <defs>
                      <linearGradient id="colorBiz" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontWeight: 600 }} />
                    <Tooltip contentStyle={analyticsTooltipStyle} />
                    <Area type="monotone" dataKey="businesses" stroke="#a855f7" strokeWidth={4} fillOpacity={1} fill="url(#colorBiz)" />
                  </AreaChart>
                </ResponsiveContainer>
            </AnalyticsSectionCard>

            <AnalyticsSpotlightCard
              eyebrow={t('adminAnalyticsPage.businesses.ownerEngagement.title', 'Owner engagement')}
              value={`${ownerClaimRate}%`}
              description={t('adminAnalyticsPage.businesses.ownerEngagement.claimRate', 'Estimated claim rate')}
            />
          </div>
        </TabsContent>

        <TabsContent value="search" className="animate-in fade-in duration-300 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <AnalyticsSectionCard
              title={t('adminAnalyticsPage.search.volume.title', 'Search volumes')}
              description={t('adminAnalyticsPage.search.volume.description', 'Search trend over 6 months')}
            >
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={data.searchMetrics?.searchGrowth}>
                    <defs>
                      <linearGradient id="colorSearch" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontWeight: 600 }} />
                    <Tooltip contentStyle={analyticsTooltipStyle} />
                    <Area type="monotone" dataKey="searches" stroke="#f59e0b" strokeWidth={4} fillOpacity={1} fill="url(#colorSearch)" />
                  </AreaChart>
                </ResponsiveContainer>
            </AnalyticsSectionCard>

            <AnalyticsRankedQueryList
              title={t('adminAnalyticsPage.search.topQueries.title', 'Top queries')}
              description={t('adminAnalyticsPage.search.topQueries.description', 'Most frequent search terms')}
              queries={data.searchMetrics?.topQueries || []}
              countLabel={(count) => tf('adminAnalyticsPage.search.topQueries.countLabel', '{count} searches', { count })}
              emptyMessage={t('adminAnalyticsPage.search.topQueries.empty', 'Insufficient search data')}
            />
          </div>
        </TabsContent>

        <TabsContent value="jobs" className="animate-in fade-in duration-300 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {[
              {
                label: 'Offers analyzed',
                value: data.jobOfferMetrics?.totalJobOffers || 0,
                icon: BriefcaseBusiness,
                color: 'text-sky-500',
                bg: 'bg-sky-500/10',
              },
              {
                label: 'Approved offers',
                value: data.jobOfferMetrics?.approvedJobOffers || 0,
                icon: Activity,
                color: 'text-emerald-500',
                bg: 'bg-emerald-500/10',
              },
              {
                label: 'Mapped approved offers',
                value: data.jobOfferMetrics?.mappedApprovedJobOffers || 0,
                icon: Link2,
                color: 'text-violet-500',
                bg: 'bg-violet-500/10',
              },
              {
                label: 'Companies with signals',
                value: data.jobOfferMetrics?.companiesWithSignals || 0,
                icon: FileBadge2,
                color: 'text-amber-500',
                bg: 'bg-amber-500/10',
              },
            ].map((stat) => (
              <MetricCard
                key={stat.label}
                title={stat.label}
                value={numberFormatter.format(Number(stat.value) || 0)}
                icon={stat.icon}
                className="border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl"
                titleClassName="text-xs font-black uppercase tracking-widest text-muted-foreground"
                valueClassName="text-3xl font-black"
                iconWrapClassName={`${stat.bg} ${stat.color}`}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <AnalyticsProgressMetricsCard
              title="Offer quality snapshot"
              description="Marketplace-level hiring signal quality from approved linked offers."
              items={[
                {
                  label: 'Average salary disclosure',
                  value: data.jobOfferMetrics?.avgSalaryDisclosure || 0,
                },
                {
                  label: 'Average offer transparency',
                  value: data.jobOfferMetrics?.avgOfferTransparency || 0,
                },
                {
                  label: 'Low-confidence analysis rate',
                  value: data.jobOfferMetrics?.lowConfidenceRate || 0,
                },
              ]}
            />

            <AnalyticsTopEmployersCard
              title="Top employers with hiring signals"
              description="Employers with the largest approved analyzed-offer footprint."
              employers={data.jobOfferMetrics?.topEmployers || []}
              emptyMessage="No job-offer employer signals yet."
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <AnalyticsQueueHealthCard
              title="Mapping queue health"
              description="Operational visibility for unresolved employer links and moderation flow."
              stats={[
                { label: 'Queue rows', value: data.jobOfferMetrics?.mappingQueueSize || 0 },
                { label: 'Unresolved', value: data.jobOfferMetrics?.unresolvedMappings || 0 },
                { label: 'Medium confidence', value: data.jobOfferMetrics?.mediumConfidenceMappings || 0 },
                { label: 'Low or none', value: data.jobOfferMetrics?.lowConfidenceMappings || 0 },
                { label: 'Manual relinks', value: data.jobOfferMetrics?.manualRelinks || 0 },
                { label: 'Auto backfills', value: data.jobOfferMetrics?.automatedBackfills || 0 },
              ]}
              buttonLabel="Open mapping queue"
            />

            <AnalyticsUnresolvedCompaniesCard
              title="Recurring unresolved employers"
              description="Company names that most often stay unmapped and should be reviewed or backfilled."
              companies={data.jobOfferMetrics?.topUnresolvedCompanies || []}
              itemDescription="Needs business resolution"
              emptyMessage="No unresolved-employer concentration right now."
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
