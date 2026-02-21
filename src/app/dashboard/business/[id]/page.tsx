'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBusiness } from '@/contexts/BusinessContext';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Star, Eye, TrendingUp, MessageSquare, Settings, Users } from 'lucide-react';
import Link from 'next/link';
import { getAuthorDisplayName, getAuthorInitials } from '@/lib/utils/anonymous-reviews';

type BusinessData = {
  id: string;
  name: string;
  overall_rating: number;
  slug?: string;
};

type RecentReview = {
  id: number;
  title: string | null;
  content: string | null;
  rating: number;
  author_name: string;
  is_anonymous?: boolean;
  user_id?: string;
  date: string;
};

type DashboardStats = {
  business: BusinessData;
  totalReviews: number;
  averageRating: number;
  recentReviews: RecentReview[];
  views: number;
  leads: number;
};

export default function BusinessDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const { allBusinesses, currentBusiness, switchBusiness, canManageBusiness } = useBusiness();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) return;

    setBusinessId(id);

    if (!canManageBusiness(id)) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to manage this business.',
        variant: 'destructive',
      });
      router.push('/dashboard');
      return;
    }

    // Switch to the selected business
    switchBusiness(id);
  }, [params.id, router, switchBusiness, canManageBusiness, toast]);

  useEffect(() => {
    if (!businessId) return;

    async function fetchDashboardData() {
      const supabase = createClient();

      // Fetch business info
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, overall_rating')
        .eq('id', businessId)
        .single();

      if (businessError || !businessData) {
        setLoading(false);
        toast({
          title: 'Error',
          description: 'Failed to load business data',
          variant: 'destructive',
        });
        return;
      }

      // Fetch reviews for this business
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('id, title, content, rating, author_name, is_anonymous, user_id, date')
        .eq('business_id', businessId)
        .order('date', { ascending: false })
        .limit(5);

      const reviews = reviewsData || [];
      const totalReviews = reviews.length;
      const averageRating = totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : businessData.overall_rating || 0;

      // Fetch analytics events
      const { data: analytics } = await supabase
        .from('business_analytics')
        .select('event_type')
        .eq('business_id', businessId);

      const views = analytics?.filter(a => a.event_type === 'page_view').length || 0;
      const leads = analytics?.filter(a => ['phone_click', 'website_click', 'contact_form'].includes(a.event_type)).length || 0;

      setStats({
        business: businessData,
        totalReviews,
        averageRating,
        recentReviews: reviews.slice(0, 3),
        views,
        leads,
      });

      setLoading(false);
    }

    fetchDashboardData();
  }, [businessId, toast]);

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="space-y-2">
          <div className="h-10 w-64 bg-primary/10 rounded animate-pulse"></div>
          <div className="h-4 w-96 bg-primary/5 rounded animate-pulse"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-32 rounded-2xl bg-card/50 animate-pulse">
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="h-96 lg:col-span-2 rounded-2xl bg-card/50 animate-pulse">
          </Card>
          <Card className="h-96 rounded-2xl bg-card/50 animate-pulse">
          </Card>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center">
            <MessageSquare className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold font-headline">Business Not Found</h1>
          <p className="text-muted-foreground text-lg">
            We couldn't find the business you're looking for.
          </p>
          <Button asChild size="lg" className="rounded-full font-bold px-8">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Avis reçus',
      value: stats.totalReviews.toString(),
      icon: Star,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      trend: stats.totalReviews > 0 ? '+ Nouveau avis' : 'En attente',
      trendColor: 'text-emerald-600'
    },
    {
      name: 'Note moyenne',
      value: stats.averageRating.toFixed(1),
      icon: TrendingUp,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      trend: stats.averageRating >= 4 ? 'Excellente' : 'À améliorer',
      trendColor: 'text-emerald-600'
    },
    {
      name: 'Vues du profil',
      value: stats.views.toString(),
      icon: Eye,
      color: 'text-primary',
      bg: 'bg-primary/10',
      trend: 'Total vues',
      trendColor: 'text-primary'
    },
    {
      name: 'Leads générés',
      value: stats.leads.toString(),
      icon: Users,
      color: 'text-cyan-600',
      bg: 'bg-cyan-500/10',
      trend: 'Clics & Contacts',
      trendColor: 'text-cyan-700'
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Business Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-5xl font-bold font-headline text-foreground tracking-tight">
              {stats.business.name}
            </h1>
            <Badge variant="outline" className="text-xs">
              Business #{stats.business.id}
            </Badge>
          </div>
          <p className="text-muted-foreground text-lg mt-2 font-light italic">
            Gestion spécifique pour cette entreprise
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild className="rounded-full bg-foreground text-background hover:bg-foreground/90 font-bold shadow-lg">
            <Link href={`/businesses/${stats.business.id}`}>
              Voir la page publique <Eye className="ml-2 w-4 h-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full font-bold">
            <Link href={`/dashboard/edit-profile`}>
              <Settings className="mr-2 w-4 h-4" /> Éditer le profil
            </Link>
          </Button>
        </div>
      </div>

      {/* Glassmorphism Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {statCards.map((stat, i) => (
          <Card key={stat.name} className="border-white/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 group overflow-hidden relative">
            <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-10 blur-3xl ${stat.bg.replace('/10', '')}`} />

            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider font-body">
                {stat.name}
              </CardTitle>
              <div className={`${stat.bg} ${stat.color} p-2.5 rounded-xl transition-transform group-hover:scale-110 duration-300`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-bold font-headline text-foreground">{stat.value}</div>
              <p className={`${stat.trendColor} text-xs font-medium mt-2 flex items-center gap-1`}>
                <TrendingUp className="w-3 h-3 fill-current" /> {stat.trend}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Reviews & Actions - Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reviews Section */}
        <Card className="lg:col-span-2 border-white/20 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-headline text-xl">Derniers Avis</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" asChild>
              <Link href={`/dashboard/reviews?business=${stats.business.id}`}>Tout voir</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {stats.recentReviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Star className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="font-medium">En attente de votre premier avis</p>
                <p className="text-sm">Invitez vos clients à partager leur expérience.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentReviews.map((review) => (
                  <div key={review.id} className="group flex flex-col sm:flex-row gap-4 p-5 rounded-2xl bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-primary/20 hover:shadow-md">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/20 transform group-hover:rotate-3 transition-transform">
                        {getAuthorInitials(
                          review,
                          'pro', // Business owner role
                          null,  // No current user context
                          null   // No business owner ID
                        )}
                      </div>
                    </div>
                    <div className="flex-grow space-y-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-base text-foreground">
                            {getAuthorDisplayName(
                              review,
                              'pro', // Business owner role
                              null,  // No current user context
                              null   // No business owner ID
                            )}
                          </h4>
                        </div>
                        <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[10px]">Vérifié</Badge>
                      </div>
                      <div className="py-1">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted'
                                }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1 italic leading-relaxed">
                        "{review.content || 'Pas de commentaire.'}"
                      </p>
                      <div className="pt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10 h-8 px-3 rounded-full text-xs font-semibold" asChild>
                          <Link href={`/dashboard/reviews?business=${stats.business.id}`}>
                            Répondre <MessageSquare className="ml-1 w-3 h-3" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Column */}
        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-gradient-to-br from-primary/90 to-teal-800 text-white overflow-hidden relative group">
            <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-10" />
            <CardHeader>
              <CardTitle className="text-white font-headline">Actions Rapides</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 relative z-10">
              <Button variant="secondary" className="w-full justify-start h-12 text-primary font-bold hover:bg-white/90" asChild>
                <Link href={`/dashboard/reviews?business=${stats.business.id}`}>
                  <MessageSquare className="mr-2 w-4 h-4" /> Répondre aux avis
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start h-12 bg-transparent text-white border-white/20 hover:bg-white/10 hover:text-white" asChild>
                <Link href={`/dashboard/updates?business=${stats.business.id}`}>
                  <TrendingUp className="mr-2 w-4 h-4" /> Publier une offre
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start h-12 bg-transparent text-white border-white/20 hover:bg-white/10 hover:text-white" asChild>
                <Link href={`/dashboard/edit-profile?business=${stats.business.id}`}>
                  <Eye className="mr-2 w-4 h-4" /> Modifier le profil
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-amber-200/50 bg-amber-50/50 dark:bg-amber-900/10 backdrop-blur-sm shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-amber-700 dark:text-amber-500 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" /> Conseil Pro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Ajoutez de <strong>belles photos</strong> de votre entreprise pour augmenter vos vues de <strong>40%</strong>. Les employés adorent voir l'ambiance !
              </p>
              <Button variant="link" className="text-amber-600 dark:text-amber-500 p-0 h-auto mt-2 text-sm" asChild>
                <Link href={`/dashboard/edit-profile?business=${stats.business.id}`}>Ajouter des photos &rarr;</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
