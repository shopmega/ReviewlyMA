import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold font-headline">Parrainages emploi</h1>
          <p className="text-muted-foreground max-w-2xl">
            Des employes partagent des opportunites de recommandation interne. Parcourez les offres et envoyez votre demande.
          </p>
        </div>
        <Button asChild className="rounded-xl">
          <Link href="/parrainages/new">Publier une offre</Link>
        </Button>
      </div>

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
                  <span className="text-xs text-muted-foreground">
                    {new Date(offer.created_at).toLocaleDateString('fr-MA')}
                  </span>
                </div>
                <CardTitle className="text-xl">{offer.job_title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2 text-xs">
                  {offer.city && <Badge variant="secondary">{offer.city}</Badge>}
                  {offer.contract_type && <Badge variant="secondary">{offer.contract_type}</Badge>}
                  {offer.work_mode && <Badge variant="secondary">{offer.work_mode}</Badge>}
                  {offer.seniority && <Badge variant="secondary">{offer.seniority}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">Places disponibles: {offer.slots}</p>
                <Button asChild variant="outline" className="w-full rounded-xl">
                  <Link href={`/parrainages/${offer.id}`}>Voir l&apos;offre</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
