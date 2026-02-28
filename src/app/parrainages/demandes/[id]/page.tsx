import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock3, MapPin } from 'lucide-react';
import { InternalAdsSlot } from '@/components/shared/InternalAdsSlot';

type Params = { id: string };

type DemandListing = {
  id: string;
  title: string;
  target_role: string;
  city: string | null;
  contract_type: string | null;
  work_mode: string | null;
  seniority: string | null;
  summary: string;
  details: string | null;
  created_at: string;
  status: string;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  return {
    title: 'Demande de parrainage | Reviewly MA',
    alternates: { canonical: `/parrainages/demandes/${id}` },
  };
}

export default async function ReferralDemandDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('job_referral_demand_listings')
    .select('id, title, target_role, city, contract_type, work_mode, seniority, summary, details, created_at, status')
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle();

  const item = data as DemandListing | null;
  if (!item) notFound();

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-4">
        <Link href="/parrainages/demandes" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Retour au board
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{item.target_role}</Badge>
          {item.city && (
            <Badge variant="secondary" className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {item.city}
            </Badge>
          )}
          <Badge variant="secondary" className="inline-flex items-center gap-1">
            <Clock3 className="h-3 w-3" />
            {new Date(item.created_at).toLocaleDateString('fr-MA')}
          </Badge>
        </div>
        <h1 className="text-3xl font-bold font-headline">{item.title}</h1>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="rounded-2xl lg:col-span-2">
          <CardContent className="pt-6 space-y-5">
            <div>
              <h2 className="font-semibold mb-2">Resume</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.summary}</p>
            </div>
            {item.details && (
              <div>
                <h2 className="font-semibold mb-2">Details</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.details}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <InternalAdsSlot placement="referrals_detail_sidebar" limit={1} />
          <Card className="rounded-2xl">
            <CardContent className="pt-6 text-sm text-muted-foreground space-y-3">
              <p>Vous pouvez contacter ce candidat via vos canaux habituels de candidature.</p>
              <Button asChild className="w-full rounded-xl">
                <Link href="/parrainages/demandes/new">Publier votre demande</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
