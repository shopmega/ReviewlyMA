import { NextRequest, NextResponse } from 'next/server';
import { subDays } from 'date-fns';
import { slugify } from '@/lib/utils';
import { createServiceClient } from '@/lib/supabase/server';

function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const [scheme, token] = auth.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const token = getBearerToken(req);
  return token === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const sinceIso = subDays(new Date(), 7).toISOString();
  const service = await createServiceClient();

  const { data: recentSalaries, error: salaryError } = await service
    .from('salaries')
    .select('business_id, job_title, location, sector_slug, created_at')
    .eq('status', 'published')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (salaryError) {
    return NextResponse.json({ ok: false, error: salaryError.message }, { status: 500 });
  }

  if (!recentSalaries || recentSalaries.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, reason: 'no_recent_salaries' }, { status: 200 });
  }

  const companyKeys = new Set<string>();
  const roleCityKeys = new Set<string>();
  const sectorCityKeys = new Set<string>();

  for (const row of recentSalaries) {
    if (row.business_id) companyKeys.add(row.business_id);
    const citySlug = row.location ? slugify(row.location) : null;
    const roleSlug = row.job_title ? slugify(row.job_title) : null;
    if (roleSlug && citySlug) roleCityKeys.add(`${roleSlug}::${citySlug}`);
    if (row.sector_slug && citySlug) sectorCityKeys.add(`${row.sector_slug}::${citySlug}`);
  }

  const { data: subscriptions, error: subsError } = await service
    .from('salary_alert_subscriptions')
    .select('user_id, scope, business_id, role_slug, sector_slug, city_slug');

  if (subsError) {
    return NextResponse.json({ ok: false, error: subsError.message }, { status: 500 });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, reason: 'no_subscriptions' }, { status: 200 });
  }

  const byUser = new Map<string, { count: number; link: string }>();

  for (const sub of subscriptions) {
    const userId = sub.user_id;
    if (!userId) continue;

    let matched = false;
    let link = '/salaires';
    if (sub.scope === 'company' && sub.business_id) {
      matched = companyKeys.has(sub.business_id);
      link = `/businesses/${sub.business_id}?tab=salaries#salaries`;
    } else if (sub.scope === 'role_city' && sub.role_slug && sub.city_slug) {
      matched = roleCityKeys.has(`${sub.role_slug}::${sub.city_slug}`);
      link = `/salaires/role/${sub.role_slug}/${sub.city_slug}`;
    } else if (sub.scope === 'sector_city' && sub.sector_slug && sub.city_slug) {
      matched = sectorCityKeys.has(`${sub.sector_slug}::${sub.city_slug}`);
      link = `/salaires/secteur/${sub.sector_slug}/${sub.city_slug}`;
    }

    if (!matched) continue;

    const current = byUser.get(userId);
    if (!current) {
      byUser.set(userId, { count: 1, link });
    } else {
      current.count += 1;
      byUser.set(userId, current);
    }
  }

  if (byUser.size === 0) {
    return NextResponse.json({ ok: true, inserted: 0, reason: 'no_matching_subscriptions' }, { status: 200 });
  }

  const userIds = Array.from(byUser.keys());
  const { data: existingDigestRows, error: existingDigestError } = await service
    .from('notifications')
    .select('user_id')
    .eq('type', 'salary_digest_weekly')
    .gte('created_at', sinceIso)
    .in('user_id', userIds);

  if (existingDigestError) {
    return NextResponse.json({ ok: false, error: existingDigestError.message }, { status: 500 });
  }

  const existingUsers = new Set((existingDigestRows || []).map((row: any) => row.user_id).filter(Boolean));

  const payload = userIds
    .filter((userId) => !existingUsers.has(userId))
    .map((userId) => {
      const item = byUser.get(userId)!;
      return {
        user_id: userId,
        title: 'Digest salaires hebdomadaire',
        message: `${item.count} nouvelle(s) mise(s) a jour salary sur vos alertes cette semaine.`,
        type: 'salary_digest_weekly',
        link: item.link,
        is_read: false,
      };
    });

  if (payload.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, reason: 'already_sent_this_week' }, { status: 200 });
  }

  const { error: insertError } = await service.from('notifications').insert(payload);
  if (insertError) {
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, inserted: payload.length, subscriptionsMatched: byUser.size, salariesScanned: recentSalaries.length },
    { status: 200 }
  );
}

