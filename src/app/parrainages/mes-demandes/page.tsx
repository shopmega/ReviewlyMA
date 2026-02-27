import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { blockReferralUserForm, sendReferralMessageForm, updateReferralRequestStatusForm } from '@/app/actions/referrals';

export const dynamic = 'force-dynamic';

type MyRequest = {
  id: string;
  offer_id: string;
  message: string | null;
  status: string;
  created_at: string;
  cv_url: string | null;
  offer: {
    id: string;
    company_name: string;
    job_title: string;
    status: string;
    user_id: string;
  } | null;
};

type ReferralMessage = {
  id: string;
  request_id: string;
  sender_user_id: string;
  message: string;
  created_at: string;
};

type MyRequestRow = Omit<MyRequest, 'offer'> & {
  offer:
    | {
        id: string;
        company_name: string;
        job_title: string;
        status: string;
        user_id: string;
      }
    | {
        id: string;
        company_name: string;
        job_title: string;
        status: string;
        user_id: string;
      }[]
    | null;
};

const REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: 'Envoyee',
  in_review: 'En revue',
  referred: 'Parraine',
  interview: 'Entretien',
  hired: 'Embauche',
  rejected: 'Refusee',
  withdrawn: 'Retiree',
};

export default async function MyReferralRequestsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect('/login?next=/parrainages/mes-demandes');
  }

  const { data } = await supabase
    .from('job_referral_requests')
    .select(`
      id,
      offer_id,
      message,
      status,
      created_at,
      cv_url,
      offer:job_referral_offers!offer_id (
        id,
        company_name,
        job_title,
        status,
        user_id
      )
    `)
    .eq('candidate_user_id', auth.user.id)
    .order('created_at', { ascending: false });

  const requests = ((data || []) as MyRequestRow[]).map((request) => ({
    ...request,
    offer: Array.isArray(request.offer) ? (request.offer[0] ?? null) : request.offer,
  }));

  let messages: ReferralMessage[] = [];
  if (requests.length > 0) {
    const requestIds = requests.map((r) => r.id);
    const { data: messageData } = await supabase
      .from('job_referral_messages')
      .select('id, request_id, sender_user_id, message, created_at')
      .in('request_id', requestIds)
      .order('created_at', { ascending: true });
    messages = (messageData || []) as ReferralMessage[];
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Mes demandes de parrainage</h1>
        <p className="text-sm text-muted-foreground">Suivez le statut de vos demandes et retirez-les si necessaire.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-semibold">{requests.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">En attente</p>
            <p className="text-2xl font-semibold">{requests.filter((r) => ['pending', 'in_review'].includes(r.status)).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Parrainages actifs</p>
            <p className="text-2xl font-semibold">{requests.filter((r) => ['referred', 'interview'].includes(r.status)).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Embauches</p>
            <p className="text-2xl font-semibold">{requests.filter((r) => r.status === 'hired').length}</p>
          </CardContent>
        </Card>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aucune demande pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-xl">{request.offer?.job_title || 'Offre'}</CardTitle>
                  <Badge variant="outline">{request.offer?.company_name || 'Entreprise'}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{REQUEST_STATUS_LABELS[request.status] || request.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Envoyee le {new Date(request.created_at).toLocaleDateString('fr-MA')}
                  </span>
                  {['pending', 'in_review'].includes(request.status) ? (
                    <span className="text-xs text-amber-700">Reponse attendue sous 72h</span>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {request.message ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.message}</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {request.offer ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/parrainages/${request.offer.id}`}>Voir l&apos;offre</Link>
                    </Button>
                  ) : null}
                  {request.cv_url ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={request.cv_url} target="_blank">Voir mon CV</Link>
                    </Button>
                  ) : null}
                  {!['withdrawn', 'hired', 'rejected'].includes(request.status) && (
                    <form action={updateReferralRequestStatusForm}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="status" value="withdrawn" />
                      <Button type="submit" size="sm" variant="destructive">
                        Retirer ma demande
                      </Button>
                    </form>
                  )}
                  {request.offer?.user_id ? (
                    <form action={blockReferralUserForm}>
                      <input type="hidden" name="offerId" value={request.offer.id} />
                      <input type="hidden" name="blockedUserId" value={request.offer.user_id} />
                      <input type="hidden" name="reason" value="blocked_by_candidate" />
                      <Button type="submit" size="sm" variant="destructive">
                        Bloquer le recruteur
                      </Button>
                    </form>
                  ) : null}
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
                                {isMe ? 'Vous' : 'Recruteur'} - {new Date(m.created_at).toLocaleDateString('fr-MA')}
                              </p>
                              <p className="whitespace-pre-wrap">{m.message}</p>
                            </div>
                          );
                        })
                    )}
                  </div>
                  {!['withdrawn', 'hired', 'rejected'].includes(request.status) ? (
                    <form action={sendReferralMessageForm} className="space-y-2">
                      <input type="hidden" name="requestId" value={request.id} />
                      <textarea
                        name="message"
                        required
                        minLength={2}
                        className="min-h-[72px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                        placeholder="Envoyer un message au recruteur..."
                      />
                      <div className="flex justify-end">
                        <Button type="submit" size="sm">Envoyer</Button>
                      </div>
                    </form>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
