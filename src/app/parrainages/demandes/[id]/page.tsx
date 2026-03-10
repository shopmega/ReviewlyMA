import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock3, MapPin } from 'lucide-react';
import { InternalAdsSlot } from '@/components/shared/InternalAdsSlot';
import { ContentShareButton } from '@/components/shared/ContentShareButton';
import { SoftAuthTriggerButton } from '@/components/auth/SoftAuthTriggerButton';
import { getServerSiteUrl } from '@/lib/site-config';
import { DemandResponseForm } from './DemandResponseForm';

type Params = { id: string };

type DemandListing = {
  id: string;
  user_id: string;
  title: string;
  target_role: string;
  city: string | null;
  contract_type: string | null;
  work_mode: string | null;
  seniority: string | null;
  summary: string;
  details: string | null;
  expires_at: string | null;
  created_at: string;
  status: string;
};

type DemandResponse = {
  id: string;
  demand_listing_id: string;
  responder_user_id: string;
  message: string;
  referral_offer_id: string | null;
  status: string;
  created_at: string;
};

type LinkedOffer = {
  id: string;
  company_name: string;
  job_title: string;
};

export const dynamic = 'force-dynamic';

async function getDemandListingById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('job_referral_demand_listings')
    .select('id, user_id, title, target_role, city, contract_type, work_mode, seniority, summary, details, expires_at, created_at, status')
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle();

  return (data as DemandListing | null) || null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const siteUrl = getServerSiteUrl();
  const item = await getDemandListingById(id);
  if (!item) {
    return {
      title: 'Demande de parrainage | Reviewly MA',
      alternates: { canonical: `${siteUrl}/parrainages/demandes/${id}` },
    };
  }

  const citySuffix = item.city ? ` - ${item.city}` : '';
  const title = `${item.target_role}${citySuffix} | Demande de parrainage`;
  const description = `Demande publique de parrainage pour ${item.target_role}${citySuffix}. Donnees anonymisees et moderees.`;
  const ogQuery = new URLSearchParams({
    role: item.target_role,
    city: item.city || '',
    title: item.title,
  });
  const canonical = `${siteUrl}/parrainages/demandes/${item.id}`;
  const image = `${siteUrl}/api/og/referral-demand?${ogQuery.toString()}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
      images: [{ url: image, width: 1200, height: 630, alt: 'Demande de parrainage' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function ReferralDemandDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const siteUrl = getServerSiteUrl();
  const item = await getDemandListingById(id);
  if (!item) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const currentUserId = auth.user?.id ?? null;
  const isOwner = currentUserId === item.user_id;

  let existingResponse: { id: string; status: string } | null = null;
  if (currentUserId && !isOwner) {
    const { data } = await supabase
      .from('job_referral_demand_responses')
      .select('id, status')
      .eq('demand_listing_id', item.id)
      .eq('responder_user_id', currentUserId)
      .eq('status', 'active')
      .maybeSingle();
    existingResponse = (data as { id: string; status: string } | null) || null;
  }

  let ownerResponses: DemandResponse[] = [];
  let offerMap = new Map<string, LinkedOffer>();
  if (isOwner) {
    const { data } = await supabase
      .from('job_referral_demand_responses')
      .select('id, demand_listing_id, responder_user_id, message, referral_offer_id, status, created_at')
      .eq('demand_listing_id', item.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    ownerResponses = (data || []) as DemandResponse[];
    const linkedOfferIds = [...new Set(ownerResponses.map((response) => response.referral_offer_id).filter(Boolean))] as string[];

    if (linkedOfferIds.length > 0) {
      const { data: offers } = await supabase
        .from('job_referral_offers')
        .select('id, company_name, job_title')
        .in('id', linkedOfferIds);
      offerMap = new Map((offers || []).map((offer) => [offer.id, offer as LinkedOffer]));
    }
  }

  const demandShareUrl = `${siteUrl}/parrainages/demandes/${item.id}`;
  const demandShareText = `Demande de parrainage: ${item.target_role}${item.city ? ` a ${item.city}` : ''}.`;

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
              <p>Repondez ici pour proposer un parrainage et centraliser les echanges.</p>
              <ContentShareButton
                url={demandShareUrl}
                title={`Demande de parrainage: ${item.target_role}`}
                text={demandShareText}
                contentType="referral_demand"
                contentId={item.id}
                cardType="referral_demand_snapshot"
                className="w-full rounded-xl"
              />
              <Button asChild className="w-full rounded-xl">
                <Link href="/parrainages/demandes/new">Publier votre demande</Link>
              </Button>
            </CardContent>
          </Card>

          {!currentUserId ? (
            <SoftAuthTriggerButton
              label="Se connecter pour repondre"
              nextPath={`/parrainages/demandes/${item.id}#respond-form`}
              intent="referral_demand_reply"
              className="w-full rounded-xl"
              title="Proposez un parrainage en quelques clics"
              description="Connectez-vous pour envoyer votre reponse et aider ce candidat."
            />
          ) : null}

          {currentUserId && !isOwner ? (
            <DemandResponseForm demandListingId={item.id} existingResponse={existingResponse} />
          ) : null}

          {isOwner ? (
            <Card className="rounded-2xl">
              <CardContent className="pt-6 space-y-3">
                <h2 className="text-sm font-semibold">Reponses recues ({ownerResponses.length})</h2>
                {ownerResponses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune reponse pour le moment.</p>
                ) : (
                  <div className="space-y-3">
                    {ownerResponses.slice(0, 8).map((response) => {
                      const linkedOffer = response.referral_offer_id ? offerMap.get(response.referral_offer_id) : null;
                      return (
                        <div key={response.id} className="rounded-xl border border-border/60 bg-background/60 p-3 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Link href={`/users/${response.responder_user_id}`} className="text-sm font-semibold text-primary hover:underline">
                              Candidat {response.responder_user_id.slice(0, 8)}...
                            </Link>
                            <span className="text-xs text-muted-foreground">
                              {new Date(response.created_at).toLocaleDateString('fr-MA')}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{response.message}</p>
                          {linkedOffer ? (
                            <p className="text-xs text-muted-foreground">
                              Offre liee:{' '}
                              <Link href={`/parrainages/${linkedOffer.id}`} className="text-primary hover:underline">
                                {linkedOffer.job_title} - {linkedOffer.company_name}
                              </Link>
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                    {ownerResponses.length > 8 ? (
                      <p className="text-xs text-muted-foreground">
                        {ownerResponses.length - 8} reponse(s) supplementaire(s) non affichee(s).
                      </p>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
