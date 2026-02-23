import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Clock3, MapPin, Users } from 'lucide-react';

type ReferralOffer = {
  id: string;
  company_name: string;
  job_title: string;
  city: string | null;
  contract_type: string | null;
  work_mode: string | null;
  seniority: string | null;
  slots: number;
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

export default async function ParrainagesPage() {
  const supabase = await createClient();
  const { data: offers } = await supabase
    .from('job_referral_offers')
    .select('id, company_name, job_title, city, contract_type, work_mode, seniority, slots, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(60);

  const items = (offers || []) as ReferralOffer[];

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-8">
      <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-emerald-50 via-background to-sky-50 p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <Badge variant="outline" className="w-fit">Referral marketplace</Badge>
            <h1 className="text-3xl md:text-4xl font-bold font-headline">Parrainages emploi</h1>
            <p className="text-muted-foreground max-w-2xl">
              Des employes partagent des opportunites de recommandation interne. Parcourez les offres actives et envoyez une demande en quelques minutes.
            </p>
          </div>
          <Button asChild className="rounded-xl">
            <Link href="/parrainages/new">Publier une offre</Link>
          </Button>
        </div>
      </section>

      {items.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucune offre active pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map((offer) => (
            <Card key={offer.id} className="rounded-2xl border-border/60 hover:border-primary/30 transition-colors">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline">{offer.company_name}</Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    {new Date(offer.created_at).toLocaleDateString('fr-MA')}
                  </span>
                </div>
                <CardTitle className="text-xl">{offer.job_title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2 text-xs">
                  {offer.city && <Badge variant="secondary" className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{offer.city}</Badge>}
                  {formatContractType(offer.contract_type) && <Badge variant="secondary">{formatContractType(offer.contract_type)}</Badge>}
                  {formatWorkMode(offer.work_mode) && <Badge variant="secondary">{formatWorkMode(offer.work_mode)}</Badge>}
                  {formatSeniority(offer.seniority) && <Badge variant="secondary">{formatSeniority(offer.seniority)}</Badge>}
                </div>
                <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Places disponibles: {offer.slots}
                </p>
                <Button asChild variant="outline" className="w-full rounded-xl">
                  <Link href={`/parrainages/${offer.id}`} className="inline-flex items-center justify-center gap-2">
                    Voir l&apos;offre
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
