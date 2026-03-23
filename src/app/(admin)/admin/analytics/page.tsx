'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Users, AlertTriangle, Activity, Download, Calendar, PieChart as PieChartIcon, Zap, Search, BriefcaseBusiness, FileBadge2, Link2 } from 'lucide-react';
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
import { useI18n } from '@/components/providers/i18n-provider';

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
      <Card className="max-w-md mx-auto mt-20 p-8 text-center border-0 shadow-2xl rounded-3xl">
        <AlertTriangle className="mx-auto h-16 w-16 text-amber-500 mb-6" />
        <h3 className="text-2xl font-black mb-3 text-slate-900 dark:text-white">
          {t('adminAnalyticsPage.unavailable.title', 'Data unavailable')}
        </h3>
        <p className="text-muted-foreground mb-6">
          {t('adminAnalyticsPage.unavailable.description', 'Unable to load analytics right now.')}
        </p>
        <Button onClick={fetchAnalyticsData} className="rounded-xl px-10 h-12 shadow-lg shadow-primary/20">
          {t('adminAnalyticsPage.unavailable.retry', 'Retry')}
        </Button>
      </Card>
    );
  }

  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316'];
  const ownerClaimRate = Math.round((data.overview.totalBusinesses / (data.overview.totalUsers || 1)) * 100);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <Badge className="mb-4 bg-primary/10 text-primary border-none font-bold px-3 py-1">
            {t('adminAnalyticsPage.header.badge', 'Insights hub')}
          </Badge>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            {t('adminAnalyticsPage.header.title', 'Performance analytics')}
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">
            {t('adminAnalyticsPage.header.subtitle', 'Track growth and engagement across the platform')}
          </p>
        </div>
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
      </div>

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
          <Card key={i} className="border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">{stat.label}</CardTitle>
              <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{stat.value}</div>
              <div className="mt-2 flex items-center text-[10px] text-muted-foreground font-bold">
                <TrendingUp className="h-3 w-3 mr-1 text-emerald-500" />
                {t('adminAnalyticsPage.stats.growthPositiveThisMonth', 'Positive growth this month')}
              </div>
            </CardContent>
          </Card>
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
            <Card className="border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg font-bold">{t('adminAnalyticsPage.overview.growthTrend.title', 'Growth trend')}</CardTitle>
                <CardDescription>{t('adminAnalyticsPage.overview.growthTrend.description', 'Monthly new-user growth')}</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0 pt-6">
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
                    <Tooltip
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                      cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
                    />
                    <Area type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorUsers)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg font-bold">
                  {t('adminAnalyticsPage.overview.cityDistribution.title', 'City distribution')}
                </CardTitle>
                <CardDescription>
                  {t('adminAnalyticsPage.overview.cityDistribution.description', 'Geographic concentration of businesses')}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0 flex flex-col items-center">
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
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontWeight: 600, fontSize: '12px' }} />
                  </RechartsPieChartComponent>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="animate-in fade-in duration-300">
          <Card className="border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl p-8">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-2xl font-black">{t('adminAnalyticsPage.users.title', 'User engagement')}</CardTitle>
              <CardDescription>{t('adminAnalyticsPage.users.description', 'Acquisition flow over the last 6 months')}</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0 pt-10">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.userMetrics.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontWeight: 600 }} />
                  <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} contentStyle={{ borderRadius: '16px', border: 'none' }} />
                  <Bar dataKey="users" fill="#6366f1" radius={[10, 10, 4, 4]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="businesses" className="animate-in fade-in duration-300 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg font-bold">{t('adminAnalyticsPage.businesses.growth.title', 'Business growth')}</CardTitle>
                <CardDescription>{t('adminAnalyticsPage.businesses.growth.description', 'New businesses per month')}</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0 pt-6">
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
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                    <Area type="monotone" dataKey="businesses" stroke="#a855f7" strokeWidth={4} fillOpacity={1} fill="url(#colorBiz)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-3xl p-8 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 transform scale-150">
                <PieChartIcon className="h-40 w-40" />
              </div>
              <div className="relative z-10 text-center space-y-4">
                <p className="text-indigo-100 font-bold uppercase tracking-widest text-xs">
                  {t('adminAnalyticsPage.businesses.ownerEngagement.title', 'Owner engagement')}
                </p>
                <div className="text-6xl font-black">{ownerClaimRate}%</div>
                <p className="text-indigo-100 font-medium text-sm">
                  {t('adminAnalyticsPage.businesses.ownerEngagement.claimRate', 'Estimated claim rate')}
                </p>
                <div className="pt-4">
                  <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full shadow-[0_0_10px_white]"
                      style={{ width: `${Math.min(100, ownerClaimRate)}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="search" className="animate-in fade-in duration-300 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg font-bold">{t('adminAnalyticsPage.search.volume.title', 'Search volumes')}</CardTitle>
                <CardDescription>{t('adminAnalyticsPage.search.volume.description', 'Search trend over 6 months')}</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0 pt-6">
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
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                    <Area type="monotone" dataKey="searches" stroke="#f59e0b" strokeWidth={4} fillOpacity={1} fill="url(#colorSearch)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg font-bold">{t('adminAnalyticsPage.search.topQueries.title', 'Top queries')}</CardTitle>
                <CardDescription>{t('adminAnalyticsPage.search.topQueries.description', 'Most frequent search terms')}</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pt-6">
                <div className="space-y-4">
                  {data.searchMetrics?.topQueries.map((query, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-white/20">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs">
                          #{i + 1}
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{query.name}</span>
                      </div>
                      <Badge variant="secondary" className="rounded-lg font-bold">
                        {tf('adminAnalyticsPage.search.topQueries.countLabel', '{count} searches', { count: query.value })}
                      </Badge>
                    </div>
                  ))}
                  {(!data.searchMetrics?.topQueries || data.searchMetrics.topQueries.length === 0) && (
                    <div className="text-center py-10 text-muted-foreground font-medium italic">
                      {t('adminAnalyticsPage.search.topQueries.empty', 'Insufficient search data')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
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
              <Card key={stat.label} className="border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">{stat.label}</CardTitle>
                  <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black">{numberFormatter.format(Number(stat.value) || 0)}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg font-bold">Offer quality snapshot</CardTitle>
                <CardDescription>Marketplace-level hiring signal quality from approved linked offers.</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0 pt-6">
                <div className="space-y-5">
                  {[
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
                  ].map((item) => (
                    <div key={item.label} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
                        <span className="font-bold text-slate-900 dark:text-white">{Math.round(item.value)}%</span>
                      </div>
                      <div className="h-3 bg-secondary/50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${Math.max(0, Math.min(item.value, 100))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg font-bold">Top employers with hiring signals</CardTitle>
                <CardDescription>Employers with the largest approved analyzed-offer footprint.</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pt-6">
                <div className="space-y-4">
                  {(data.jobOfferMetrics?.topEmployers || []).length > 0 ? data.jobOfferMetrics?.topEmployers.map((employer, index) => (
                    <div key={employer.businessId} className="flex items-center justify-between gap-4 p-4 bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-white/20">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          #{index + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{employer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {employer.approvedOfferCount} approved offers
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{Math.round(employer.salaryDisclosureRate)}% disclosed</p>
                        <p className="text-xs text-muted-foreground">{Math.round(employer.avgTransparencyScore)} clarity</p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-sm text-muted-foreground">
                      No job-offer employer signals yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg font-bold">Mapping queue health</CardTitle>
                <CardDescription>Operational visibility for unresolved employer links and moderation flow.</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ['Queue rows', data.jobOfferMetrics?.mappingQueueSize || 0],
                    ['Unresolved', data.jobOfferMetrics?.unresolvedMappings || 0],
                    ['Medium confidence', data.jobOfferMetrics?.mediumConfidenceMappings || 0],
                    ['Low or none', data.jobOfferMetrics?.lowConfidenceMappings || 0],
                    ['Manual relinks', data.jobOfferMetrics?.manualRelinks || 0],
                    ['Auto backfills', data.jobOfferMetrics?.automatedBackfills || 0],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/20 bg-white/40 dark:bg-slate-800/40 p-4">
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                      <p className="mt-2 text-2xl font-black">{numberFormatter.format(Number(value) || 0)}</p>
                    </div>
                  ))}
                </div>
                <Button asChild variant="outline" className="rounded-xl font-bold">
                  <Link href="/admin/job-offers">Open mapping queue</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg font-bold">Recurring unresolved employers</CardTitle>
                <CardDescription>Company names that most often stay unmapped and should be reviewed or backfilled.</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pt-6">
                <div className="space-y-4">
                  {(data.jobOfferMetrics?.topUnresolvedCompanies || []).length > 0 ? data.jobOfferMetrics?.topUnresolvedCompanies.map((company, index) => (
                    <div key={`${company.name}-${index}`} className="flex items-center justify-between gap-4 p-4 bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-white/20">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{company.name}</p>
                        <p className="text-xs text-muted-foreground">Needs business resolution</p>
                      </div>
                      <Badge variant="secondary" className="rounded-lg font-bold">
                        {company.count}
                      </Badge>
                    </div>
                  )) : (
                    <div className="text-sm text-muted-foreground">
                      No unresolved-employer concentration right now.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
