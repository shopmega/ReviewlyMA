'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Star, TrendingUp, Users, AlertCircle, Loader2, Zap } from "lucide-react";
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { cn } from '@/lib/utils';
import { PremiumFeatureGate } from '@/components/shared/PremiumFeatureGate';

type BusinessStats = {
  businessName: string;
  totalReviews: number;
  averageRating: number;
  monthlyData: { name: string; avis: number }[];
  ratingDistribution: { rating: number; count: number }[];
  views: number;
  leads: number;
  whatsappClicks: number;
  affiliateClicks: number;
};

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
  const { businessId, profile, loading: profileLoading, error: profileError } = useBusinessProfile();
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch analytics once businessId is available
  useEffect(() => {
    if (profileLoading || !businessId) return;
    if (profileError) {
      setLoading(false);
      return;
    }

    async function fetchAnalytics() {
      const supabase = createClient();

      // Fetch business info
      const { data: business } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('id', businessId)
        .single();

      if (!business) {
        setLoading(false);
        return;
      }

      // Fetch all reviews
      const { data: reviews } = await supabase
        .from('reviews')
        .select('id, rating, date, created_at')
        .eq('business_id', businessId);

      const reviewsList = reviews || [];
      const totalReviews = reviewsList.length;
      const averageRating = totalReviews > 0
        ? reviewsList.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

      // Calculate monthly data for last 6 months
      const now = new Date();
      const monthlyData: { name: string; avis: number }[] = [];

      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        const monthReviews = reviewsList.filter(r => {
          const d = new Date(r.created_at || r.date);
          return d >= monthStart && d <= monthEnd;
        }).length;

        monthlyData.push({
          name: format(monthDate, 'MMM', { locale: fr }),
          avis: monthReviews,
        });
      }

      // Calculate rating distribution
      const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
        rating,
        count: reviewsList.filter(r => r.rating === rating).length,
      }));

      // Fetch analytics events
      const { data: analytics } = await supabase
        .from('business_analytics')
        .select('*')
        .eq('business_id', businessId);

      const views = analytics?.filter(a => a.event_type === 'page_view').length || 0;
      const whatsappClicks = analytics?.filter(a => a.event_type === 'whatsapp_click').length || 0;
      const affiliateClicks = analytics?.filter(a => a.event_type === 'affiliate_click').length || 0;
      const leads = analytics?.filter(a => ['phone_click', 'website_click', 'contact_form', 'whatsapp_click', 'affiliate_click'].includes(a.event_type)).length || 0;

      setStats({
        businessName: business.name,
        totalReviews,
        averageRating,
        monthlyData,
        ratingDistribution,
        views,
        leads,
        whatsappClicks,
        affiliateClicks
      });

      setLoading(false);
    }

    fetchAnalytics();
  }, [businessId, profileLoading, profileError]);

  if (profileLoading || loading) {
    return <AnalyticsSkeleton />;
  }

  if (profileError || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="p-4 bg-destructive/10 rounded-full text-destructive">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold font-headline">Accès refusé</h1>
        <p className="text-muted-foreground">{profileError || "Erreur inconnue"}</p>
        <Button asChild>
          <Link href="/pour-les-pros">Revendiquer une entreprise</Link>
        </Button>
      </div>
    );
  }

  const statCards = [
    { name: 'Total avis', value: stats.totalReviews.toString(), icon: Star, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { name: 'Note moyenne', value: stats.averageRating.toFixed(1), icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { name: 'Vues du profil', value: stats.views.toString(), icon: Eye, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Conversion Leads', value: stats.leads.toString(), icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-500/10' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Statistiques</h1>
        <p className="text-muted-foreground text-lg">
          Analyse des performances pour <span className="font-semibold text-foreground">{stats.businessName}</span>.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.name} className="border-white/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground font-body uppercase tracking-in-wider">
                {stat.name}
              </CardTitle>
              <div className={cn("p-2 rounded-lg", stat.bg, stat.color)}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-headline">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* GOLD Lead Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <PremiumFeatureGate level="gold" title="WhatsApp Tracking" description="Activez le plan Business GOLD pour voir vos leads WhatsApp.">
          <Card className="border-white/20 bg-emerald-50 dark:bg-emerald-950/20 shadow-lg relative overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Clics WhatsApp</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-emerald-600 tabular-nums">{stats.whatsappClicks}</div>
              <p className="text-[10px] uppercase font-bold text-emerald-700/60 mt-1">Nouveaux contacts directs</p>
            </CardContent>
          </Card>
        </PremiumFeatureGate>

        <PremiumFeatureGate level="gold" title="Booking Tracking" description="Suivez vos réservations externes avec le plan GOLD.">
          <Card className="border-white/20 bg-indigo-50 dark:bg-indigo-950/20 shadow-lg relative overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-indigo-700 dark:text-indigo-400">Liens Affiliés / Résas</CardTitle>
                <TrendingUp className="h-4 w-4 text-indigo-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-indigo-600 tabular-nums">{stats.affiliateClicks}</div>
              <p className="text-[10px] uppercase font-bold text-indigo-700/60 mt-1">Redirections vers vos liens</p>
            </CardContent>
          </Card>
        </PremiumFeatureGate>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-white/20 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg shadow-lg relative overflow-hidden">
          <PremiumFeatureGate level="growth" title="Analyses Avancées" description="Passez au statut Premium pour débloquer l'historique complet des avis.">
            <CardHeader>
              <CardTitle className="font-headline">Avis au Fil du Temps</CardTitle>
              <CardDescription>Évolution sur les 6 derniers mois</CardDescription>
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
                        backgroundColor: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                    />
                    <Bar
                      dataKey="avis"
                      fill="hsl(var(--primary))"
                      radius={[6, 6, 0, 0]}
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </PremiumFeatureGate>
        </Card>

        <Card className="border-white/20 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg shadow-lg relative overflow-hidden">
          <PremiumFeatureGate level="growth" title="Distribution Détaillée" description="Analysez précisément la répartition de vos notes avec Premium.">
            <CardHeader>
              <CardTitle className="font-headline">Distribution des Notes</CardTitle>
              <CardDescription>Répartition par nombre d'étoiles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {stats.ratingDistribution.map(({ rating, count }) => {
                  const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                  return (
                    <div key={rating} className="flex items-center gap-4">
                      <div className="flex items-center gap-1 w-12">
                        <span className="font-bold text-lg">{rating}</span>
                        <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                      </div>
                      <div className="flex-1 h-3 bg-secondary/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-500"
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
