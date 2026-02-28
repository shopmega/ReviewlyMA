import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BarChart3, Building2, MapPin, TrendingUp, Users2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getServerSiteUrl } from '@/lib/site-config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InternalAdsSlot } from '@/components/shared/InternalAdsSlot';

type DemandListingSnapshot = {
  id: string;
  title: string;
  target_role: string;
  city: string | null;
  work_mode: string | null;
  seniority: string | null;
  created_at: string;
  expires_at: string | null;
};

const WINDOW_DAYS = 30;
const FETCH_LIMIT = 800;

function toDisplayValue(value: string | null | undefined, fallback: string) {
  const cleaned = value?.trim();
  return cleaned && cleaned.length > 0 ? cleaned : fallback;
}

function topBuckets(values: string[], limit = 6) {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function getMonthWindowStats(createdAtValues: string[]) {
  const now = Date.now();
  const windowMs = WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const currentStart = now - windowMs;
  const previousStart = now - windowMs * 2;

  let current = 0;
  let previous = 0;

  for (const value of createdAtValues) {
    const ts = Date.parse(value);
    if (Number.isNaN(ts)) continue;
    if (ts >= currentStart) {
      current += 1;
      continue;
    }
    if (ts >= previousStart && ts < currentStart) {
      previous += 1;
    }
  }

  const pctChange = previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100);
  return { current, previous, pctChange };
}

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getServerSiteUrl();
  return {
    title: 'Referral Demand Dashboard | Reviewly MA',
    description:
      'Live referral demand dashboard with active listings, top roles, top cities, and 30-day trend signals.',
    alternates: {
      canonical: `${siteUrl}/referral-demand`,
    },
  };
}

export default async function ReferralDemandDashboardPage() {
  const supabase = await createClient();
  const refreshedAt = new Date();

  const { data } = await supabase
    .from('job_referral_demand_listings')
    .select('id, title, target_role, city, work_mode, seniority, created_at, expires_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(FETCH_LIMIT);

  const now = Date.now();
  const activeListings = ((data || []) as DemandListingSnapshot[]).filter((item) => {
    if (!item.expires_at) return true;
    const expiresAt = Date.parse(item.expires_at);
    if (Number.isNaN(expiresAt)) return true;
    return expiresAt > now;
  });

  const topRoles = topBuckets(activeListings.map((item) => toDisplayValue(item.target_role, 'Role non specifie')), 8);
  const topCities = topBuckets(activeListings.map((item) => toDisplayValue(item.city, 'Ville non specifiee')), 8);
  const topWorkModes = topBuckets(activeListings.map((item) => toDisplayValue(item.work_mode, 'Mode non specifie')), 3);
  const trend = getMonthWindowStats(activeListings.map((item) => item.created_at));
  const latest = activeListings.slice(0, 10);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-4">
        <Badge variant="outline" className="w-fit">Referral Demand Intelligence</Badge>
        <h1 className="text-3xl md:text-4xl font-bold font-headline">Live referral demand dashboard</h1>
        <p className="text-muted-foreground max-w-3xl">
          Hub data pour la nouvelle architecture SEO. Cette page centralise la demande active, les tendances et les points
          d&apos;entree vers les pages cluster.
        </p>
        <p className="text-xs text-muted-foreground">
          Last refreshed: {refreshedAt.toLocaleString('fr-MA')}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="rounded-xl">
            <Link href="/parrainages/demandes">Voir le demand board</Link>
          </Button>
          <Button asChild variant="secondary" className="rounded-xl">
            <Link href="/referral-demand/roles">Top roles</Link>
          </Button>
          <Button asChild variant="secondary" className="rounded-xl">
            <Link href="/referral-demand/cities">Top cities</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/parrainages/demandes/new">Publier une demande</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/parrainages">Voir les offres de parrainage</Link>
          </Button>
        </div>
      </section>

      <InternalAdsSlot placement="referrals_top_banner" />

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground inline-flex items-center gap-2">
              <Users2 className="h-4 w-4" />
              Active listings
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{activeListings.length}</CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground inline-flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Last {WINDOW_DAYS} days
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{trend.current}</CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground inline-flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Change vs previous
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{trend.pctChange}%</CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground inline-flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Top work mode
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {topWorkModes[0] ? `${topWorkModes[0].label} (${topWorkModes[0].count})` : 'N/A'}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Top roles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune donnee disponible.</p>
            ) : (
              topRoles.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="text-sm">{item.label}</span>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Top cities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune donnee disponible.</p>
            ) : (
              topCities.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="inline-flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {item.label}
                  </span>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Latest demand listings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {latest.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune demande active actuellement.</p>
          ) : (
            latest.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {toDisplayValue(item.target_role, 'Role non specifie')} | {toDisplayValue(item.city, 'Ville non specifiee')} |
                    {' '}Publiee le {new Date(item.created_at).toLocaleDateString('fr-MA')}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="w-fit rounded-lg">
                  <Link href={`/parrainages/demandes/${item.id}`} className="inline-flex items-center gap-2">
                    Voir la demande
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Cluster links</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/salary">Salary intelligence</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/companies">Company insights</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/blog">Execution playbooks</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/reports">Monthly reports</Link>
          </Button>
        </CardContent>
      </Card>

      <InternalAdsSlot placement="referrals_inline" />
    </div>
  );
}
