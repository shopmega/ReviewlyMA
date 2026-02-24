import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { updateMyReferralOfferStatusForm, updateReferralRequestStatusForm } from '@/app/actions/referrals';

export const dynamic = 'force-dynamic';

type Offer = {
  id: string;
  company_name: string;
  job_title: string;
  status: string;
  created_at: string;
  slots: number;
};

type Request = {
  id: string;
  offer_id: string;
  candidate_user_id: string;
  message: string | null;
  status: string;
  created_at: string;
  cv_url: string | null;
};

export default async function MyReferralOffersPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect('/login?next=/parrainages/mes-offres');
  }

  const { data: offers } = await supabase
    .from('job_referral_offers')
    .select('id, company_name, job_title, status, created_at, slots')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });

  const items = (offers || []) as Offer[];
  const offerIds = items.map((o) => o.id);

  let requests: Request[] = [];
  if (offerIds.length > 0) {
    const { data } = await supabase
      .from('job_referral_requests')
      .select('id, offer_id, candidate_user_id, message, status, created_at, cv_url')
      .in('offer_id', offerIds)
      .order('created_at', { ascending: false });
    requests = (data || []) as Request[];
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold font-headline">Mes offres de parrainage</h1>
          <p className="text-sm text-muted-foreground">Gerez vos offres et les demandes recues.</p>
        </div>
        <Button asChild>
          <Link href="/parrainages/new">Publier une offre</Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aucune offre publiee pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((offer) => {
            const offerRequests = requests.filter((r) => r.offer_id === offer.id);
            return (
              <Card key={offer.id}>
                <CardHeader className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-xl">{offer.job_title}</CardTitle>
                    <Badge variant="outline">{offer.company_name}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{offer.status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(offer.created_at).toLocaleDateString('fr-MA')} - {offerRequests.length} demande(s)
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {['active', 'paused', 'closed'].map((status) => (
                      <form key={status} action={updateMyReferralOfferStatusForm}>
                        <input type="hidden" name="offerId" value={offer.id} />
                        <input type="hidden" name="status" value={status} />
                        <Button type="submit" size="sm" variant={offer.status === status ? 'default' : 'outline'}>
                          {status}
                        </Button>
                      </form>
                    ))}
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/parrainages/${offer.id}`}>Voir la page offre</Link>
                    </Button>
                  </div>

                  {offerRequests.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune demande pour cette offre.</p>
                  ) : (
                    <div className="space-y-3">
                      {offerRequests.map((request) => (
                        <div key={request.id} className="rounded-lg border p-3 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs text-muted-foreground">
                              Candidat: {request.candidate_user_id.slice(0, 8)}... - {new Date(request.created_at).toLocaleDateString('fr-MA')}
                            </div>
                            <Badge variant="secondary">{request.status}</Badge>
                          </div>
                          {request.message ? (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.message}</p>
                          ) : null}
                          {request.cv_url ? (
                            <Link href={request.cv_url} target="_blank" className="text-xs text-primary hover:underline">Voir CV</Link>
                          ) : null}
                          <div className="flex flex-wrap gap-2">
                            {['in_review', 'referred', 'interview', 'hired', 'rejected'].map((status) => (
                              <form key={status} action={updateReferralRequestStatusForm}>
                                <input type="hidden" name="requestId" value={request.id} />
                                <input type="hidden" name="status" value={status} />
                                <Button type="submit" size="sm" variant={request.status === status ? 'default' : 'outline'}>
                                  {status}
                                </Button>
                              </form>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
