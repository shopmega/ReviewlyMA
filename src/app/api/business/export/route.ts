import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isPaidTier } from '@/lib/tier-utils';
import { rateLimitByEndpoint } from '@/lib/api-rate-limiter';

function toCsvValue(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

function buildCsvFromRows(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return '';
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const headerLine = headers.map((h) => toCsvValue(h)).join(',');
  const lines = rows.map((row) => headers.map((h) => toCsvValue(row[h])).join(','));
  return [headerLine, ...lines].join('\n');
}

async function canAccessBusiness(supabase: any, userId: string, businessId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, business_id, tier')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) return false;
  if (profile.role === 'admin') return true;

  const { data: business } = await supabase
    .from('businesses')
    .select('tier')
    .eq('id', businessId)
    .maybeSingle();

  const hasPro = isPaidTier(profile.tier) || isPaidTier(business?.tier ?? null);
  if (!hasPro) return false;

  if (profile.business_id === businessId) return true;

  const [{ data: claim }, { data: assignment }] = await Promise.all([
    supabase
      .from('business_claims')
      .select('id')
      .eq('user_id', userId)
      .eq('business_id', businessId)
      .or('claim_state.eq.verified,status.eq.approved')
      .maybeSingle(),
    supabase
      .from('user_businesses')
      .select('id')
      .eq('user_id', userId)
      .eq('business_id', businessId)
      .eq('assignment_status', 'active')
      .maybeSingle(),
  ]);

  return Boolean(claim || assignment);
}

export async function GET(request: NextRequest) {
  return rateLimitByEndpoint.write(request, handler);
}

async function handler(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const businessId = request.nextUrl.searchParams.get('businessId');
  const format = request.nextUrl.searchParams.get('format') === 'csv' ? 'csv' : 'json';
  if (!businessId) {
    return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
  }

  const allowed = await canAccessBusiness(supabase, user.id, businessId);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [businessResult, analyticsResult, reviewsResult, salaryResult, referralResult] = await Promise.all([
    supabase.from('businesses').select('id,name,tier,overall_rating,city,category,updated_at').eq('id', businessId).maybeSingle(),
    supabase.from('business_analytics').select('event_type,created_at').eq('business_id', businessId).order('created_at', { ascending: false }).limit(1500),
    supabase.from('reviews').select('id,rating,date,created_at,owner_reply,status').eq('business_id', businessId).order('created_at', { ascending: false }).limit(800),
    supabase.from('salary_company_metrics').select('median_monthly_salary,min_monthly_salary,max_monthly_salary,pct_above_city_avg,pct_above_sector_avg,submission_count').eq('business_id', businessId).maybeSingle(),
    supabase.from('job_referral_offers').select('id,status,trust_score,response_rate,response_hours_avg,successful_referrals,created_at').eq('business_id', businessId).order('created_at', { ascending: false }).limit(300),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    business: businessResult.data || null,
    analytics_events: analyticsResult.data || [],
    reviews: reviewsResult.data || [],
    salary_metrics: salaryResult.data || null,
    referral_offers: referralResult.data || [],
  };

  if (format === 'json') {
    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="business_export_${businessId}.json"`,
      },
    });
  }

  const csvSections = [
    ['business', buildCsvFromRows(payload.business ? [payload.business as Record<string, unknown>] : [])],
    ['analytics_events', buildCsvFromRows((payload.analytics_events as Array<Record<string, unknown>>))],
    ['reviews', buildCsvFromRows((payload.reviews as Array<Record<string, unknown>>))],
    ['salary_metrics', buildCsvFromRows(payload.salary_metrics ? [payload.salary_metrics as Record<string, unknown>] : [])],
    ['referral_offers', buildCsvFromRows((payload.referral_offers as Array<Record<string, unknown>>))],
  ];

  const csvContent = csvSections
    .map(([title, body]) => `# ${title}\n${body}`)
    .join('\n\n');

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="business_export_${businessId}.csv"`,
    },
  });
}
