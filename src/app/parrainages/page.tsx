import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ArrowRight, Clock3, MapPin, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { getServerTranslator } from '@/lib/i18n/server';
import { slugify } from '@/lib/utils';

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

type SearchParams = { [key: string]: string | string[] | undefined };

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Parrainages emploi au Maroc | Reviewly MA',
    description:
      'Parcourez des offres de parrainage interne au Maroc. Filtres, signaux de confiance et demandes securisees sur Reviewly MA.',
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

  let query = supabase
    .from('job_referral_offers')
    .select(
      'id, company_name, job_title, city, contract_type, work_mode, seniority, slots, created_at, expires_at, identity_level, verification_status, trust_score, response_rate, response_hours_avg',
      { count: 'exact' }
    )
    .eq('status', 'active');

  if (search) {
    const cleaned = search.replace(/[%_]/g, '');
    query = query.or(`company_name.ilike.%${cleaned}%,job_title.ilike.%${cleaned}%`);
  }
  if (city) query = query.ilike('city', city);
  if (contract) query = query.eq('contract_type', contract);
  if (mode) query = query.eq('work_mode', mode);
  if (seniority) query = query.eq('seniority', seniority);

  switch (sort) {
    case 'expiring':
      query = query.order('expires_at', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
      break;
    case 'spots':
      query = query.order('slots', { ascending: false }).order('created_at', { ascending: false });
      break;
    case 'responsive':
      query = query.order('response_hours_avg', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
      break;
    case 'trust':
      query = query.order('trust_score', { ascending: false }).order('response_rate', { ascending: false });
      break;
    default:
      query = query.order('created_at', { ascending: false });
      break;
  }

  let { data: offers, error, count } = await query.limit(60);

  // Backward-compatible fallback if newer trust fields are not migrated yet.
  if (error && (error.message.includes('identity_level') || error.message.includes('verification_status'))) {
    const fallback = await supabase
      .from('job_referral_offers')
      .select('id, company_name, job_title, city, contract_type, work_mode, seniority, slots, created_at, expires_at', { count: 'exact' })
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(60);

    offers = (fallback.data || []).map((row: any) => ({
      ...row,
      identity_level: 'anonymous',
      verification_status: 'unverified',
      trust_score: null,
      response_rate: null,
      response_hours_avg: null,
    }));
    count = fallback.count;
    error = fallback.error;
  }

  const items = (offers || []) as ReferralOffer[];

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-8">
      <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-emerald-50 via-background to-sky-50 p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <Badge variant="outline" className="w-fit">{t('referrals.list.badge', 'Referral marketplace')}</Badge>
            <h1 className="text-3xl md:text-4xl font-bold font-headline">{t('referrals.list.title', 'Parrainages emploi')}</h1>
            <p className="text-muted-foreground max-w-2xl">
              {t('referrals.list.subtitle', 'Des employes partagent des opportunites de recommandation interne. Parcourez les offres actives et envoyez une demande en quelques minutes.')}
            </p>
            <div className="inline-flex items-center gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <AlertTriangle className="h-4 w-4" />
              Aucun paiement n&apos;est autorise pour un parrainage. Signalez toute tentative.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentUserId ? (
              <>
                <Button asChild variant="outline" className="rounded-xl">
                  <Link href="/parrainages/mes-offres">{t('referrals.list.myOffers', 'Mes offres')}</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl">
                  <Link href="/parrainages/mes-demandes">{t('referrals.list.myRequests', 'Mes demandes')}</Link>
                </Button>
              </>
            ) : null}
            <Button asChild className="rounded-xl">
              <Link href="/parrainages/new">{t('referrals.list.publish', 'Publier une offre')}</Link>
            </Button>
          </div>
        </div>
      </section>

      <Card className="rounded-2xl border-border/60">
        <CardContent className="pt-6 space-y-4">
          <form method="get" className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Entreprise ou poste"
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
              <Button type="submit" className="rounded-xl">Filtrer</Button>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/parrainages">Reinitialiser</Link>
              </Button>
              <span className="text-xs text-muted-foreground">
                {count ?? items.length} resultat(s) • tri: {getSortLabel(sort)}
              </span>
            </div>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <Card className="rounded-2xl">
          <CardContent className="py-10 text-center text-muted-foreground">
            Impossible de charger les offres pour le moment. Veuillez reessayer.
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-12 text-center space-y-3">
            <p className="text-muted-foreground">{t('referrals.list.empty', 'Aucune offre active pour le moment.')}</p>
            <div className="flex justify-center gap-2">
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/parrainages/new">Publier la premiere offre</Link>
              </Button>
              <Button asChild className="rounded-xl">
                <Link href={currentUserId ? '/parrainages/mes-demandes' : '/signup'}>Creer une alerte</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map((offer) => {
            const expiresAt = offer.expires_at ? new Date(offer.expires_at).toLocaleDateString(locale) : null;
            const responseLabel = offer.response_hours_avg ? `Repond en ~${offer.response_hours_avg}h` : 'Reactivite en cours';
            return (
              <Card key={offer.id} className="rounded-2xl border-border/60 hover:border-primary/30 transition-colors">
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
                    {offer.city && (
                      <Badge variant="secondary" className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <Link href={`/parrainages/ville/${slugify(offer.city)}`}>{offer.city}</Link>
                      </Badge>
                    )}
                    {formatContractType(offer.contract_type) && <Badge variant="secondary">{formatContractType(offer.contract_type)}</Badge>}
                    {formatWorkMode(offer.work_mode) && <Badge variant="secondary">{formatWorkMode(offer.work_mode)}</Badge>}
                    {formatSeniority(offer.seniority) && <Badge variant="secondary">{formatSeniority(offer.seniority)}</Badge>}
                    <Badge variant="secondary">
                      <Link href={`/parrainages/poste/${slugify(offer.job_title)}`}>Poste similaire</Link>
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p className="inline-flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {t('referrals.list.slots', 'Places disponibles')}: {offer.slots}
                    </p>
                    <p className="inline-flex items-center gap-1">
                      <ShieldCheck className="h-4 w-4" />
                      {getTrustLabel(offer)}{offer.trust_score != null ? ` • Score ${offer.trust_score}/100` : ''}
                    </p>
                    <p className="inline-flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      {responseLabel}{offer.response_rate != null ? ` • ${Math.round(offer.response_rate)}% de reponses` : ''}
                    </p>
                    <p>{expiresAt ? `Expire le ${expiresAt}` : 'Expiration non precisee'}</p>
                  </div>

                  <Button asChild variant="outline" className="w-full rounded-xl">
                    <Link href={`/parrainages/${offer.id}`} className="inline-flex items-center justify-center gap-2">
                      {t('referrals.list.viewOffer', "Voir l'offre")}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
