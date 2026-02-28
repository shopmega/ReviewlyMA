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
  const title = clean(searchParams.get('title'), 'Demande de parrainage');
  const role = clean(searchParams.get('role'), 'Poste');
  const city = clean(searchParams.get('city'), 'Maroc', 24);

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
              backgroundColor: '#34D399',
            }}
          />
          <div style={{ fontSize: 28, fontWeight: 700 }}>Demand board</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 50, fontWeight: 800, lineHeight: 1.08 }}>{title}</div>
          <div style={{ fontSize: 32, opacity: 0.95 }}>{role}</div>
          <div style={{ fontSize: 26, opacity: 0.82 }}>{city}</div>
        </div>

        <div style={{ fontSize: 22, opacity: 0.82 }}>
          Publication anonymisee. Moderation active.
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
