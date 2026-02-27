import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { slugify } from '@/lib/utils';

type Params = { roleSlug: string };

type ReferralOffer = {
  id: string;
  company_name: string;
  job_title: string;
  city: string | null;
  slots: number;
  created_at: string;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { roleSlug } = await params;
  return {
    title: `Parrainages poste | ${roleSlug} | Reviewly MA`,
    description: `Offres de parrainage actives pour le poste ${roleSlug} sur Reviewly MA.`,
    alternates: { canonical: `/parrainages/poste/${roleSlug}` },
  };
}

export default async function ReferralRolePage({ params }: { params: Promise<Params> }) {
  const { roleSlug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('job_referral_offers')
    .select('id, company_name, job_title, city, slots, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(250);

  const offers = ((data || []) as ReferralOffer[]).filter((offer) => slugify(offer.job_title) === roleSlug);
  const roleTitle = offers[0]?.job_title || roleSlug;

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-headline">Parrainages pour {roleTitle}</h1>
        <p className="text-sm text-muted-foreground">{offers.length} offre(s) active(s)</p>
      </div>

      {offers.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aucune offre active pour ce poste.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {offers.map((offer) => (
            <Card key={offer.id} className="rounded-2xl">
              <CardHeader className="space-y-2">
                <Badge variant="outline">{offer.company_name}</Badge>
                <CardTitle className="text-xl">{offer.job_title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{offer.city || 'Ville non precisee'}</p>
                <p>Places: {offer.slots}</p>
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
