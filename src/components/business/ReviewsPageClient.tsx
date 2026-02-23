'use client';

import { useState, useMemo } from 'react';
import { Business } from '@/lib/types';
import { StarRating } from '@/components/shared/StarRating';
import { ReviewSubRatings } from '@/components/shared/ReviewSubRatings';
import SharedReviewsSection from '@/components/shared/ReviewsSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, TrendingUp, Users, Building2, MapPin, Star, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useI18n } from '@/components/providers/i18n-provider';

interface ReviewsPageClientProps {
  business: Business;
}

export function ReviewsPageClient({ business }: ReviewsPageClientProps) {
  const { t, tf } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');

  const ratingStats = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0];
    business.reviews?.forEach((r) => {
      const rating = Math.round(r.rating);
      if (rating >= 1 && rating <= 5) counts[rating]++;
    });

    const total = business.reviews?.length || 0;
    return counts
      .map((count, i) => ({
        rating: i,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .slice(1)
      .reverse();
  }, [business.reviews]);

  const subRatingAverages = useMemo(() => {
    const sums = { wlb: 0, mgmt: 0, growth: 0, culture: 0 };
    const counts = { wlb: 0, mgmt: 0, growth: 0, culture: 0 };

    business.reviews?.forEach((r) => {
      if (r.subRatings?.workLifeBalance) {
        sums.wlb += r.subRatings.workLifeBalance;
        counts.wlb++;
      }
      if (r.subRatings?.management) {
        sums.mgmt += r.subRatings.management;
        counts.mgmt++;
      }
      if (r.subRatings?.careerGrowth) {
        sums.growth += r.subRatings.careerGrowth;
        counts.growth++;
      }
      if (r.subRatings?.culture) {
        sums.culture += r.subRatings.culture;
        counts.culture++;
      }
    });

    return {
      workLifeBalance: counts.wlb > 0 ? sums.wlb / counts.wlb : 0,
      management: counts.mgmt > 0 ? sums.mgmt / counts.mgmt : 0,
      careerGrowth: counts.growth > 0 ? sums.growth / counts.growth : 0,
      culture: counts.culture > 0 ? sums.culture / counts.culture : 0,
    };
  }, [business.reviews]);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
      <div className="bg-white dark:bg-slate-900 border-b border-border/50 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-full">
              <Link href={`/businesses/${business.id}`}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-0.5">
                <Link href="/" className="hover:text-primary transition-colors">
                  {t('nav.home', 'Accueil')}
                </Link>
                <span>/</span>
                <Link href="/businesses" className="hover:text-primary transition-colors">
                  {t('nav.businesses', 'Entreprises')}
                </Link>
                <span>/</span>
                <span className="truncate max-w-[150px]">{business.name}</span>
              </div>
              <h1 className="font-bold text-sm uppercase tracking-wider text-foreground">{t('business.reviews.allTitle', 'Tous les avis')}</h1>
            </div>
          </div>

          <Button asChild className="rounded-xl font-bold px-6 shadow-lg shadow-primary/20">
            <Link href={`/businesses/${business.id}/review`}>{t('business.reviews.giveReview', 'Donner mon avis')}</Link>
          </Button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden">
              <div className="h-24 bg-gradient-to-r from-primary/10 to-indigo-500/10" />
              <CardContent className="px-8 pb-8 pt-0 -mt-12">
                <div className="relative mb-6 inline-block">
                  <div className="h-24 w-24 rounded-3xl bg-white dark:bg-slate-800 shadow-2xl p-4 flex items-center justify-center border border-border/50 overflow-hidden group">
                    {business.logo_url ? (
                      <Image src={business.logo_url} alt={business.name} width={80} height={80} className="object-contain group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <Building2 className="h-10 w-10 text-primary/40" />
                    )}
                  </div>
                  {business.is_premium && <Badge className="absolute -bottom-2 -right-2 bg-amber-500 text-white border-none font-bold text-[10px] uppercase shadow-lg">PRO</Badge>}
                </div>

                <h2 className="text-2xl font-black tracking-tight mb-2">{business.name}</h2>
                <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium mb-6">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {business.city}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" /> {business.category}
                  </span>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-border/50">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-4xl font-black text-foreground">{business.overallRating?.toFixed(1) || '0.0'}</p>
                      <StarRating rating={business.overallRating || 0} readOnly size={18} className="mt-1" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">{t('business.reviews.total', 'Total')}</p>
                      <p className="text-xl font-black text-primary">{tf('business.hero.reviewCount', '{count} avis', { count: business.reviews?.length || 0 })}</p>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground leading-relaxed italic">
                    {t('business.reviews.basedOnVerified', "Base sur les retours d'experiences verifies de nos utilisateurs.")}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900 rounded-[2.5rem]">
              <CardHeader className="px-8 pt-8 pb-4">
                <CardTitle className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  {t('business.reviews.distribution', 'Repartition')}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-8 pb-8 space-y-4">
                {ratingStats.map((stat) => (
                  <div key={stat.rating} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-tighter">
                      <span className="flex items-center gap-1">
                        {stat.rating} <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      </span>
                      <span className="text-muted-foreground">{tf('business.hero.reviewCount', '{count} avis', { count: stat.count })}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-1000 ease-out" style={{ width: `${stat.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900 rounded-[2.5rem]">
              <CardHeader className="px-8 pt-8 pb-4">
                <CardTitle className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {t('business.reviews.criteria', 'Criteres')}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <ReviewSubRatings subRatings={subRatingAverages} />
                <p className="mt-6 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center opacity-60">{t('business.reviews.categoryAverages', 'Moyennes par categorie')}</p>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8">
            <div className="mb-8 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  className="h-14 pl-12 rounded-2xl border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900 font-medium text-lg focus-visible:ring-primary/20"
                  placeholder={t('business.reviews.searchPlaceholder', 'Rechercher un mot-cle (ex: salaire, ambiance)...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" className="h-14 rounded-2xl px-6 bg-white dark:bg-slate-900 border-none shadow-xl shadow-slate-200/50 dark:shadow-none">
                <Filter className="mr-2 h-5 w-5" />
                {t('listing.filters', 'Filtres')}
              </Button>
            </div>

            <div className="space-y-6">
              <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-none bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] p-4 md:p-8">
                <SharedReviewsSection business={business} searchTerm={searchTerm} />
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
