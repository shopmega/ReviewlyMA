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
  const name = clean(searchParams.get('name'), 'Entreprise');
  const city = clean(searchParams.get('city'), 'Maroc', 22);
  const category = clean(searchParams.get('category'), 'Entreprise', 28);
  const rating = clean(searchParams.get('rating'), '0.0', 4);
  const reviews = clean(searchParams.get('reviews'), '0', 6);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(145deg, #0B1220 0%, #0F172A 45%, #111827 100%)',
          color: '#F8FAFC',
          padding: '56px 64px',
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>AVis - Entreprises</div>
          <div style={{ fontSize: 22, opacity: 0.82 }}>{city}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 54, fontWeight: 800, lineHeight: 1.08 }}>{name}</div>
          <div style={{ fontSize: 30, opacity: 0.92 }}>{category}</div>
          <div style={{ fontSize: 26, opacity: 0.82 }}>{reviews} avis publies</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 30, fontWeight: 700 }}>Note: {rating}/5</div>
          <div style={{ fontSize: 22, opacity: 0.78 }}>Donnees anonymisees et moderees</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
