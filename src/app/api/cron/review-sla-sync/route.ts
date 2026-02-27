import { NextRequest, NextResponse } from 'next/server';
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

  const service = await createServiceClient();
  const nowIso = new Date().toISOString();
  const atRiskIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: pendingReports, error: fetchError } = await service
    .from('review_reports')
    .select('id, triage_queue, sla_due_at')
    .eq('status', 'pending')
    .not('sla_due_at', 'is', null)
    .limit(5000);

  if (fetchError) {
    return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
  }

  if (!pendingReports || pendingReports.length === 0) {
    return NextResponse.json({ ok: true, scanned: 0, updated: 0, reason: 'no_pending_reports' }, { status: 200 });
  }

  const buckets = {
    active: [] as string[],
    at_risk: [] as string[],
    breached: [] as string[],
  };

  for (const row of pendingReports) {
    const dueAt = row.sla_due_at as string | null;
    if (!dueAt) continue;

    let targetQueue: 'active' | 'at_risk' | 'breached' = 'active';
    if (dueAt < nowIso) {
      targetQueue = 'breached';
    } else if (dueAt <= atRiskIso) {
      targetQueue = 'at_risk';
    }

    if (row.triage_queue !== targetQueue) {
      buckets[targetQueue].push(row.id as string);
    }
  }

  let updated = 0;
  for (const [queue, ids] of Object.entries(buckets)) {
    if (ids.length === 0) continue;
    const { error: updateError } = await service
      .from('review_reports')
      .update({ triage_queue: queue, updated_at: nowIso })
      .in('id', ids);

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message, queue }, { status: 500 });
    }
    updated += ids.length;
  }

  return NextResponse.json(
    {
      ok: true,
      scanned: pendingReports.length,
      updated,
      breakdown: {
        active: buckets.active.length,
        at_risk: buckets.at_risk.length,
        breached: buckets.breached.length,
      },
    },
    { status: 200 }
  );
}
