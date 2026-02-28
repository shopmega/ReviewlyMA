import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getServerSiteUrl } from '@/lib/site-config';
import { slugify } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type DemandRow = {
  target_role: string | null;
  city: string | null;
  expires_at: string | null;
};

type CitySummary = {
  city: string;
  count: number;
  topRole: string;
  roleSlug: string;
  citySlug: string;
};

const FETCH_LIMIT = 1500;

function isActiveNotExpired(expiresAt: string | null) {
  if (!expiresAt) return true;
  const ts = Date.parse(expiresAt);
  if (Number.isNaN(ts)) return true;
  return ts > Date.now();
}

function normalize(value: string | null | undefined, fallback: string) {
  const cleaned = value?.trim();
  return cleaned && cleaned.length > 0 ? cleaned : fallback;
}

function buildCitySummaries(rows: DemandRow[]) {
  const byCity = new Map<string, { count: number; roleCounts: Map<string, number> }>();

  for (const row of rows) {
    if (!isActiveNotExpired(row.expires_at)) continue;
    const city = normalize(row.city, 'Ville non specifiee');
    const role = normalize(row.target_role, 'Role non specifie');

    if (!byCity.has(city)) {
      byCity.set(city, { count: 0, roleCounts: new Map<string, number>() });
    }
    const bucket = byCity.get(city)!;
    bucket.count += 1;
    bucket.roleCounts.set(role, (bucket.roleCounts.get(role) || 0) + 1);
  }

  const summaries: CitySummary[] = [];
  for (const [city, bucket] of byCity.entries()) {
    const topRole =
      [...bucket.roleCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Role non specifie';
    summaries.push({
      city,
      count: bucket.count,
      topRole,
      roleSlug: slugify(topRole),
      citySlug: slugify(city),
    });
  }

  return summaries.sort((a, b) => b.count - a.count).slice(0, 120);
}

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getServerSiteUrl();
  return {
    title: 'Top referral demand cities | Reviewly MA',
    description: 'City-level referral demand leaderboard with city-to-role drill-down links.',
    alternates: {
      canonical: `${siteUrl}/referral-demand/cities`,
    },
  };
}

export default async function ReferralDemandCitiesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('job_referral_demand_listings')
    .select('target_role, city, expires_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(FETCH_LIMIT);

  const rows = (data || []) as DemandRow[];
  const summaries = buildCitySummaries(rows);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-4">
        <Badge variant="outline" className="w-fit">Referral Demand Intelligence</Badge>
        <h1 className="text-3xl md:text-4xl font-bold font-headline">Top referral demand cities</h1>
        <p className="text-muted-foreground max-w-3xl">
          City leaderboard generated from active referral demand listings.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/referral-demand">Back to dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/referral-demand/roles">View top roles</Link>
          </Button>
        </div>
      </section>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">City rankings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {summaries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No city data available.</p>
          ) : (
            summaries.map((item) => (
              <div
                key={`${item.citySlug}-${item.roleSlug}`}
                className="flex flex-col gap-2 rounded-lg border border-border px-4 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="inline-flex items-center gap-2 font-medium">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {item.city}
                  </p>
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <BriefcaseBusiness className="h-3.5 w-3.5" />
                    Top role: {item.topRole}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{item.count}</Badge>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/referral-demand/${item.roleSlug}/${item.citySlug}`} className="inline-flex items-center gap-2">
                      Drill down
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
