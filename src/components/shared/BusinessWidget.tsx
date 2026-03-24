'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Mountain, Clock } from 'lucide-react';
import type { Business, DayHours } from '@/lib/types';
import { StarRating } from './StarRating';
import { Button } from '../ui/button';
import { useState, useEffect } from 'react';
import { getSiteSettings, getStoragePublicUrl } from '@/lib/data';
import { BusinessLogo } from '@/components/shared/BusinessLogo';
import { getSiteName } from '@/lib/site-config';
import { useI18n } from '@/components/providers/i18n-provider';

type BusinessWidgetProps = {
  business: Business & { logo_hint?: string; overall_rating?: number; review_count?: number; hours?: DayHours[] };
  theme?: 'light' | 'dark';
  showName?: boolean;
  showCategory?: boolean;
  showLocation?: boolean;
  showRating?: boolean;
  showReviewsCount?: boolean;
  showHours?: boolean;
  showCtaButton?: boolean;
};

export function BusinessWidget({
  business,
  theme = 'light',
  showName = true,
  showCategory = true,
  showLocation = true,
  showRating = true,
  showReviewsCount = true,
  showHours = true,
  showCtaButton = true
}: BusinessWidgetProps) {
  const storageLogo = business.logo_url ? getStoragePublicUrl(business.logo_url) : null;
  const logoUrl = storageLogo || business.logo?.imageUrl || '';

  const logoHint = business.logo_hint || business.logo?.imageHint || '';
  const name = business.name;
  const category = business.category;
  const city = business.city;
  const quartier = business.quartier;
  const overallRating = business.overall_rating ?? business.overallRating ?? 0;
  const reviewCount = business.review_count ?? (business.reviews ? business.reviews.length : 0);

  const [siteName, setSiteName] = useState('Reviewly');
  const { locale, t } = useI18n();

  const today = new Date().toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long' });
  const todayHours = business.hours?.find((hours) => hours.day.toLowerCase() === today.toLowerCase());
  const currentTime = new Date().toTimeString().slice(0, 5);
  const isOpen = Boolean(todayHours?.isOpen && todayHours.open <= currentTime && todayHours.close > currentTime);

  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        const settings = await getSiteSettings();
        setSiteName(getSiteName(settings));
      } catch (error) {
        console.error('Error fetching site settings:', error);
      }
    };

    fetchSiteSettings();
  }, []);

  const themeClasses = theme === 'dark'
    ? 'bg-gray-900 text-white border-gray-700'
    : 'bg-white text-gray-900 border-gray-200';

  const headerBgClass = theme === 'dark' ? 'bg-gray-800' : 'bg-muted/30';
  const contentBgClass = theme === 'dark' ? 'bg-gray-800/50' : 'bg-muted/30';
  const footerBgClass = theme === 'dark' ? 'bg-gray-800/70' : 'bg-muted/50';
  const textColorClass = theme === 'dark' ? 'text-gray-200' : 'text-muted-foreground';
  const locationLabel = [quartier, city].filter(Boolean).join(' • ');
  const hoursLabel = todayHours?.isOpen
    ? `${todayHours.open} - ${todayHours.close}`
    : t('businessWidget.closedToday', 'Closed today');

  return (
    <Card className={`w-full max-w-sm mx-auto shadow-lg overflow-hidden flex flex-col h-full ${themeClasses}`}>
      <CardHeader className={`flex-row items-center gap-4 p-4 ${headerBgClass}`}>
        <BusinessLogo
          logo={{ imageUrl: logoUrl, imageHint: logoHint }}
          businessName={name}
          width={56}
          height={56}
          className="rounded-lg border bg-white"
        />
        <div className="flex-1">
          {showName && (
            <h3 className="text-lg font-bold font-headline leading-tight">{name}</h3>
          )}
          {showCategory && (
            <p className={`text-sm ${textColorClass}`}>{category}</p>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            {locationLabel && showLocation && (
              <p className={`text-xs ${textColorClass}`}>{locationLabel}</p>
            )}
            {isOpen && showHours && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                <span className="w-1 h-1 rounded-full bg-green-600 animate-pulse" />
                {t('businessWidget.open', 'Open')}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className={`flex-grow p-4 flex flex-col items-center justify-center text-center ${contentBgClass}`}>
        {showRating && (
          <>
            <p className={`text-sm ${textColorClass}`}>{t('businessWidget.ratingOn', 'Overall rating on')} {siteName}</p>
            <div className="flex items-center gap-3 my-2">
              <span className="text-4xl font-bold">{overallRating.toFixed(1)}</span>
              <div className="flex flex-col items-start">
                <StarRating rating={overallRating} readOnly size={20} />
                {showReviewsCount && (
                  <p className={`text-xs ${textColorClass}`}>
                    {t('businessWidget.basedOn', 'Based on')} {reviewCount} {t('businessWidget.reviews', 'reviews')}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
        <div className="flex flex-col gap-2 w-full max-w-[200px]">
          {business.hours && business.hours.length > 0 && showHours && (
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground mb-1">
              <Clock className="h-3 w-3" />
              <span>{hoursLabel}</span>
            </div>
          )}
          {showCtaButton && (
            <Button asChild size="sm" className="w-full">
              <Link href={`/businesses/${business.id}`} target="_blank">
                {t('businessWidget.viewReviews', 'View reviews')}
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
      <CardFooter className={`p-2 ${footerBgClass} justify-center`}>
        <Link href="/" target="_blank" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <p>{t('businessWidget.poweredBy', 'Powered by')}</p>
          <Mountain className="h-4 w-4" />
          <span className="font-semibold">{siteName}</span>
        </Link>
      </CardFooter>
    </Card>
  );
}
