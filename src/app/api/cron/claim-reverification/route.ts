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

  const { data: overdueClaims, error: overdueError } = await service
    .from('business_claims')
    .select('id')
    .eq('claim_state', 'verified')
    .not('next_reverification_at', 'is', null)
    .lte('next_reverification_at', nowIso)
    .limit(1000);

  if (overdueError) {
    return NextResponse.json({ ok: false, error: overdueError.message }, { status: 500 });
  }

  let suspended = 0;
  let transitionErrors = 0;

  for (const claim of overdueClaims || []) {
    const { error: transitionError } = await service.rpc('transition_claim_state', {
      p_claim_id: claim.id,
      p_to_state: 'suspended',
      p_reason_code: 'reverification_overdue',
      p_note: 'Automatic suspension: reverification overdue',
    });

    if (transitionError) {
      transitionErrors += 1;
      continue;
    }
    suspended += 1;
  }

  const { data: expiredEvidence, error: expiredEvidenceError } = await service
    .from('claim_verification_evidence')
    .update({ status: 'expired' })
    .lte('expires_at', nowIso)
    .in('status', ['pending', 'verified'])
    .select('id');

  if (expiredEvidenceError) {
    return NextResponse.json({ ok: false, error: expiredEvidenceError.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      overdueClaimsFound: (overdueClaims || []).length,
      suspended,
      transitionErrors,
      evidenceExpired: (expiredEvidence || []).length,
    },
    { status: 200 }
  );
}
