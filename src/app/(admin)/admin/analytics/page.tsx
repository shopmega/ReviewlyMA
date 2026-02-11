'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Users, Eye, Star, AlertTriangle, Activity, Download, Calendar, Filter, BarChart3, PieChart as PieChartIcon, Clock, CheckCircle, XCircle, Zap, Search } from 'lucide-react';
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
  ResponsiveContainer
} from 'recharts';
import { getAdminAnalytics } from '@/app/actions/analytics';

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
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('overview');

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
      ['Metric', 'Value'],
      ['Total Users', data.overview.totalUsers],
      ['Active Users', data.overview.activeUsers],
      ['Total Businesses', data.overview.totalBusinesses],
      ['Total Reviews', data.overview.totalReviews],
      ['Average Rating', data.overview.avgRating],
      ['Total Revenue', data.overview.totalRevenue + ' MAD'],
      ['Total Messages', data.overview.totalMessages]
    ].map(row => row.join(',')).join('\n');

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary border-t-2 border-t-transparent"></div>
        <p className="text-muted-foreground font-medium animate-pulse">Chargement des données...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="max-w-md mx-auto mt-20 p-8 text-center border-0 shadow-2xl rounded-3xl">
        <AlertTriangle className="mx-auto h-16 w-16 text-amber-500 mb-6" />
        <h3 className="text-2xl font-black mb-3 text-slate-900 dark:text-white">Données indisponibles</h3>
        <p className="text-muted-foreground mb-6">Impossible de récupérer les statistiques pour le moment.</p>
        <Button onClick={fetchAnalyticsData} className="rounded-xl px-10 h-12 shadow-lg shadow-primary/20">
          Réessayer
        </Button>
      </Card>
    );
  }

  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316'];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <Badge className="mb-4 bg-primary/10 text-primary border-none font-bold px-3 py-1">Insights Hub</Badge>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Analyse de Performance</h1>
          <p className="text-muted-foreground mt-2 font-medium">Visualisez l'évolution et l'engagement de votre plateforme</p>
        </div>
        <div className="flex bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-1.5 rounded-2xl border border-border/50 shadow-sm gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-44 h-10 border-none bg-transparent hover:bg-muted font-bold rounded-xl transition-colors">
              <Calendar className="mr-2 h-4 w-4 text-primary" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="7d">7 derniers jours</SelectItem>
              <SelectItem value="30d">30 derniers jours</SelectItem>
              <SelectItem value="90d">90 derniers jours</SelectItem>
              <SelectItem value="1y">L'année dernière</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportData} variant="ghost" className="h-10 rounded-xl font-bold hover:bg-primary/10 hover:text-primary transition-all">
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Utilisateurs Totaux', value: data.overview.totalUsers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Utilisateurs Actifs', value: data.overview.activeUsers, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Recherches Totales', value: data.overview.totalSearches || 0, icon: Search, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Revenus Estimés (Premium)', value: `${data.overview.totalRevenue.toLocaleString()} MAD`, icon: Zap, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        ].map((stat, i) => (
          <Card key={i} className="border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                {stat.label}
              </CardTitle>
              <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{stat.value}</div>
              <div className="mt-2 flex items-center text-[10px] text-muted-foreground font-bold">
                <TrendingUp className="h-3 w-3 mr-1 text-emerald-500" />
                Croissance positive ce mois
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs value={selectedMetric} onValueChange={setSelectedMetric} className="space-y-8">
        <TabsList className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-border/50 h-14 p-1.5 rounded-2xl w-full max-w-lg">
          <TabsTrigger value="overview" className="flex-1 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm transition-all">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="users" className="flex-1 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm transition-all">Utilisateurs</TabsTrigger>
          <TabsTrigger value="businesses" className="flex-1 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm transition-all">Entreprises</TabsTrigger>
          <TabsTrigger value="search" className="flex-1 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm transition-all">Recherche</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg font-bold">Tendance de croissance</CardTitle>
                <CardDescription>Évolution mensuelle des nouveaux utilisateurs</CardDescription>
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
                <CardTitle className="text-lg font-bold">Répartition par Ville</CardTitle>
                <CardDescription>Concentration géographique des entreprises</CardDescription>
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
              <CardTitle className="text-2xl font-black">Engagement Utilisateurs</CardTitle>
              <CardDescription>Flux d'acquisition sur les 6 derniers mois</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0 pt-10">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.userMetrics.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontWeight: 600 }} />
                  <Tooltip
                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                    contentStyle={{ borderRadius: '16px', border: 'none' }}
                  />
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
                <CardTitle className="text-lg font-bold">Croissance Pro</CardTitle>
                <CardDescription>Nouvelles entreprises par mois</CardDescription>
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
                <p className="text-indigo-100 font-bold uppercase tracking-widest text-xs">Engagement Propriétaires</p>
                <div className="text-6xl font-black">
                  {Math.round((data.overview.totalBusinesses / (data.overview.totalUsers || 1)) * 100)}%
                </div>
                <p className="text-indigo-100 font-medium text-sm">Taux de revendication estimé</p>
                <div className="pt-4">
                  <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full shadow-[0_0_10px_white]"
                      style={{ width: `${Math.min(100, (data.overview.totalBusinesses / (data.overview.totalUsers || 1)) * 100)}%` }}
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
                <CardTitle className="text-lg font-bold">Volumes de Recherche</CardTitle>
                <CardDescription>Évolution des requêtes sur 6 mois</CardDescription>
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
                <CardTitle className="text-lg font-bold">Top Mots-Clés</CardTitle>
                <CardDescription>Requêtes les plus fréquentes</CardDescription>
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
                      <Badge variant="secondary" className="rounded-lg font-bold">{query.value} searches</Badge>
                    </div>
                  ))}
                  {(!data.searchMetrics?.topQueries || data.searchMetrics.topQueries.length === 0) && (
                    <div className="text-center py-10 text-muted-foreground font-medium italic">
                      Données de recherche insuffisantes
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
