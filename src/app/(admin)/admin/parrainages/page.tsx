import { verifyAdminSession, createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  adminUpdateReferralOfferStatusForm,
  adminUpdateReferralReportStatusForm,
  adminUpdateReferralRequestStatusForm,
} from '@/app/actions/referrals';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type AdminOffer = {
  id: string;
  user_id: string;
  company_name: string;
  job_title: string;
  status: string;
  created_at: string;
};

type AdminRequest = {
  id: string;
  offer_id: string;
  candidate_user_id: string;
  status: string;
  created_at: string;
  message: string | null;
  offer: {
    id: string;
    company_name: string;
    job_title: string;
  } | null;
};

type AdminReport = {
  id: number;
  offer_id: string;
  reporter_user_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
};

type AdminRequestRow = Omit<AdminRequest, 'offer'> & {
  offer:
    | {
        id: string;
        company_name: string;
        job_title: string;
      }
    | {
        id: string;
        company_name: string;
        job_title: string;
      }[]
    | null;
};

export default async function AdminReferralOffersPage() {
  await verifyAdminSession();
  const admin = await createAdminClient();

  const { data: offers } = await admin
    .from('job_referral_offers')
    .select('id, user_id, company_name, job_title, status, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  const { data: requests } = await admin
    .from('job_referral_requests')
    .select(`
      id,
      offer_id,
      candidate_user_id,
      status,
      created_at,
      message,
      offer:job_referral_offers!offer_id (
        id,
        company_name,
        job_title
      )
    `)
    .order('created_at', { ascending: false })
    .limit(250);

  const { data: reports } = await admin
    .from('job_referral_offer_reports')
    .select('id, offer_id, reporter_user_id, reason, details, status, created_at')
    .order('created_at', { ascending: false })
    .limit(250);

  const items = (offers || []) as AdminOffer[];
  const requestItems = ((requests || []) as AdminRequestRow[]).map((request) => ({
    ...request,
    offer: Array.isArray(request.offer) ? (request.offer[0] ?? null) : request.offer,
  }));
  const reportItems = (reports || []) as AdminReport[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Parrainages</h1>
        <p className="text-muted-foreground mt-1">Moderation et supervision des offres de parrainage.</p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aucune offre disponible.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((offer) => (
            <Card key={offer.id}>
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-xl">{offer.job_title}</CardTitle>
                  <Badge>{offer.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {offer.company_name} - owner: {offer.user_id.slice(0, 8)}... - {new Date(offer.created_at).toLocaleDateString('fr-MA')}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {['active', 'paused', 'closed', 'rejected'].map((status) => (
                    <form key={status} action={adminUpdateReferralOfferStatusForm}>
                      <input type="hidden" name="offerId" value={offer.id} />
                      <input type="hidden" name="status" value={status} />
                      <Button type="submit" size="sm" variant={offer.status === status ? 'default' : 'outline'}>
                        {status}
                      </Button>
                    </form>
                  ))}
                  <Button asChild type="button" size="sm" variant="ghost">
                    <Link href={`/parrainages/${offer.id}`} target="_blank">Voir page publique</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="pt-4">
        <h2 className="text-2xl font-semibold tracking-tight">Demandes de parrainage</h2>
        <p className="text-sm text-muted-foreground mt-1">Suivi des candidatures et intervention admin si besoin.</p>
      </div>

      {requestItems.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aucune demande disponible.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requestItems.map((request) => (
            <Card key={request.id}>
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-lg">
                    {request.offer?.job_title || 'Offre supprimee'}
                  </CardTitle>
                  <Badge variant="secondary">{request.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {request.offer?.company_name || 'Entreprise inconnue'} - candidat: {request.candidate_user_id.slice(0, 8)}... - {new Date(request.created_at).toLocaleDateString('fr-MA')}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {request.message ? (
                  <p className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground whitespace-pre-wrap">
                    {request.message}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {['pending', 'in_review', 'referred', 'interview', 'hired', 'rejected', 'withdrawn'].map((status) => (
                    <form key={status} action={adminUpdateReferralRequestStatusForm}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="status" value={status} />
                      <Button type="submit" size="sm" variant={request.status === status ? 'default' : 'outline'}>
                        {status}
                      </Button>
                    </form>
                  ))}
                  {request.offer?.id ? (
                    <Button asChild type="button" size="sm" variant="ghost">
                      <Link href={`/parrainages/${request.offer.id}`} target="_blank">Voir offre</Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="pt-4">
        <h2 className="text-2xl font-semibold tracking-tight">Signalements</h2>
        <p className="text-sm text-muted-foreground mt-1">File de moderation securite pour les parrainages.</p>
      </div>

      {reportItems.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aucun signalement disponible.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reportItems.map((report) => (
            <Card key={report.id}>
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-lg">Signalement #{report.id}</CardTitle>
                  <Badge variant="secondary">{report.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Offre: {report.offer_id.slice(0, 8)}... - Reporter: {report.reporter_user_id.slice(0, 8)}... - {new Date(report.created_at).toLocaleDateString('fr-MA')}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge>{report.reason}</Badge>
                {report.details ? (
                  <p className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground whitespace-pre-wrap">
                    {report.details}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {['open', 'investigating', 'resolved', 'dismissed'].map((status) => (
                    <form key={status} action={adminUpdateReferralReportStatusForm}>
                      <input type="hidden" name="reportId" value={report.id} />
                      <input type="hidden" name="status" value={status} />
                      <Button type="submit" size="sm" variant={report.status === status ? 'default' : 'outline'}>
                        {status}
                      </Button>
                    </form>
                  ))}
                </div>
                <form action={adminUpdateReferralReportStatusForm} className="space-y-2">
                  <input type="hidden" name="reportId" value={report.id} />
                  <input type="hidden" name="status" value={report.status} />
                  <textarea
                    name="moderationNote"
                    className="min-h-[72px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="Note de moderation interne (optionnel)"
                  />
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" variant="outline">Enregistrer la note</Button>
                  </div>
                </form>
                <Button asChild type="button" size="sm" variant="ghost">
                  <Link href={`/parrainages/${report.offer_id}`} target="_blank">Ouvrir l&apos;offre</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
