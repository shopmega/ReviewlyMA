import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { updateReferralRequestStatus } from '@/app/actions/referrals';

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
  } | null;
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
        status
      )
    `)
    .eq('candidate_user_id', auth.user.id)
    .order('created_at', { ascending: false });

  const requests = (data || []) as MyRequest[];

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Mes demandes de parrainage</h1>
        <p className="text-sm text-muted-foreground">Suivez le statut de vos demandes et retirez-les si necessaire.</p>
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
                  <Badge>{request.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Envoyee le {new Date(request.created_at).toLocaleDateString('fr-MA')}
                  </span>
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
                    <form action={updateReferralRequestStatus}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="status" value="withdrawn" />
                      <Button type="submit" size="sm" variant="destructive">
                        Retirer ma demande
                      </Button>
                    </form>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
