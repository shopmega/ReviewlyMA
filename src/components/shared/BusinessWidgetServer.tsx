import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Star, Mountain } from 'lucide-react';
import type { Business } from '@/lib/types';
import { StarRating } from './StarRating';
import { Button } from '../ui/button';
import { getSiteSettings } from '@/lib/data';
import { BusinessLogo } from '@/components/shared/BusinessLogo';

type BusinessWidgetProps = {
  business: Business & { logo_hint?: string; overall_rating?: number; review_count?: number };
};

export async function BusinessWidgetServer({ business }: BusinessWidgetProps) {
  // Support both snake_case (Supabase) and camelCase (Mock Data)
  const logoUrl = business.logo_url || (business.logo ? business.logo.imageUrl : '/placeholder-logo.png');
  const logoHint = business.logo_hint || (business.logo ? business.logo.imageHint : '');
  const name = business.name;
  const category = business.category;
  const subcategory = business.subcategory;
  const city = business.city;
  const quartier = business.quartier;
  const overallRating = business.overall_rating ?? business.overallRating ?? 
    (business.reviews?.length > 0 
      ? business.reviews
          .filter((r: any) => r.status === 'published')
          .reduce((sum: number, r: any) => sum + r.rating, 0) / 
          business.reviews.filter((r: any) => r.status === 'published').length
      : 0);
  const reviewCount = business.review_count ?? (business.reviews ? business.reviews.length : 0);
  
  // Get site settings for dynamic site name
  const siteSettings = await getSiteSettings();
  const siteName = siteSettings.site_name || 'Platform';

  return (
    <Card className="w-full max-w-sm mx-auto shadow-lg overflow-hidden flex flex-col h-full">
        <CardHeader className="flex-row items-center gap-4 p-4">
          {logoUrl && logoUrl !== '/placeholder-logo.png' ? (
            <Image
              src={logoUrl}
              alt={`${name} logo`}
              width={56}
              height={56}
              className="rounded-lg border bg-white"
              data-ai-hint={logoHint}
            />
          ) : (
            <div className="flex items-center justify-center w-14 h-14 rounded-lg border bg-gradient-to-br from-primary/20 to-accent/20 text-lg font-bold">
              {name && name.split(' ').length > 1 
                ? (name.split(' ')[0][0] + name.split(' ')[1][0]).toUpperCase()
                : name ? name[0].toUpperCase() : 'B'}
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-lg font-bold font-headline leading-tight">{name}</h3>
            <p className="text-sm text-muted-foreground">{category}</p>
            {(quartier || city) && (
              <p className="text-xs text-muted-foreground">{quartier} • {city}</p>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-grow p-4 flex flex-col items-center justify-center text-center bg-muted/30">
            <p className="text-sm text-muted-foreground">Note globale sur {siteName}</p>
            <div className="flex items-center gap-3 my-2">
                <span className="text-4xl font-bold">{overallRating.toFixed(1)}</span>
                <div className="flex flex-col items-start">
                    <StarRating rating={overallRating} readOnly size={20} />
                    <p className="text-xs text-muted-foreground">Basé sur {reviewCount} avis</p>
                </div>
            </div>
             <Button asChild size="sm" className="mt-2">
                <Link href={`/businesses/${business.id}`} target="_blank">
                    Voir les avis
                </Link>
            </Button>
        </CardContent>
        <CardFooter className="p-2 bg-muted/50 justify-center">
            <Link href="/" target="_blank" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <p>Fourni par</p>
                <Mountain className="h-4 w-4" />
                <span className="font-semibold">{siteName}</span>
            </Link>
        </CardFooter>
    </Card>
  );
}