import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RequestReferralForm } from './RequestReferralForm';
import { SafetyActions } from './SafetyActions';
import { ArrowLeft, Clock3, MapPin, ShieldCheck, Users } from 'lucide-react';
import { getServerTranslator } from '@/lib/i18n/server';
import { slugify } from '@/lib/utils';
import { InternalAdsSlot } from '@/components/shared/InternalAdsSlot';

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
  identity_level: string | null;
  verification_status: string | null;
  trust_score: number | null;
  response_rate: number | null;
  response_hours_avg: number | null;
};

const DESCRIPTION_INTEGRITY_TOKENS = [
  'user_id',
  'candidate_id',
  'status (',
  'referral_requests',
  'referral_messages',
  'sender_id',
];

export const dynamic = 'force-dynamic';

type Params = { id: string };

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

const getTrustLabel = (offer: OfferRecord) => {
  if (offer.identity_level === 'verified_employee' || offer.verification_status === 'verified') return 'Employe verifie';
  if (offer.identity_level === 'public') return 'Identite publique';
  return 'Identite masquee';
};

const hasCorruptedDescription = (value: string) => {
  const lower = value.toLowerCase();
  const tokenCount = DESCRIPTION_INTEGRITY_TOKENS.reduce((acc, token) => acc + (lower.includes(token) ? 1 : 0), 0);
  return tokenCount >= 3;
};

async function getOfferById(id: string) {
  const supabase = await createClient();
  const query = await supabase
    .from('job_referral_offers')
    .select(
      'id, user_id, company_name, job_title, city, contract_type, work_mode, seniority, description, requirements, slots, expires_at, status, created_at, identity_level, verification_status, trust_score, response_rate, response_hours_avg'
    )
    .eq('id', id)
    .single();

  if (!query.error) return query.data as OfferRecord;
  if (!query.error.message.includes('identity_level') && !query.error.message.includes('verification_status')) return null;

  const fallback = await supabase
    .from('job_referral_offers')
    .select('id, user_id, company_name, job_title, city, contract_type, work_mode, seniority, description, requirements, slots, expires_at, status, created_at')
    .eq('id', id)
    .single();

  if (fallback.error || !fallback.data) return null;
  return {
    ...(fallback.data as any),
    identity_level: 'anonymous',
    verification_status: 'unverified',
    trust_score: null,
    response_rate: null,
    response_hours_avg: null,
  } as OfferRecord;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const offer = await getOfferById(id);
  if (!offer) {
    return {
      title: 'Offre de parrainage | Reviewly MA',
      alternates: { canonical: `/parrainages/${id}` },
    };
  }

  const citySuffix = offer.city ? ` - ${offer.city}` : '';
  return {
    title: `${offer.job_title} chez ${offer.company_name}${citySuffix} | Parrainage`,
    description: `Offre de parrainage pour ${offer.job_title} chez ${offer.company_name}${citySuffix}. Demande securisee sur Reviewly MA.`,
    alternates: {
      canonical: `/parrainages/${offer.id}`,
    },
  };
}

export default async function ParrainageDetailPage({ params }: { params: Promise<Params> }) {
  const { t, locale } = await getServerTranslator();
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const currentUserId = auth.user?.id || null;

  const offer = await getOfferById(id);
  if (!offer) {
    notFound();
  }

  const isOwner = currentUserId === offer.user_id;
  const canApply = !!currentUserId && !isOwner && offer.status === 'active';
  const publishedAt = new Date(offer.created_at).toLocaleDateString(locale);
  const expiresAt = offer.expires_at ? new Date(offer.expires_at).toLocaleDateString(locale) : null;
  const statusLabel =
    offer.status === 'active'
      ? t('referrals.detail.statusActive', 'Active')
      : offer.status === 'paused'
        ? t('referrals.detail.statusPaused', 'En pause')
        : offer.status === 'closed'
          ? t('referrals.detail.statusClosed', 'Fermee')
          : t('referrals.detail.statusRejected', 'Indisponible');

  const safeDescription = hasCorruptedDescription(offer.description)
    ? "Description temporairement masquee pour verification. Merci de consulter les informations principales et de signaler l'offre si necessaire."
    : offer.description;

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-8">
      <section className="rounded-3xl border border-border/70 bg-gradient-to-br from-sky-50 via-background to-emerald-50 p-6 md:p-8">
        <div className="space-y-5">
          <Link href="/parrainages" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" />
            {t('referrals.detail.back', 'Retour aux offres')}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{offer.company_name}</Badge>
            <Badge variant="secondary">{statusLabel}</Badge>
            <Badge variant="secondary" className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              {getTrustLabel(offer)}{offer.trust_score != null ? ` • ${offer.trust_score}/100` : ''}
            </Badge>
            {offer.city && <Badge variant="secondary" className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{offer.city}</Badge>}
            {formatContractType(offer.contract_type) && <Badge variant="secondary">{formatContractType(offer.contract_type)}</Badge>}
            {formatWorkMode(offer.work_mode) && <Badge variant="secondary">{formatWorkMode(offer.work_mode)}</Badge>}
            {formatSeniority(offer.seniority) && <Badge variant="secondary">{formatSeniority(offer.seniority)}</Badge>}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-headline">{offer.job_title}</h1>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-4 w-4" />
              {t('referrals.detail.publishedOn', 'Publie le')} {publishedAt}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-4 w-4" />
              {t('referrals.detail.slots', 'Places')}: {offer.slots}
            </span>
            {expiresAt ? <span>{t('referrals.detail.expiresOn', 'Expire le')} {expiresAt}</span> : <span>Expiration non precisee</span>}
            {offer.response_hours_avg ? <span>Repond en ~{offer.response_hours_avg}h</span> : null}
            {offer.response_rate != null ? <span>{Math.round(offer.response_rate)}% de reponses</span> : null}
          </p>
          <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Aucun paiement n&apos;est autorise pour un parrainage. N&apos;acceptez jamais une demande d&apos;argent.
          </div>
          <div className="flex flex-wrap gap-2">
            {isOwner ? (
              <Button asChild className="rounded-xl">
                <Link href="/parrainages/mes-offres">
                  {t('referrals.detail.ownerCta', 'Gerer mes offres et demandes')}
                </Link>
              </Button>
            ) : currentUserId ? (
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/parrainages/mes-demandes">
                  {t('referrals.detail.myRequestsCta', 'Voir mes demandes')}
                </Link>
              </Button>
            ) : (
              <Button asChild className="rounded-xl">
                <Link href={`/login?next=/parrainages/${offer.id}`}>
                  {t('referrals.detail.goToLogin', 'Aller a la connexion')}
                </Link>
              </Button>
            )}
            {canApply ? (
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="#apply-form">{t('referrals.detail.applyNow', 'Postuler maintenant')}</Link>
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Explorer aussi:
            {' '}
            <Link className="text-primary hover:underline" href={`/parrainages/entreprise/${slugify(offer.company_name)}`}>
              offres de {offer.company_name}
            </Link>
            {offer.city ? (
              <>
                {' '}•{' '}
                <Link className="text-primary hover:underline" href={`/parrainages/ville/${slugify(offer.city)}`}>
                  parrainages a {offer.city}
                </Link>
              </>
            ) : null}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="rounded-2xl lg:col-span-2">
          <CardContent className="pt-6 space-y-5">
            <div>
              <h2 className="font-semibold mb-2">{t('referrals.detail.description', 'Description')}</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{safeDescription}</p>
            </div>
            {offer.requirements && (
              <div>
                <h2 className="font-semibold mb-2">{t('referrals.detail.requirements', 'Exigences')}</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{offer.requirements}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <InternalAdsSlot placement="referrals_detail_sidebar" limit={1} />

          {!currentUserId && (
            <Card className="rounded-2xl">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                {t('referrals.detail.loginPrompt', 'Connectez-vous pour demander un parrainage.')}
                <div className="mt-3">
                  <Link href={`/login?next=/parrainages/${offer.id}`} className="text-primary hover:underline">
                    {t('referrals.detail.goToLogin', 'Aller a la connexion')}
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {isOwner ? (
            <Card className="rounded-2xl">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                {t('referrals.detail.ownerNote', 'Vous etes le proprietaire de cette offre. Les demandes recues seront visibles dans votre espace utilisateur.')}
                <div className="mt-3">
                  <Link href="/parrainages/mes-offres" className="text-primary hover:underline">
                    {t('referrals.detail.ownerCta', 'Gerer mes offres et demandes')}
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {!!currentUserId && !isOwner && offer.status !== 'active' ? (
            <Card className="rounded-2xl">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                {t('referrals.detail.offerUnavailable', "Cette offre n'est plus active. Consultez d'autres opportunites ou suivez vos demandes existantes.")}
                <div className="mt-3">
                  <Link href="/parrainages/mes-demandes" className="text-primary hover:underline">
                    {t('referrals.detail.myRequestsCta', 'Voir mes demandes')}
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <SafetyActions
            offerId={offer.id}
            ownerId={offer.user_id}
            isOwner={isOwner}
            isAuthenticated={!!currentUserId}
          />

          {canApply && (
            <div id="apply-form">
              <RequestReferralForm offerId={offer.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
