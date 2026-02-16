import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Star, MapPin, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Business } from '@/lib/types';
import { isPaidTier } from '@/lib/tier-utils';
import { getAmenityGroup } from '@/lib/location-discovery';
import { BusinessLogo } from '@/components/shared/BusinessLogo';
import { Badge } from '@/components/ui/badge';
import { isValidImageUrl } from '@/lib/utils';
import { BusinessCover } from '@/components/shared/BusinessCover';

type BusinessCardProps = {
  business: Business;
};

export function BusinessCard({ business }: BusinessCardProps) {
  // Get top 4 amenity icons/emojis
  const topAmenities = (business.amenities || []).slice(0, 4);
  const amenityEmojis: Record<string, string> = {
    'Télétravail': '🏠',
    'Horaires flexibles': '🕐',
    'Mutuelle santé': '🏥',
    'Tickets restaurant': '🍽️',
    'Transport en commun': '🚇',
    'Parking gratuit': '🅿️',
    'Crèche entreprise': '👶',
    'Salle de sport': '💪',
    'Pause café': '☕',
    'Événements team building': '🤝',
    'Formation continue': '📚',
    'Ascenseur': '🛗',
    'Accès PMR': '♿',
    'Cantine': '🍽️',
    'Parking vélo': '🚲',
    'Bureau ouvert': '🗣️',
    'Salle de repos': '😴',
    'Crédit temps': '⏰',
    'Congés supplémentaires': '🏖️',
    'Prime performance': '💰',
  };

  return (
    <Link href={`/businesses/${business.id}`} className="group block h-full">
      <div className="glass-card h-full flex flex-col overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-primary/10 rounded-2xl group border-transparent hover:border-primary/20">
        <div className="relative h-48 md:h-56 w-full">
          <div className="absolute inset-0 overflow-hidden rounded-t-2xl">
            <BusinessCover
              business={business}
              alt={`${business.name} cover`}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
          </div>

          {/* Floating Logo Badge - No longer clipped */}
          <div className="absolute -bottom-6 left-5 z-20">
            <div className="p-1 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl ring-4 ring-white dark:ring-slate-950">
              <BusinessLogo
                logo={business.logo}
                businessName={business.name}
                width={64}
                height={64}
                className="rounded-xl w-14 h-14 md:w-16 md:h-16"
              />
            </div>
          </div>

          <div className="absolute top-3 md:top-4 right-3 md:right-4 z-10 flex flex-col items-end gap-2">
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1.5 md:py-1 rounded-full text-xs font-bold text-white shadow-sm border border-white/10">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span>{typeof business.overallRating === 'number' && business.overallRating > 0 ? business.overallRating.toFixed(1) : '0.0'}</span>
            </div>
          </div>

          <div className="absolute bottom-3 md:bottom-4 right-3 md:right-4 z-10 flex flex-wrap justify-end gap-1.5 max-w-[80%]">
            <Badge variant="secondary" className="bg-white/90 text-slate-900 border-none text-[10px] uppercase font-bold tracking-wider backdrop-blur-md px-2 py-0.5 truncate max-w-full">
              {business.category}
            </Badge>
            {business.subcategory && (
              <Badge variant="secondary" className="bg-indigo-600/90 text-white border-none text-[10px] uppercase font-bold tracking-wider backdrop-blur-md px-2 py-0.5 truncate max-w-full">
                {business.subcategory}
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="flex-grow flex flex-col gap-4 p-4 md:p-5 pt-8 md:pt-10">
          <div className="space-y-1">
            <h3 className="text-xl font-bold font-headline leading-tight truncate text-foreground group-hover:text-primary transition-colors">
              {business.name}
            </h3>
            <div className="flex items-start gap-2 text-sm text-muted-foreground font-medium">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
              <span className="line-clamp-1">
                {business.quartier && business.city ? `${business.quartier}, ${business.city}` : (business.location || 'Maroc')}
              </span>
            </div>
          </div>

          {/* Quick Stats/Badges */}
          <div className="flex items-center gap-3 mt-auto pt-4 border-t border-border/50">
            <div className="flex flex-wrap gap-2">
              {topAmenities.length > 0 ? (
                topAmenities.slice(0, 3).map((amenity, idx) => (
                  <span key={idx} className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary/50 text-base grayscale group-hover:grayscale-0 transition-all duration-300" title={amenity}>
                    {amenityEmojis[amenity] || '✨'}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">Aucun avantage listé</span>
              )}
            </div>
            {business.tier && isPaidTier(business.tier) && (
              <Badge
                variant={business.tier === 'gold' ? "default" : "outline"}
                className={cn(
                  "ml-auto text-[10px] px-2 py-0.5 h-6 font-bold uppercase tracking-wider transition-all duration-300",
                  business.tier === 'gold'
                    ? "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white border-none shadow-lg shadow-amber-500/30 ring-1 ring-white/20"
                    : "border-primary/20 bg-primary/5 text-primary"
                )}
              >
                {business.tier === 'gold' ? (
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-current animate-pulse" />
                    GOLD
                  </span>
                ) : (
                  'PRO'
                )}
              </Badge>
            )}
          </div>
        </CardContent>
      </div>
    </Link>
  );
}
