import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Star, MapPin, Zap, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Business } from '@/lib/types';
import { isPaidTier } from '@/lib/tier-utils';
import { BusinessLogo } from '@/components/shared/BusinessLogo';
import { Badge } from '@/components/ui/badge';
import { BusinessCover } from '@/components/shared/BusinessCover';

type BusinessCardProps = {
  business: Business;
};

export function BusinessCard({ business }: BusinessCardProps) {
  const topAmenities = (business.amenities || []).slice(0, 3);

  return (
    <Link href={`/businesses/${business.id}`} className="group block h-full">
      <Card className="h-full overflow-hidden rounded-xl border border-border bg-card shadow-none transition-colors hover:border-primary/30 hover:bg-secondary/20">
        <div className="relative h-48 w-full md:h-56">
          <div className="absolute inset-0 overflow-hidden">
            <BusinessCover
              business={business}
              alt={`${business.name} cover`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-black/20" />
          </div>

          <div className="absolute -bottom-6 left-5 z-20">
            <div className="rounded-md border border-border bg-card p-1 shadow-none">
              <BusinessLogo
                logo={business.logo}
                businessName={business.name}
                width={64}
                height={64}
                className="h-14 w-14 rounded-md md:h-16 md:w-16"
              />
            </div>
          </div>

          <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2 md:right-4 md:top-4">
            {typeof business.overallRating === 'number' && business.overallRating > 0 ? (
              <div className="flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-bold text-foreground">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                <span>{business.overallRating.toFixed(1)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 rounded-full border border-info/20 bg-info/10 px-3 py-1 text-[10px] font-black uppercase tracking-tighter text-info">
                <Sparkles className="h-3 w-3" />
                <span>Nouveau</span>
              </div>
            )}
          </div>

          <div className="absolute bottom-3 right-3 z-10 flex max-w-[80%] flex-wrap justify-end gap-1.5 md:bottom-4 md:right-4">
            <Badge variant="secondary" className="max-w-full truncate border border-border bg-card px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
              {business.category}
            </Badge>
            {business.subcategory && (
              <Badge variant="secondary" className="max-w-full truncate border border-info/20 bg-info/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-info">
                {business.subcategory}
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="flex flex-grow flex-col gap-4 p-4 pt-8 md:p-5 md:pt-10">
          <div className="space-y-1">
            <h3 className="truncate font-headline text-xl font-bold leading-tight text-foreground transition-colors group-hover:text-primary">
              {business.name}
            </h3>
            <div className="flex items-start gap-2 text-sm font-medium text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="line-clamp-1">
                {business.quartier && business.city ? `${business.quartier}, ${business.city}` : (business.location || 'Maroc')}
              </span>
            </div>
          </div>

          <div className="mt-auto flex items-center gap-3 border-t border-border/50 pt-4">
            <div className="flex flex-wrap gap-2">
              {topAmenities.length > 0 ? (
                topAmenities.map((amenity, idx) => (
                  <span key={idx} className="inline-flex items-center rounded-md border border-border bg-secondary px-2 py-1 text-[10px] font-semibold text-muted-foreground" title={amenity}>
                    {amenity}
                  </span>
                ))
              ) : (
                <span className="text-xs italic text-muted-foreground">Aucun avantage liste</span>
              )}
            </div>
            {business.tier && isPaidTier(business.tier) && (
              <Badge
                variant={business.tier === 'gold' ? 'default' : 'outline'}
                className={cn(
                  'ml-auto h-6 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                  business.tier === 'gold'
                    ? 'border-none bg-warning text-warning-foreground'
                    : 'border-primary/20 bg-primary/5 text-primary'
                )}
              >
                {business.tier === 'gold' ? (
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3 fill-current" />
                    GOLD
                  </span>
                ) : (
                  'PRO'
                )}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
