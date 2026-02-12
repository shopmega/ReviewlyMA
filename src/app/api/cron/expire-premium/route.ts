import { NextRequest, NextResponse } from 'next/server';
import { handleExpiredPremiumAccounts } from '@/app/actions/handle-expired-premium';

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

  const token = getBearerToken(req) || undefined;
  const result = await handleExpiredPremiumAccounts(token);

  if (result.status === 'error') {
    return NextResponse.json({ ok: false, ...result }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...result }, { status: 200 });
}

