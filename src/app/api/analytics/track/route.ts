import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

type AnalyticsTrackRequest =
  | {
      type: 'analytics_event';
      payload: {
        event: string;
        user_id?: string;
        business_id?: string;
        session_id: string;
        timestamp: string;
        properties?: Record<string, unknown>;
        metadata?: Record<string, unknown>;
      };
    }
  | {
      type: 'carousel_event';
      payload: {
        collection_id: string;
        event_type: 'click' | 'impression';
        user_id?: string | null;
        session_id: string;
        metadata?: Record<string, unknown>;
      };
    };

export async function POST(request: Request) {
  let body: AnalyticsTrackRequest | null = null;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body || !('type' in body) || !('payload' in body)) {
    return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const supabase = await createServiceClient();

    if (body.type === 'analytics_event') {
      const { error } = await supabase.from('analytics_events').insert(body.payload);
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    if (body.type === 'carousel_event') {
      const { error } = await supabase.from('carousel_analytics').insert(body.payload);
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: 'Unsupported event type' }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, error: 'Tracking unavailable' }, { status: 500 });
  }
}
