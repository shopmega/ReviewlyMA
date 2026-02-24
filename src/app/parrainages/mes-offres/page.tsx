import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { sendReferralMessageForm, updateMyReferralOfferStatusForm, updateReferralRequestStatusForm } from '@/app/actions/referrals';

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
  linkedin_url: string | null;
};

type ReferralMessage = {
  id: string;
  request_id: string;
  sender_user_id: string;
  message: string;
  created_at: string;
};

const OFFER_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  paused: 'En pause',
  closed: 'Fermee',
};

const REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: 'Recue',
  in_review: 'En revue',
  referred: 'Parraine',
  interview: 'Entretien',
  hired: 'Embauche',
  rejected: 'Refusee',
  withdrawn: 'Retiree',
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

  let requests: Request[] = [];
  let messages: ReferralMessage[] = [];
  let requestsLoadError = '';
  if (items.length > 0) {
    const { data, error } = await supabase.rpc('get_my_referral_offer_requests');
    if (error) {
      requestsLoadError = 'Impossible de charger les demandes recues pour le moment.';
    } else {
      requests = (data || []) as Request[];
      const requestIds = requests.map((r) => r.id);
      if (requestIds.length > 0) {
        const { data: messageData } = await supabase
          .from('job_referral_messages')
          .select('id, request_id, sender_user_id, message, created_at')
          .in('request_id', requestIds)
          .order('created_at', { ascending: true });
        messages = (messageData || []) as ReferralMessage[];
      }
    }
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
          {requestsLoadError ? (
            <Card>
              <CardContent className="py-4 text-sm text-destructive">
                {requestsLoadError}
              </CardContent>
            </Card>
          ) : null}
          {items.map((offer) => {
            const offerRequests = requests.filter((r) => r.offer_id === offer.id);
            return (
              <Card key={offer.id} className="rounded-2xl border-border/60">
                <CardHeader className="space-y-3 border-b border-border/50">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-xl">{offer.job_title}</CardTitle>
                    <Badge variant="outline">{offer.company_name}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{OFFER_STATUS_LABELS[offer.status] || offer.status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      Publiee le {new Date(offer.created_at).toLocaleDateString('fr-MA')}
                    </span>
                    <span className="text-xs text-muted-foreground">- {offerRequests.length} demande(s)</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 pt-5">
                  <div className="flex flex-wrap gap-2">
                    {['active', 'paused', 'closed'].map((status) => (
                      <form key={status} action={updateMyReferralOfferStatusForm}>
                        <input type="hidden" name="offerId" value={offer.id} />
                        <input type="hidden" name="status" value={status} />
                        <Button type="submit" size="sm" variant={offer.status === status ? 'default' : 'outline'}>
                          {OFFER_STATUS_LABELS[status] || status}
                        </Button>
                      </form>
                    ))}
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/parrainages/${offer.id}`}>Voir la page offre</Link>
                    </Button>
                  </div>

                  {offerRequests.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune demande recue pour cette offre.</p>
                  ) : (
                    <div className="space-y-3">
                      {offerRequests.map((request) => (
                        <div key={request.id} className="rounded-xl border border-border/60 p-4 space-y-3 bg-background/60">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm">
                              <Link href={`/users/${request.candidate_user_id}`} className="font-semibold text-primary hover:underline">
                                Candidat {request.candidate_user_id.slice(0, 8)}...
                              </Link>
                              <span className="text-muted-foreground text-xs ml-2">
                                {new Date(request.created_at).toLocaleDateString('fr-MA')}
                              </span>
                            </div>
                            <Badge variant="secondary">{REQUEST_STATUS_LABELS[request.status] || request.status}</Badge>
                          </div>

                          {request.message ? (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-md bg-muted/40 p-3">
                              {request.message}
                            </p>
                          ) : null}

                          <div className="flex flex-wrap items-center gap-2">
                            {request.cv_url ? (
                              <Button asChild size="sm" variant="outline">
                                <Link href={request.cv_url} target="_blank">Telecharger CV</Link>
                              </Button>
                            ) : null}
                            {request.linkedin_url ? (
                              <Button asChild size="sm" variant="outline">
                                <Link href={request.linkedin_url} target="_blank">
                                  LinkedIn
                                </Link>
                              </Button>
                            ) : null}
                            {!request.cv_url && !request.linkedin_url ? (
                              <p className="text-xs text-muted-foreground">Aucun CV ni lien LinkedIn fourni par le candidat.</p>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap gap-2 pt-1">
                            {['in_review', 'referred', 'interview', 'hired', 'rejected'].map((status) => (
                              <form key={status} action={updateReferralRequestStatusForm}>
                                <input type="hidden" name="requestId" value={request.id} />
                                <input type="hidden" name="status" value={status} />
                                <Button type="submit" size="sm" variant={request.status === status ? 'default' : 'outline'}>
                                  {REQUEST_STATUS_LABELS[status] || status}
                                </Button>
                              </form>
                            ))}
                          </div>

                          <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Conversation</p>
                            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                              {messages.filter((m) => m.request_id === request.id).length === 0 ? (
                                <p className="text-xs text-muted-foreground">Aucun message pour le moment.</p>
                              ) : (
                                messages
                                  .filter((m) => m.request_id === request.id)
                                  .map((m) => {
                                    const isMe = m.sender_user_id === auth.user.id;
                                    return (
                                      <div key={m.id} className={`rounded-md px-3 py-2 text-sm ${isMe ? 'bg-primary/10 ml-6' : 'bg-background mr-6 border'}`}>
                                        <p className="text-xs text-muted-foreground mb-1">
                                          {isMe ? 'Vous' : 'Candidat'} - {new Date(m.created_at).toLocaleDateString('fr-MA')}
                                        </p>
                                        <p className="whitespace-pre-wrap">{m.message}</p>
                                      </div>
                                    );
                                  })
                              )}
                            </div>

                            <form action={sendReferralMessageForm} className="space-y-2">
                              <input type="hidden" name="requestId" value={request.id} />
                              <textarea
                                name="message"
                                required
                                minLength={2}
                                className="min-h-[72px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                                placeholder="Envoyer un message au candidat..."
                              />
                              <div className="flex justify-end">
                                <Button type="submit" size="sm">Envoyer</Button>
                              </div>
                            </form>
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
