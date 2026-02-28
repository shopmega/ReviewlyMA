import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAdsForPlacement, type AdDeliveryContext, type AdPlacement } from '@/lib/ads/delivery';

type InternalAdsSlotProps = {
  placement: AdPlacement;
  context?: AdDeliveryContext;
  limit?: number;
  className?: string;
};

export async function InternalAdsSlot({
  placement,
  context = {},
  limit = 2,
  className = '',
}: InternalAdsSlotProps) {
  const ads = await getAdsForPlacement(placement, context, limit);

  if (ads.length === 0) {
    return null;
  }

  return (
    <section className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="uppercase tracking-widest text-[10px]">
          Ads
        </Badge>
        <span className="text-xs text-muted-foreground">Contenu sponsorise</span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {ads.map((ad) => {
          const targeting = (ad.targeting_criteria || {}) as Record<string, any>;
          const ctaUrl = typeof targeting.cta_url === 'string' ? targeting.cta_url : '';
          const ctaLabel = typeof targeting.cta_label === 'string' ? targeting.cta_label : 'En savoir plus';

          return (
            <Card key={ad.id} className="rounded-2xl border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{ad.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{ad.content}</p>
                {ctaUrl && (
                  <Link
                    href={ctaUrl}
                    className="inline-flex text-sm font-semibold text-primary hover:underline"
                    target={ctaUrl.startsWith('http') ? '_blank' : undefined}
                    rel={ctaUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                  >
                    {ctaLabel}
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
