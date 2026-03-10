import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { retractReferralDemandListingForm, updateMyReferralDemandListingStatusForm } from '@/app/actions/referrals';
import { getServerTranslator } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

type DemandListing = {
  id: string;
  title: string;
  target_role: string;
  city: string | null;
  status: string;
  created_at: string;
  expires_at: string | null;
};

export default async function MyPublicDemandListingsPage() {
  const { t, tf, locale } = await getServerTranslator();
  const dateLocale = locale === 'fr' ? 'fr-MA' : locale === 'ar' ? 'ar-MA' : 'en-US';

  const STATUS_LABELS: Record<string, string> = {
    active: t('referralMyPublicDemandsPage.status.active', 'Active'),
    paused: t('referralMyPublicDemandsPage.status.paused', 'Paused'),
    closed: t('referralMyPublicDemandsPage.status.closed', 'Closed'),
  };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect('/login?next=/parrainages/mes-demandes-publiques');
  }

  const { data } = await supabase
    .from('job_referral_demand_listings')
    .select('id, title, target_role, city, status, created_at, expires_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });

  const items = (data || []) as DemandListing[];
  const responseCountMap = new Map<string, number>();
  if (items.length > 0) {
    const demandIds = items.map((item) => item.id);
    const { data: responses } = await supabase
      .from('job_referral_demand_responses')
      .select('demand_listing_id')
      .in('demand_listing_id', demandIds)
      .eq('status', 'active');

    for (const row of responses || []) {
      const listingId = (row as { demand_listing_id: string }).demand_listing_id;
      responseCountMap.set(listingId, (responseCountMap.get(listingId) || 0) + 1);
    }
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold font-headline">{t('referralMyPublicDemandsPage.title', 'My public requests')}</h1>
          <p className="text-sm text-muted-foreground">{t('referralMyPublicDemandsPage.subtitle', 'Manage your request listings on the demand board.')}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/parrainages?kind=demands">{t('referralMyPublicDemandsPage.actions.viewBoard', 'View board')}</Link>
          </Button>
          <Button asChild>
            <Link href="/parrainages/demandes/new">{t('referralMyPublicDemandsPage.actions.publish', 'Publish request')}</Link>
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {t('referralMyPublicDemandsPage.empty', 'No public request published yet.')}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="rounded-2xl border-border/60">
              <CardHeader className="space-y-3 border-b border-border/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                  <Badge variant="outline">{item.target_role}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{STATUS_LABELS[item.status] || item.status}</Badge>
                  {item.city ? <span className="text-xs text-muted-foreground">{item.city}</span> : null}
                  <span className="text-xs text-muted-foreground">
                    {responseCountMap.get(item.id) || 0} reponse(s)
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {tf('referralMyPublicDemandsPage.publishedOn', 'Published on {date}', {
                      date: new Date(item.created_at).toLocaleDateString(dateLocale),
                    })}
                  </span>
                  {item.expires_at ? (
                    <span className="text-xs text-muted-foreground">
                      {tf('referralMyPublicDemandsPage.expiresOn', 'Expires on {date}', {
                        date: new Date(item.expires_at).toLocaleDateString(dateLocale),
                      })}
                    </span>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="flex flex-wrap gap-2">
                  {['active', 'paused', 'closed'].map((status) => (
                    <form key={status} action={updateMyReferralDemandListingStatusForm}>
                      <input type="hidden" name="demandListingId" value={item.id} />
                      <input type="hidden" name="status" value={status} />
                      <Button type="submit" size="sm" variant={item.status === status ? 'default' : 'outline'}>
                        {STATUS_LABELS[status] || status}
                      </Button>
                    </form>
                  ))}
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/parrainages/demandes/${item.id}`}>{t('referralMyPublicDemandsPage.actions.viewPublicPage', 'View public page')}</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/parrainages/mes-demandes-publiques/${item.id}/edit`}>{t('referralMyPublicDemandsPage.actions.edit', 'Edit')}</Link>
                  </Button>
                  <form action={retractReferralDemandListingForm}>
                    <input type="hidden" name="demandListingId" value={item.id} />
                    <Button type="submit" size="sm" variant="destructive">{t('referralMyPublicDemandsPage.actions.delete', 'Delete')}</Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
