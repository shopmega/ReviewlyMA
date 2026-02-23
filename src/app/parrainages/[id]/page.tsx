import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { RequestReferralForm } from './RequestReferralForm';
import { Clock3, MapPin, Users } from 'lucide-react';

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

const formatContractType = (value: string | null) => {
  switch (value) {
    case 'cdi':
      return 'CDI';
    case 'cdd':
      return 'CDD';
    case 'stage':
      return 'Stage';
    case 'freelance':
      return 'Freelance';
    case 'alternance':
      return 'Alternance';
    case 'autre':
      return 'Autre';
    default:
      return null;
  }
};

const formatWorkMode = (value: string | null) => {
  switch (value) {
    case 'onsite':
      return 'Presentiel';
    case 'hybrid':
      return 'Hybride';
    case 'remote':
      return 'Remote';
    default:
      return null;
  }
};

const formatSeniority = (value: string | null) => {
  switch (value) {
    case 'junior':
      return 'Junior';
    case 'confirme':
      return 'Confirme';
    case 'senior':
      return 'Senior';
    case 'lead':
      return 'Lead';
    case 'manager':
      return 'Manager';
    case 'autre':
      return 'Autre';
    default:
      return null;
  }
};

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
        <Link href="/parrainages" className="text-sm text-primary hover:underline">Retour aux offres</Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{offer.company_name}</Badge>
          {offer.city && <Badge variant="secondary" className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{offer.city}</Badge>}
          {formatContractType(offer.contract_type) && <Badge variant="secondary">{formatContractType(offer.contract_type)}</Badge>}
          {formatWorkMode(offer.work_mode) && <Badge variant="secondary">{formatWorkMode(offer.work_mode)}</Badge>}
          {formatSeniority(offer.seniority) && <Badge variant="secondary">{formatSeniority(offer.seniority)}</Badge>}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold font-headline">{offer.job_title}</h1>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-4 w-4" />
            Publie le {new Date(offer.created_at).toLocaleDateString('fr-MA')}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-4 w-4" />
            Places: {offer.slots}
          </span>
          {offer.expires_at ? <span>Expire le {new Date(offer.expires_at).toLocaleDateString('fr-MA')}</span> : null}
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
                Vous etes le proprietaire de cette offre. Les demandes recues seront visibles dans votre espace utilisateur.
              </CardContent>
            </Card>
          )}

          {canApply && <RequestReferralForm offerId={offer.id} />}
        </div>
      </div>
    </div>
  );
}
