'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Star, Building, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { useEffect, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generateSalaryMonthlyReport } from '@/app/actions/admin';
import { useToast } from '@/hooks/use-toast';

type MonthlyData = {
  name: string;
  utilisateurs: number;
  avis: number;
  etablissements: number;
};

type CategoryData = {
  name: string;
  value: number;
};

type CityData = {
  name: string;
  value: number;
};

type DashboardStats = {
  totalUsers: number;
  totalReviews: number;
  totalBusinesses: number;
  newUsersThisMonth: number;
  newReviewsThisMonth: number;
  newBusinessesThisMonth: number;
  userGrowthPercent: number;
  reviewGrowthPercent: number;
  businessGrowthPercent: number;
  monthlyData: MonthlyData[];
  categoryData: CategoryData[];
  cityData: CityData[];
};

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--chart-1))'];

export default function StatisticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient();
      const now = new Date();

      // Get totals
      const [usersResult, reviewsResult, businessesResult] = await Promise.all([
        supabase.from('profiles').select('id, created_at'),
        supabase.from('reviews').select('id, created_at'),
        supabase.from('businesses').select('id, created_at, category, city, quartier'),
      ]);

      const users = usersResult.data || [];
      const reviews = reviewsResult.data || [];
      const businesses = businessesResult.data || [];

      // Calculate this month's figures
      const thisMonthStart = startOfMonth(now);
      const thisMonthEnd = endOfMonth(now);

      const newUsersThisMonth = users.filter(u => {
        const d = new Date(u.created_at);
        return d >= thisMonthStart && d <= thisMonthEnd;
      }).length;

      const newReviewsThisMonth = reviews.filter(r => {
        const d = new Date(r.created_at);
        return d >= thisMonthStart && d <= thisMonthEnd;
      }).length;

      const newBusinessesThisMonth = businesses.filter(b => {
        const d = new Date(b.created_at);
        return d >= thisMonthStart && d <= thisMonthEnd;
      }).length;

      // Calculate last month's figures for growth %
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));

      const lastMonthUsers = users.filter(u => {
        const d = new Date(u.created_at);
        return d >= lastMonthStart && d <= lastMonthEnd;
      }).length;

      const lastMonthReviews = reviews.filter(r => {
        const d = new Date(r.created_at);
        return d >= lastMonthStart && d <= lastMonthEnd;
      }).length;

      const lastMonthBusinesses = businesses.filter(b => {
        const d = new Date(b.created_at);
        return d >= lastMonthStart && d <= lastMonthEnd;
      }).length;

      const calcGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      // Build monthly data for last 6 months
      const monthlyData: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        const monthUsers = users.filter(u => {
          const d = new Date(u.created_at);
          return d >= monthStart && d <= monthEnd;
        }).length;

        const monthReviews = reviews.filter(r => {
          const d = new Date(r.created_at);
          return d >= monthStart && d <= monthEnd;
        }).length;

        const monthBusinesses = businesses.filter(b => {
          const d = new Date(b.created_at);
          return d >= monthStart && d <= monthEnd;
        }).length;

        monthlyData.push({
          name: format(monthDate, 'MMM', { locale: fr }),
          utilisateurs: monthUsers,
          avis: monthReviews,
          etablissements: monthBusinesses,
        });
      }

      // Build category distribution
      const categoryCount: Record<string, number> = {};
      businesses.forEach(b => {
        const cat = b.category || 'Autre';
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      });

      const categoryData: CategoryData[] = Object.entries(categoryCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      // Build city distribution
      const cityCount: Record<string, number> = {};
      businesses.forEach(b => {
        const city = b.city || 'Non spécifié';
        cityCount[city] = (cityCount[city] || 0) + 1;
      });

      const cityData: CityData[] = Object.entries(cityCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      setStats({
        totalUsers: users.length,
        totalReviews: reviews.length,
        totalBusinesses: businesses.length,
        newUsersThisMonth,
        newReviewsThisMonth,
        newBusinessesThisMonth,
        userGrowthPercent: calcGrowth(newUsersThisMonth, lastMonthUsers),
        reviewGrowthPercent: calcGrowth(newReviewsThisMonth, lastMonthReviews),
        businessGrowthPercent: calcGrowth(newBusinessesThisMonth, lastMonthBusinesses),
        monthlyData,
        categoryData,
        cityData,
      });

      setLoading(false);
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Impossible de charger les statistiques.
      </div>
    );
  }

  const statCards = [
    {
      name: 'Utilisateurs inscrits',
      value: stats.totalUsers,
      newThisMonth: stats.newUsersThisMonth,
      growth: stats.userGrowthPercent,
      icon: <Users className="h-5 w-5" />,
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      name: 'Avis publiés',
      value: stats.totalReviews,
      newThisMonth: stats.newReviewsThisMonth,
      growth: stats.reviewGrowthPercent,
      icon: <Star className="h-5 w-5" />,
      gradient: 'from-amber-500 to-orange-600',
    },
    {
      name: 'Établissements',
      value: stats.totalBusinesses,
      newThisMonth: stats.newBusinessesThisMonth,
      growth: stats.businessGrowthPercent,
      icon: <Building className="h-5 w-5" />,
      gradient: 'from-blue-500 to-indigo-600',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Statistiques
        </h1>
        <p className="text-muted-foreground mt-1">
          Analysez les métriques clés et la croissance de la plateforme en temps réel.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Barometre des salaires</CardTitle>
          <CardDescription>
            Generez un snapshot mensuel a partir des vues analytiques salaires.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await generateSalaryMonthlyReport({ publish: false });
                if (result.status === 'success') {
                  toast({ title: 'Succes', description: result.message });
                } else {
                  toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
                }
              });
            }}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Generer brouillon
          </Button>
          <Button
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await generateSalaryMonthlyReport({ publish: true });
                if (result.status === 'success') {
                  toast({ title: 'Succes', description: result.message });
                } else {
                  toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
                }
              });
            }}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Generer et publier
          </Button>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.name} className="relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.gradient} opacity-10 rounded-full -mr-10 -mt-10`} />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </CardTitle>
              <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.gradient} text-white`}>
                {stat.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value.toLocaleString('fr-MA')}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-muted-foreground">
                  +{stat.newThisMonth} ce mois
                </span>
                {stat.growth !== 0 && (
                  <span className={`flex items-center gap-0.5 text-xs font-medium ${stat.growth > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {stat.growth > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {stat.growth > 0 ? '+' : ''}{stat.growth}%
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Croissance des utilisateurs</CardTitle>
            <CardDescription>Évolution sur les 6 derniers mois</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats.monthlyData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-muted-foreground" />
                <YAxis className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="utilisateurs"
                  stroke="hsl(var(--chart-4))"
                  strokeWidth={2}
                  fill="url(#colorUsers)"
                  name="Utilisateurs"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Reviews Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Volume des avis</CardTitle>
            <CardDescription>Nombre d'avis soumis par mois</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.monthlyData}>
                <defs>
                  <linearGradient id="colorReviews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-muted-foreground" />
                <YAxis className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar
                  dataKey="avis"
                  fill="url(#colorReviews)"
                  radius={[4, 4, 0, 0]}
                  name="Avis"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Businesses Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Nouvelles entreprises</CardTitle>
            <CardDescription>Entreprises ajoutées par mois</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats.monthlyData}>
                <defs>
                  <linearGradient id="colorBusinesses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-muted-foreground" />
                <YAxis className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="etablissements"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#colorBusinesses)"
                  name="Entreprises"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition par catégorie</CardTitle>
            <CardDescription>Distribution des entreprises</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Aucune donnée de catégorie disponible.
              </div>
            )}
          </CardContent>
        </Card>

        {/* City Distribution - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition par ville</CardTitle>
            <CardDescription>Distribution des entreprises par ville</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.cityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.cityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.cityData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Aucune donnée de ville disponible.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
