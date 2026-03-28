import { ImageResponse } from 'next/og';

export const runtime = 'edge';

function clean(value: string | null, fallback: string, max = 44) {
  if (!value) return fallback;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return fallback;
  return normalized.slice(0, max);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = clean(searchParams.get('title'), 'Historical referral demand');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(150deg, #111827 0%, #1F2937 50%, #0B1220 100%)',
          color: '#F8FAFC',
          padding: '56px 64px',
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              backgroundColor: '#94A3B8',
            }}
          />
          <div style={{ fontSize: 28, fontWeight: 700 }}>Referral module retired</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 50, fontWeight: 800, lineHeight: 1.08 }}>{title}</div>
          <div style={{ fontSize: 32, opacity: 0.95 }}>Archived referral-era route</div>
          <div style={{ fontSize: 26, opacity: 0.82 }}>No new demand activity is live</div>
        </div>

        <div style={{ fontSize: 22, opacity: 0.82 }}>
          Historical demand pages remain only as temporary retirement placeholders.
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
