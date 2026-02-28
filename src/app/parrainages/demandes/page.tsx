import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock3, ArrowRight } from 'lucide-react';
import { InternalAdsSlot } from '@/components/shared/InternalAdsSlot';

type DemandListing = {
  id: string;
  title: string;
  target_role: string;
  city: string | null;
  contract_type: string | null;
  work_mode: string | null;
  seniority: string | null;
  summary: string;
  created_at: string;
};

type SearchParams = { [key: string]: string | string[] | undefined };

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Demandes de parrainage | Reviewly MA',
    description: 'Consultez les demandes publiques de candidats a la recherche d un parrainage.',
    alternates: { canonical: '/parrainages/demandes' },
  };
}

const getParam = (params: SearchParams, key: string) => {
  const value = params[key];
  if (typeof value !== 'string') return '';
  return value.trim();
};

export default async function ReferralDemandBoardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const currentUserId = auth.user?.id ?? null;

  const search = getParam(params, 'search');
  const city = getParam(params, 'city');

  let query = supabase
    .from('job_referral_demand_listings')
    .select('id, title, target_role, city, contract_type, work_mode, seniority, summary, created_at', { count: 'exact' })
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (search) {
    const cleaned = search.replace(/[%_]/g, '');
    query = query.or(`title.ilike.%${cleaned}%,target_role.ilike.%${cleaned}%,summary.ilike.%${cleaned}%`);
  }
  if (city) query = query.ilike('city', city);

  const { data, count } = await query.limit(80);
  const listings = (data || []) as DemandListing[];

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <Badge variant="outline" className="w-fit">Demand board</Badge>
            <h1 className="text-3xl md:text-4xl font-bold font-headline">Demandes de parrainage</h1>
            <p className="text-muted-foreground max-w-2xl">
              Les candidats publient leurs besoins. Les employes peuvent identifier des profils a recommander.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentUserId ? (
              <>
                <Button asChild variant="outline" className="rounded-xl">
                  <Link href="/parrainages/mes-demandes">Mes demandes privees</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl">
                  <Link href="/parrainages/mes-demandes-publiques">Mes demandes publiques</Link>
                </Button>
              </>
            ) : null}
            <Button asChild className="rounded-xl">
              <Link href="/parrainages/demandes/new">Publier une demande</Link>
            </Button>
          </div>
        </div>
      </section>

      <InternalAdsSlot placement="referrals_top_banner" />

      <Card className="rounded-2xl border-border bg-card">
        <CardContent className="pt-6 space-y-4">
          <form method="get" className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Poste, mots-cles..."
              className="h-10 rounded-md border bg-background px-3 text-sm md:col-span-2"
            />
            <input
              type="text"
              name="city"
              defaultValue={city}
              placeholder="Ville"
              className="h-10 rounded-md border bg-background px-3 text-sm"
            />
            <Button type="submit" className="rounded-md">Filtrer</Button>
          </form>
          <p className="text-xs text-muted-foreground">{count ?? listings.length} resultat(s)</p>
        </CardContent>
      </Card>

      {listings.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-10 text-center text-muted-foreground">
            Aucune demande publique pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {listings.map((item) => (
            <Card key={item.id} className="rounded-2xl border-border bg-card">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="secondary">{item.target_role}</Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    {new Date(item.created_at).toLocaleDateString('fr-MA')}
                  </span>
                </div>
                <CardTitle className="text-xl">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {item.city && (
                  <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {item.city}
                  </p>
                )}
                <p className="text-sm text-muted-foreground line-clamp-4">{item.summary}</p>
                <Button asChild variant="outline" className="w-full rounded-md">
                  <Link href={`/parrainages/demandes/${item.id}`} className="inline-flex items-center justify-center gap-2">
                    Voir la demande
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <InternalAdsSlot placement="referrals_inline" />
    </div>
  );
}
