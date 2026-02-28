import { ImageResponse } from 'next/og';

export const runtime = 'edge';

function clean(value: string | null, fallback: string, max = 42) {
  if (!value) return fallback;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return fallback;
  return normalized.slice(0, max);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const company = clean(searchParams.get('company'), 'Entreprise');
  const role = clean(searchParams.get('role'), 'Poste');
  const city = clean(searchParams.get('city'), 'Maroc', 24);
  const slots = clean(searchParams.get('slots'), '-', 6);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(145deg, #0B1220 0%, #102A43 45%, #0F172A 100%)',
          color: '#F8FAFC',
          padding: '56px 64px',
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>Parrainage emploi</div>
          <div
            style={{
              borderRadius: 999,
              border: '1px solid rgba(251, 191, 36, 0.45)',
              color: '#FDE68A',
              fontSize: 20,
              padding: '8px 14px',
            }}
          >
            Anti-fraude
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.1 }}>{role}</div>
          <div style={{ fontSize: 36, opacity: 0.95 }}>{company}</div>
          <div style={{ fontSize: 28, opacity: 0.82 }}>{city} - {slots} place(s)</div>
        </div>

        <div style={{ fontSize: 22, opacity: 0.8 }}>
          Aucun paiement autorise pour un parrainage.
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
