import { NextRequest, NextResponse } from 'next/server';
import { isBusinessClaimed } from '@/app/actions/claim';
import { rateLimitByEndpoint } from '@/lib/api-rate-limiter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return rateLimitByEndpoint.read(request, (req) => handler(req, params));
}

async function handler(request: NextRequest, params: Promise<{ id: string }>) {
  try {
    const { id: businessId } = await params;

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    const isClaimed = await isBusinessClaimed(businessId);

    return NextResponse.json({ isClaimed });
  } catch (error) {
    console.error('Error checking business claim status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
