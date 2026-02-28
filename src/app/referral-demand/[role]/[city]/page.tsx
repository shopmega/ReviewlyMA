import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, MapPin, Sparkles, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getServerSiteUrl } from '@/lib/site-config';
import { slugify } from '@/lib/utils';
import { MIN_INDEXABLE_REFERRAL_DEMAND_ROLE_CITY_LISTINGS } from '@/lib/seo-ia';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Params = {
  role: string;
  city: string;
};

type DemandListing = {
  id: string;
  title: string;
  target_role: string;
  city: string | null;
  summary: string;
  work_mode: string | null;
  seniority: string | null;
  created_at: string;
  expires_at: string | null;
};

const MAX_FETCH = 1200;

const displayFromSlug = (value: string) =>
  value
    .split('-')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');

function isNotExpired(expiresAt: string | null) {
  if (!expiresAt) return true;
  const ts = Date.parse(expiresAt);
  if (Number.isNaN(ts)) return true;
  return ts > Date.now();
}

function getRoleCityListings(rows: DemandListing[], roleSlug: string, citySlug: string) {
  return rows.filter((item) => {
    if (!isNotExpired(item.expires_at)) return false;
    return slugify(item.target_role) === roleSlug && slugify(item.city || '') === citySlug;
  });
}

async function fetchDemandRoleCityRows(roleSlug: string, citySlug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('job_referral_demand_listings')
    .select('id, title, target_role, city, summary, work_mode, seniority, created_at, expires_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(MAX_FETCH);

  const rows = (data || []) as DemandListing[];
  return getRoleCityListings(rows, roleSlug, citySlug);
}

function getThirtyDayTrend(rows: DemandListing[]) {
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const currentStart = now - thirtyDaysMs;
  const previousStart = now - thirtyDaysMs * 2;

  let current = 0;
  let previous = 0;
  for (const row of rows) {
    const ts = Date.parse(row.created_at);
    if (Number.isNaN(ts)) continue;
    if (ts >= currentStart) {
      current += 1;
      continue;
    }
    if (ts >= previousStart && ts < currentStart) {
      previous += 1;
    }
  }

  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { role, city } = await params;
  const roleLabel = displayFromSlug(role);
  const cityLabel = displayFromSlug(city);
  const listings = await fetchDemandRoleCityRows(role, city);
  const isIndexable = listings.length >= MIN_INDEXABLE_REFERRAL_DEMAND_ROLE_CITY_LISTINGS;
  const siteUrl = getServerSiteUrl();
  const canonical = `${siteUrl}/referral-demand/${role}/${city}`;

  return {
    title: `${roleLabel} referral demand in ${cityLabel} | Reviewly MA`,
    description: `Live referral demand signals for ${roleLabel} in ${cityLabel}, including active listings and recent trend.`,
    alternates: { canonical },
    robots: {
      index: isIndexable,
      follow: true,
    },
  };
}

export default async function ReferralDemandRoleCityPage({ params }: { params: Promise<Params> }) {
  const { role, city } = await params;
  const roleLabel = displayFromSlug(role);
  const cityLabel = displayFromSlug(city);

  const listings = await fetchDemandRoleCityRows(role, city);
  if (listings.length === 0) {
    notFound();
  }

  const trend = getThirtyDayTrend(listings);
  const isIndexable = listings.length >= MIN_INDEXABLE_REFERRAL_DEMAND_ROLE_CITY_LISTINGS;
  const topWorkMode = listings
    .map((item) => item.work_mode)
    .find((value) => value && value.trim().length > 0);
  const topSeniority = listings
    .map((item) => item.seniority)
    .find((value) => value && value.trim().length > 0);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-4">
        <Badge variant="outline" className="w-fit">Referral Demand Page</Badge>
        <h1 className="text-3xl md:text-4xl font-bold font-headline">
          {roleLabel} referral demand in {cityLabel}
        </h1>
        <p className="text-muted-foreground max-w-3xl">
          {listings.length} active listing(s) currently match this role/city segment.
        </p>
        {!isIndexable && (
          <p className="text-xs text-muted-foreground">
            This page is currently set to noindex until it reaches {MIN_INDEXABLE_REFERRAL_DEMAND_ROLE_CITY_LISTINGS} active
            listings.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/referral-demand">Back to dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/parrainages/demandes">Browse all demand listings</Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active demand</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{listings.length}</CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              30-day momentum
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{trend}%</CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              Common profile
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>Work mode: {topWorkMode || 'N/A'}</p>
            <p>Seniority: {topSeniority || 'N/A'}</p>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Latest matching demand listings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {listings.slice(0, 20).map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-lg border border-border px-4 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {item.city || cityLabel} | {new Date(item.created_at).toLocaleDateString('fr-MA')}
                </p>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>
              </div>
              <Button asChild variant="outline" className="w-fit">
                <Link href={`/parrainages/demandes/${item.id}`} className="inline-flex items-center gap-2">
                  View listing
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
