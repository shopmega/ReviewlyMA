'use client';

import { Business } from '@/lib/types';
import { BusinessCover } from '@/components/shared/BusinessCover';
import { BusinessLogo } from '@/components/shared/BusinessLogo';
import { Badge } from '@/components/ui/badge';
import { MapPin, ShieldCheck, Sparkles, Zap, Star } from 'lucide-react';
import { useMemo } from 'react';
import { isPaidTier } from '@/lib/tier-utils';
import { cn, isValidImageUrl } from '@/lib/utils';
import { useI18n } from '@/components/providers/i18n-provider';
import Link from 'next/link';

interface BusinessHeroProps {
  business: Business;
}

export function BusinessHero({ business }: BusinessHeroProps) {
  const { t, tf } = useI18n();
  const { isOpen, hasHours, hasHeroMedia } = useMemo(() => {
    const daysFr = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const todayIndex = new Date().getDay();
    const today = daysFr[todayIndex];
    const todayHours = business.hours?.find((h) => h.day.toLowerCase() === today);
    const hasHoursData = business.hours && business.hours.length > 0;
    const hasMedia =
      Boolean(business.cover_url && isValidImageUrl(business.cover_url)) ||
      Boolean(Array.isArray(business.photos) && business.photos[0]?.imageUrl && isValidImageUrl(business.photos[0].imageUrl));
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const opened = !!todayHours?.isOpen && todayHours.open <= currentTime && todayHours.close > currentTime;
    return { isOpen: opened, hasHours: hasHoursData, hasHeroMedia: hasMedia };
  }, [business.hours, business.cover_url, business.photos]);

  const heroSizeClass = hasHeroMedia
    ? 'h-[38vh] md:h-[48vh] min-h-[340px] md:min-h-[420px]'
    : 'h-auto min-h-[240px] md:min-h-[280px] py-8 md:py-10';

  return (
    <div className={cn('relative flex w-full items-end group', heroSizeClass)}>
      <div className="absolute inset-0 z-0 overflow-hidden">
        <BusinessCover
          business={business}
          alt={business.name}
          fill
          fallbackToGallery
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          priority
        />
        <div className="absolute inset-0 z-10 bg-background/65" />
      </div>

      <div className="relative z-20 container mx-auto px-4 md:px-6 pb-6 md:pb-12 pt-24 w-full mt-auto">
        <div className="flex flex-col lg:flex-row items-center lg:items-end gap-4 md:gap-6 justify-between text-center lg:text-left">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center md:items-end w-full">
            <div className="shrink-0 relative z-30">
              <div className="overflow-hidden rounded-xl border border-border bg-card p-1 shadow-sm group/logo">
                <BusinessLogo
                  logo={business.logo}
                  businessName={business.name}
                  width={80}
                  height={80}
                  className="rounded-xl w-20 h-20 md:w-32 md:h-32 object-cover transition-transform duration-500 group-hover/logo:scale-110"
                  priority
                />
              </div>
            </div>

            <div className="space-y-2 md:space-y-3 max-w-4xl relative z-10 w-full">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5 sm:gap-2">
                <Badge variant="secondary" className="text-xs py-0.5">
                  {business.category}
                </Badge>
                {business.subcategory && (
                  <Badge variant="outline" className="text-xs py-0.5">
                    {business.subcategory}
                  </Badge>
                )}
                {hasHours &&
                  (isOpen ? (
                    <Badge variant="success" className="text-xs py-0.5">
                      {t('business.hero.open', 'Ouvert')}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs py-0.5">
                      {t('business.hero.closed', 'Ferme')}
                    </Badge>
                  ))}
                {business.is_claimed && (
                  <Badge variant="info" className="text-xs py-0.5">
                    <ShieldCheck className="w-3 h-3 inline mr-1" />
                    <span>{t('business.hero.verified', 'Verifie')}</span>
                  </Badge>
                )}
                {business.tier && isPaidTier(business.tier) && (
                  <Badge
                    variant={business.tier === 'gold' ? 'default' : 'outline'}
                    className={cn(
                      'text-xs py-0.5 font-bold',
                      business.tier === 'gold'
                        ? 'border-warning/20 bg-warning/10 text-warning'
                        : 'border-primary/20 bg-primary/10 text-primary'
                    )}
                  >
                    {business.tier === 'gold' ? (
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3 fill-current" />
                        PRO GOLD
                      </span>
                    ) : (
                      t('business.hero.businessPro', 'Business Pro')
                    )}
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl md:text-6xl font-black font-headline leading-tight tracking-tight text-foreground">{business.name}</h1>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 md:gap-4 text-xs md:text-sm font-medium pt-1">
                {business.overallRating > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5 text-yellow-500">
                      {[...Array(5)].map((_, i) => (
                        <Sparkles
                          key={i}
                          className={`w-3.5 h-3.5 md:w-4 md:h-4 ${i < Math.round(business.overallRating) ? 'fill-current' : 'text-muted-foreground/30 fill-muted-foreground/10'}`}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-foreground text-base md:text-lg">{business.overallRating.toFixed(1)}</span>
                    <span className="text-muted-foreground underline underline-offset-4 decoration-muted-foreground/30">
                      {tf('business.hero.reviewCount', '{count} avis', { count: business.reviews.length })}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5 text-muted-foreground/40">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      ))}
                    </div>
                    <span className="font-bold text-muted-foreground italic">{t('business.hero.noRating', "Pas encore d'evaluation")}</span>
                    <span className="hidden sm:inline w-1 h-1 bg-muted-foreground/30 rounded-full mx-1" />
                    <Link href={`/businesses/${business.id}/review`} className="text-primary font-bold hover:underline">
                      {t('business.hero.firstReview', 'Soyez le premier a donner votre avis')}
                    </Link>
                  </div>
                )}

                <div className="hidden sm:block w-1 h-1 bg-muted-foreground/30 rounded-full" />

                <span className="hidden sm:flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  {business.city || business.location}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
