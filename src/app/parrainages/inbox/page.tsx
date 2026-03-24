import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getServerTranslator } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

type OfferRequest = {
  id: string;
  offer_id: string;
  candidate_user_id: string;
  message: string | null;
  status: string;
  created_at: string;
  response_due_at: string | null;
};

type OfferSummary = {
  id: string;
  job_title: string;
  company_name: string;
};

type DemandListing = {
  id: string;
  title: string;
  target_role: string;
};

type DemandResponse = {
  id: string;
  demand_listing_id: string;
  responder_user_id: string;
  message: string;
  referral_offer_id: string | null;
  status: string;
  created_at: string;
};

export default async function ReferralInboxPage() {
  const { t, locale } = await getServerTranslator();
  const dateLocale = locale === 'fr' ? 'fr-MA' : 'en-US';

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect('/login?next=/parrainages/inbox');
  }

  const userId = auth.user.id;

  const { data: offerRequestRows } = await supabase.rpc('get_my_referral_offer_requests');
  const offerRequests = (offerRequestRows || []) as OfferRequest[];
  const offerIds = [...new Set(offerRequests.map((item) => item.offer_id))];

  let offerMap = new Map<string, OfferSummary>();
  if (offerIds.length > 0) {
    const { data: offerRows } = await supabase
      .from('job_referral_offers')
      .select('id, job_title, company_name')
      .in('id', offerIds);

    offerMap = new Map((offerRows || []).map((item) => [item.id, item as OfferSummary]));
  }

  const { data: ownDemandRows } = await supabase
    .from('job_referral_demand_listings')
    .select('id, title, target_role')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);

  const ownDemands = (ownDemandRows || []) as DemandListing[];
  const ownDemandIds = ownDemands.map((item) => item.id);
  const demandMap = new Map(ownDemands.map((item) => [item.id, item]));

  let demandResponses: DemandResponse[] = [];
  if (ownDemandIds.length > 0) {
    const { data: demandResponseRows } = await supabase
      .from('job_referral_demand_responses')
      .select('id, demand_listing_id, responder_user_id, message, referral_offer_id, status, created_at')
      .in('demand_listing_id', ownDemandIds)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(200);
    demandResponses = (demandResponseRows || []) as DemandResponse[];
  }

  const linkedOfferIds = [...new Set(demandResponses.map((item) => item.referral_offer_id).filter(Boolean))] as string[];
  let linkedOfferMap = new Map<string, OfferSummary>();
  if (linkedOfferIds.length > 0) {
    const { data: linkedOffers } = await supabase
      .from('job_referral_offers')
      .select('id, job_title, company_name')
      .in('id', linkedOfferIds);

    linkedOfferMap = new Map((linkedOffers || []).map((item) => [item.id, item as OfferSummary]));
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold font-headline">Inbox parrainages</h1>
          <p className="text-sm text-muted-foreground">
            Vue unifiee: demandes recues sur vos offres + reponses recues sur vos demandes publiques.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/parrainages/mes-offres">{t('referrals.list.myOffers', 'Mes offres')}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/parrainages/mes-demandes-publiques">Mes demandes publiques</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Demandes recues sur vos offres</p>
            <p className="text-2xl font-semibold">{offerRequests.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Reponses recues sur vos demandes publiques</p>
            <p className="text-2xl font-semibold">{demandResponses.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Canal offres: demandes recues</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {offerRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune demande recue pour le moment.</p>
          ) : (
            offerRequests.slice(0, 30).map((item) => {
              const offer = offerMap.get(item.offer_id);
              return (
                <div key={item.id} className="rounded-xl border border-border/60 p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{offer?.job_title || 'Offre'}</p>
                      <p className="text-xs text-muted-foreground">{offer?.company_name || 'Entreprise'}</p>
                    </div>
                    <Badge variant="secondary">{item.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString(dateLocale)}
                    {item.response_due_at ? ` - SLA ${new Date(item.response_due_at).toLocaleDateString(dateLocale)}` : ''}
                  </p>
                  {item.message ? <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.message}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href="/parrainages/mes-offres">Ouvrir dans Mes offres</Link>
                    </Button>
                    {offer ? (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/parrainages/${offer.id}`}>Voir l&apos;offre</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Canal demandes: reponses recues</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {demandResponses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune reponse recue pour le moment.</p>
          ) : (
            demandResponses.slice(0, 30).map((item) => {
              const demand = demandMap.get(item.demand_listing_id);
              const linkedOffer = item.referral_offer_id ? linkedOfferMap.get(item.referral_offer_id) : null;
              return (
                <div key={item.id} className="rounded-xl border border-border/60 p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{demand?.title || 'Demande'}</p>
                      <p className="text-xs text-muted-foreground">{demand?.target_role || 'Role non precise'}</p>
                    </div>
                    <Badge variant="secondary">{item.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString(dateLocale)} - Candidat {item.responder_user_id.slice(0, 8)}...
                  </p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.message}</p>
                  {linkedOffer ? (
                    <p className="text-xs text-muted-foreground">
                      Offre liee: {linkedOffer.job_title} ({linkedOffer.company_name})
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/parrainages/demandes/${item.demand_listing_id}`}>Ouvrir la demande</Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link href="/parrainages/mes-demandes-publiques">Ouvrir dans Mes demandes publiques</Link>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
