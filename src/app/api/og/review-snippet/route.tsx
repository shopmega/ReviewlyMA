import { ImageResponse } from 'next/og';

export const runtime = 'edge';

function clean(value: string | null, fallback: string, max = 180) {
  if (!value) return fallback;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return fallback;
  return normalized.slice(0, max);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const company = clean(searchParams.get('company'), 'Entreprise', 40);
  const city = clean(searchParams.get('city'), 'Maroc', 22);
  const rating = clean(searchParams.get('rating'), '0', 4);
  const snippet = clean(searchParams.get('snippet'), 'Extrait d avis employe anonymise.', 180);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(145deg, #0B1220 0%, #111827 55%, #1F2937 100%)',
          color: '#F8FAFC',
          padding: '56px 64px',
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{company}</div>
          <div style={{ fontSize: 22, opacity: 0.85 }}>{city}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 24, opacity: 0.8 }}>Extrait d avis employe</div>
          <div style={{ fontSize: 38, fontWeight: 700, lineHeight: 1.22 }}>
            "{snippet}"
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 700 }}>Note: {rating}/5</div>
          <div style={{ fontSize: 20, opacity: 0.78 }}>Donnees anonymisees et moderees</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
