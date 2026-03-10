import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ArrowRight, Clock3, MapPin, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { getServerTranslator } from '@/lib/i18n/server';
import { slugify } from '@/lib/utils';
import { InternalAdsSlot } from '@/components/shared/InternalAdsSlot';
import { SoftAuthTriggerButton } from '@/components/auth/SoftAuthTriggerButton';

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
  expires_at: string | null;
  identity_level: string | null;
  verification_status: string | null;
  trust_score: number | null;
  response_rate: number | null;
  response_hours_avg: number | null;
};

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

type MarketKind = 'all' | 'offers' | 'demands';

type MarketItem =
  | { itemType: 'offer'; created_at: string; data: ReferralOffer }
  | { itemType: 'demand'; created_at: string; data: DemandListing };

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Parrainages emploi au Maroc | Reviewly MA',
    description:
      'Marketplace unifiee offres + demandes de parrainage au Maroc. Filtres, signaux de confiance et echanges securises sur Reviewly MA.',
    alternates: {
      canonical: '/parrainages',
    },
  };
}

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

const getParam = (params: SearchParams, key: string) => {
  const value = params[key];
  if (typeof value !== 'string') return '';
  return value.trim();
};

const normalizeKind = (value: string): MarketKind => {
  if (value === 'offers' || value === 'demands') return value;
  return 'all';
};

const getTrustLabel = (offer: ReferralOffer) => {
  if (offer.identity_level === 'verified_employee' || offer.verification_status === 'verified') return 'Employe verifie';
  if (offer.identity_level === 'public') return 'Identite publique';
  return 'Identite masquee';
};

const getSortLabel = (sort: string) => {
  switch (sort) {
    case 'trust':
      return 'Confiance';
    case 'spots':
      return 'Places';
    case 'responsive':
      return 'Reactivite';
    case 'expiring':
      return 'Expiration proche';
    default:
      return 'Plus recentes';
  }
};

const buildMarketHref = ({
  kind,
  search,
  city,
  contract,
  mode,
  seniority,
  sort,
}: {
  kind: MarketKind;
  search: string;
  city: string;
  contract: string;
  mode: string;
  seniority: string;
  sort: string;
}) => {
  const query = new URLSearchParams();
  if (search) query.set('search', search);
  if (city) query.set('city', city);
  if (contract) query.set('contract', contract);
  if (mode) query.set('mode', mode);
  if (seniority) query.set('seniority', seniority);
  if (sort && sort !== 'newest') query.set('sort', sort);
  if (kind !== 'all') query.set('kind', kind);
  const qs = query.toString();
  return qs ? `/parrainages?${qs}` : '/parrainages';
};

export default async function ParrainagesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { t, locale } = await getServerTranslator();
  const params = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const currentUserId = auth.user?.id ?? null;

  const search = getParam(params, 'search');
  const city = getParam(params, 'city');
  const contract = getParam(params, 'contract');
  const mode = getParam(params, 'mode');
  const seniority = getParam(params, 'seniority');
  const sort = getParam(params, 'sort') || 'newest';
  const kind = normalizeKind(getParam(params, 'kind'));

  const showOffers = kind !== 'demands';
  const showDemands = kind !== 'offers';

  let offers: ReferralOffer[] = [];
  let demands: DemandListing[] = [];
  let offersCount = 0;
  let demandsCount = 0;
  const loadErrors: string[] = [];

  if (showOffers) {
    let offerQuery = supabase
      .from('job_referral_offers')
      .select(
        'id, company_name, job_title, city, contract_type, work_mode, seniority, slots, created_at, expires_at, identity_level, verification_status, trust_score, response_rate, response_hours_avg',
        { count: 'exact' }
      )
      .eq('status', 'active');

    if (search) {
      const cleaned = search.replace(/[%_]/g, '');
      offerQuery = offerQuery.or(`company_name.ilike.%${cleaned}%,job_title.ilike.%${cleaned}%`);
    }
    if (city) offerQuery = offerQuery.ilike('city', city);
    if (contract) offerQuery = offerQuery.eq('contract_type', contract);
    if (mode) offerQuery = offerQuery.eq('work_mode', mode);
    if (seniority) offerQuery = offerQuery.eq('seniority', seniority);

    switch (sort) {
      case 'expiring':
        offerQuery = offerQuery.order('expires_at', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
        break;
      case 'spots':
        offerQuery = offerQuery.order('slots', { ascending: false }).order('created_at', { ascending: false });
        break;
      case 'responsive':
        offerQuery = offerQuery.order('response_hours_avg', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
        break;
      case 'trust':
        offerQuery = offerQuery.order('trust_score', { ascending: false }).order('response_rate', { ascending: false });
        break;
      default:
        offerQuery = offerQuery.order('created_at', { ascending: false });
        break;
    }

    let { data: offerRows, error: offerError, count } = await offerQuery.limit(60);

    if (offerError && (offerError.message.includes('identity_level') || offerError.message.includes('verification_status'))) {
      const fallback = await supabase
        .from('job_referral_offers')
        .select('id, company_name, job_title, city, contract_type, work_mode, seniority, slots, created_at, expires_at', { count: 'exact' })
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(60);

      offerRows = (fallback.data || []).map((row: any) => ({
        ...row,
        identity_level: 'anonymous',
        verification_status: 'unverified',
        trust_score: null,
        response_rate: null,
        response_hours_avg: null,
      }));
      count = fallback.count;
      offerError = fallback.error;
    }

    if (offerError) {
      loadErrors.push('Impossible de charger les offres pour le moment.');
    } else {
      offers = (offerRows || []) as ReferralOffer[];
      offersCount = count || 0;
    }
  }

  if (showDemands) {
    let demandQuery = supabase
      .from('job_referral_demand_listings')
      .select('id, title, target_role, city, contract_type, work_mode, seniority, summary, created_at', { count: 'exact' })
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (search) {
      const cleaned = search.replace(/[%_]/g, '');
      demandQuery = demandQuery.or(`title.ilike.%${cleaned}%,target_role.ilike.%${cleaned}%,summary.ilike.%${cleaned}%`);
    }
    if (city) demandQuery = demandQuery.ilike('city', city);
    if (contract) demandQuery = demandQuery.eq('contract_type', contract);
    if (mode) demandQuery = demandQuery.eq('work_mode', mode);
    if (seniority) demandQuery = demandQuery.eq('seniority', seniority);

    const { data: demandRows, error: demandError, count } = await demandQuery.limit(60);

    if (demandError) {
      loadErrors.push('Impossible de charger les demandes publiques pour le moment.');
    } else {
      demands = (demandRows || []) as DemandListing[];
      demandsCount = count || 0;
    }
  }

  const marketItems: MarketItem[] = [
    ...offers.map((item) => ({ itemType: 'offer' as const, created_at: item.created_at, data: item })),
    ...demands.map((item) => ({ itemType: 'demand' as const, created_at: item.created_at, data: item })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const totalCount = (showOffers ? offersCount : 0) + (showDemands ? demandsCount : 0);

  const allHref = buildMarketHref({ kind: 'all', search, city, contract, mode, seniority, sort });
  const offersHref = buildMarketHref({ kind: 'offers', search, city, contract, mode, seniority, sort });
  const demandsHref = buildMarketHref({ kind: 'demands', search, city, contract, mode, seniority, sort });

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <Badge variant="outline" className="w-fit">{t('referrals.list.badge', 'Referral marketplace')}</Badge>
            <h1 className="text-3xl md:text-4xl font-bold font-headline">{t('referrals.list.title', 'Parrainages emploi')}</h1>
            <p className="text-muted-foreground max-w-2xl">
              Marketplace unifiee: offres internes des employes + demandes publiques de candidats.
            </p>
            <div className="inline-flex items-center gap-2 rounded-md border border-warning/20 bg-warning/10 px-3 py-2 text-xs text-warning">
              <AlertTriangle className="h-4 w-4" />
              Aucun paiement n&apos;est autorise pour un parrainage. Signalez toute tentative.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentUserId ? (
              <>
                <Button asChild variant="outline" className="rounded-xl">
                  <Link href="/parrainages/inbox">Inbox</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl">
                  <Link href="/parrainages/mes-offres">{t('referrals.list.myOffers', 'Mes offres')}</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl">
                  <Link href="/parrainages/mes-demandes">{t('referrals.list.myRequests', 'Mes demandes')}</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl">
                  <Link href="/parrainages/mes-demandes-publiques">Mes demandes publiques</Link>
                </Button>
              </>
            ) : null}
            {currentUserId ? (
              <Button asChild className="rounded-xl">
                <Link href="/parrainages/new?type=offer">{t('referrals.list.publish', 'Publier une offre')}</Link>
              </Button>
            ) : (
              <SoftAuthTriggerButton
                label={t('referrals.list.publish', 'Publier une offre')}
                nextPath="/parrainages/new?type=offer"
                intent="referral_publish"
                className="rounded-xl"
                title="Publiez une offre de parrainage"
                description="Connectez-vous pour publier une offre et gerer les demandes en toute securite."
              />
            )}
          </div>
        </div>
      </section>

      <InternalAdsSlot placement="referrals_top_banner" />

      <Card className="rounded-2xl border-border bg-card">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button asChild variant={kind === 'all' ? 'default' : 'outline'} className="rounded-xl">
              <Link href={allHref}>Tous ({totalCount || marketItems.length})</Link>
            </Button>
            <Button asChild variant={kind === 'offers' ? 'default' : 'outline'} className="rounded-xl">
              <Link href={offersHref}>Offres ({offersCount})</Link>
            </Button>
            <Button asChild variant={kind === 'demands' ? 'default' : 'outline'} className="rounded-xl">
              <Link href={demandsHref}>Demandes ({demandsCount})</Link>
            </Button>
          </div>

          <form method="get" className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <input type="hidden" name="kind" value={kind} />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder={kind === 'demands' ? 'Poste, mots-cles...' : 'Entreprise ou poste'}
              className="h-10 rounded-md border bg-background px-3 text-sm md:col-span-2"
            />
            <input
              type="text"
              name="city"
              defaultValue={city}
              placeholder="Ville"
              className="h-10 rounded-md border bg-background px-3 text-sm"
            />
            <select name="contract" defaultValue={contract} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">Contrat</option>
              <option value="cdi">CDI</option>
              <option value="cdd">CDD</option>
              <option value="stage">Stage</option>
              <option value="freelance">Freelance</option>
              <option value="alternance">Alternance</option>
            </select>
            <select name="mode" defaultValue={mode} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">Mode</option>
              <option value="onsite">Presentiel</option>
              <option value="hybrid">Hybride</option>
              <option value="remote">Remote</option>
            </select>
            <select name="sort" defaultValue={sort} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="newest">Plus recentes</option>
              <option value="expiring">Expiration proche</option>
              <option value="responsive">Plus reactives</option>
              <option value="spots">Plus de places</option>
              <option value="trust">Plus fiables</option>
            </select>
            <select name="seniority" defaultValue={seniority} className="h-10 rounded-md border bg-background px-3 text-sm md:col-span-2">
              <option value="">Niveau</option>
              <option value="junior">Junior</option>
              <option value="confirme">Confirme</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead</option>
              <option value="manager">Manager</option>
            </select>
            <div className="md:col-span-4 flex flex-wrap items-center gap-2">
              <Button type="submit" className="rounded-md">Filtrer</Button>
              <Button asChild variant="outline" className="rounded-md">
                <Link href="/parrainages">Reinitialiser</Link>
              </Button>
              <span className="text-xs text-muted-foreground">
                {totalCount || marketItems.length} resultat(s) - tri: {getSortLabel(sort)}
              </span>
            </div>
          </form>
        </CardContent>
      </Card>

      {loadErrors.length > 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-4 text-sm text-amber-700 space-y-1">
            {loadErrors.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {marketItems.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-12 text-center space-y-3">
            <p className="text-muted-foreground">
              {kind === 'demands'
                ? 'Aucune demande active pour le moment.'
                : kind === 'offers'
                  ? t('referrals.list.empty', 'Aucune offre active pour le moment.')
                  : 'Aucune offre ou demande active pour le moment.'}
            </p>
            <div className="flex justify-center gap-2">
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/parrainages/new?type=offer">Publier une offre</Link>
              </Button>
              <Button asChild className="rounded-xl">
                <Link href={currentUserId ? '/parrainages/new?type=demand' : '/signup'}>Publier une demande</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {marketItems.map((item) => {
            if (item.itemType === 'offer') {
              const offer = item.data;
              const expiresAt = offer.expires_at ? new Date(offer.expires_at).toLocaleDateString(locale) : null;
              const responseLabel = offer.response_hours_avg ? `Repond en ~${offer.response_hours_avg}h` : 'Reactivite en cours';

              return (
                <Card key={`offer-${offer.id}`} className="rounded-2xl border-border bg-card transition-colors hover:border-primary/30">
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="outline">
                        <Link href={`/parrainages/entreprise/${slugify(offer.company_name)}`}>{offer.company_name}</Link>
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5" />
                        {new Date(offer.created_at).toLocaleDateString(locale)}
                      </span>
                    </div>
                    <CardTitle className="text-xl">{offer.job_title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="secondary">Offre</Badge>
                      {offer.city ? (
                        <Badge variant="secondary" className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <Link href={`/parrainages/ville/${slugify(offer.city)}`}>{offer.city}</Link>
                        </Badge>
                      ) : null}
                      {formatContractType(offer.contract_type) ? <Badge variant="secondary">{formatContractType(offer.contract_type)}</Badge> : null}
                      {formatWorkMode(offer.work_mode) ? <Badge variant="secondary">{formatWorkMode(offer.work_mode)}</Badge> : null}
                      {formatSeniority(offer.seniority) ? <Badge variant="secondary">{formatSeniority(offer.seniority)}</Badge> : null}
                    </div>

                    <div className="space-y-2 text-xs text-muted-foreground">
                      <p className="inline-flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {t('referrals.list.slots', 'Places disponibles')}: {offer.slots}
                      </p>
                      <p className="inline-flex items-center gap-1">
                        <ShieldCheck className="h-4 w-4" />
                        {getTrustLabel(offer)}{offer.trust_score != null ? ` - Score ${offer.trust_score}/100` : ''}
                      </p>
                      <p className="inline-flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        {responseLabel}{offer.response_rate != null ? ` - ${Math.round(offer.response_rate)}% de reponses` : ''}
                      </p>
                      <p>{expiresAt ? `Expire le ${expiresAt}` : 'Expiration non precisee'}</p>
                    </div>

                    <Button asChild variant="outline" className="w-full rounded-md">
                      <Link href={`/parrainages/${offer.id}`} className="inline-flex items-center justify-center gap-2">
                        {t('referrals.list.viewOffer', "Voir l'offre")}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            }

            const demand = item.data;
            return (
              <Card key={`demand-${demand.id}`} className="rounded-2xl border-border bg-card transition-colors hover:border-primary/30">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="outline">Demande</Badge>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" />
                      {new Date(demand.created_at).toLocaleDateString(locale)}
                    </span>
                  </div>
                  <CardTitle className="text-xl">{demand.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">{demand.target_role}</Badge>
                    {demand.city ? (
                      <Badge variant="secondary" className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {demand.city}
                      </Badge>
                    ) : null}
                    {formatContractType(demand.contract_type) ? <Badge variant="secondary">{formatContractType(demand.contract_type)}</Badge> : null}
                    {formatWorkMode(demand.work_mode) ? <Badge variant="secondary">{formatWorkMode(demand.work_mode)}</Badge> : null}
                    {formatSeniority(demand.seniority) ? <Badge variant="secondary">{formatSeniority(demand.seniority)}</Badge> : null}
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-4">{demand.summary}</p>

                  <div className="grid grid-cols-1 gap-2">
                    <Button asChild variant="outline" className="w-full rounded-md">
                      <Link href={`/parrainages/demandes/${demand.id}`} className="inline-flex items-center justify-center gap-2">
                        Voir la demande
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild className="w-full rounded-md">
                      <Link href={`/parrainages/demandes/${demand.id}#respond-form`}>Proposer un parrainage</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <InternalAdsSlot placement="referrals_inline" />
    </div>
  );
}
