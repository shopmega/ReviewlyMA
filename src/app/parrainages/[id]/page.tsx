import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { RequestReferralForm } from './RequestReferralForm';

type OfferRecord = {
  id: string;
  user_id: string;
  company_name: string;
  job_title: string;
  city: string | null;
  contract_type: string | null;
  work_mode: string | null;
  seniority: string | null;
  description: string;
  requirements: string | null;
  slots: number;
  expires_at: string | null;
  status: string;
  created_at: string;
};

export const dynamic = 'force-dynamic';

export default async function ParrainageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const currentUserId = auth.user?.id || null;

  const { data, error } = await supabase
    .from('job_referral_offers')
    .select('id, user_id, company_name, job_title, city, contract_type, work_mode, seniority, description, requirements, slots, expires_at, status, created_at')
    .eq('id', id)
    .single();

  if (error || !data) {
    notFound();
  }

  const offer = data as OfferRecord;
  const isOwner = currentUserId === offer.user_id;
  const canApply = !!currentUserId && !isOwner && offer.status === 'active';

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-8">
      <div className="space-y-3">
        <Link href="/parrainages" className="text-sm text-primary hover:underline">← Retour aux offres</Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{offer.company_name}</Badge>
          {offer.city && <Badge variant="secondary">{offer.city}</Badge>}
          {offer.contract_type && <Badge variant="secondary">{offer.contract_type}</Badge>}
          {offer.work_mode && <Badge variant="secondary">{offer.work_mode}</Badge>}
          {offer.seniority && <Badge variant="secondary">{offer.seniority}</Badge>}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold font-headline">{offer.job_title}</h1>
        <p className="text-sm text-muted-foreground">
          Publie le {new Date(offer.created_at).toLocaleDateString('fr-MA')} • Places: {offer.slots}
          {offer.expires_at ? ` • Expire le ${new Date(offer.expires_at).toLocaleDateString('fr-MA')}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="rounded-2xl lg:col-span-2">
          <CardContent className="pt-6 space-y-5">
            <div>
              <h2 className="font-semibold mb-2">Description</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{offer.description}</p>
            </div>
            {offer.requirements && (
              <div>
                <h2 className="font-semibold mb-2">Exigences</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{offer.requirements}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {!currentUserId && (
            <Card className="rounded-2xl">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Connectez-vous pour demander un parrainage.
                <div className="mt-3">
                  <Link href={`/login?next=/parrainages/${offer.id}`} className="text-primary hover:underline">Aller a la connexion</Link>
                </div>
              </CardContent>
            </Card>
          )}

          {isOwner && (
            <Card className="rounded-2xl">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Vous etes le proprietaire de cette offre.
              </CardContent>
            </Card>
          )}

          {canApply && <RequestReferralForm offerId={offer.id} />}
        </div>
      </div>
    </div>
  );
}
