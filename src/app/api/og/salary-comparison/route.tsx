import { ImageResponse } from 'next/og';

export const runtime = 'edge';

function clean(value: string | null, fallback: string, max = 40) {
  if (!value) return fallback;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return fallback;
  return normalized.slice(0, max);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = clean(searchParams.get('mode'), 'default', 16);
  const companyA = clean(searchParams.get('companyALabel'), 'Entreprise A');
  const companyB = clean(searchParams.get('companyBLabel'), 'Entreprise B');
  const role = clean(searchParams.get('roleLabel'), 'Poste');
  const cityA = clean(searchParams.get('cityALabel'), 'Ville A');
  const cityB = clean(searchParams.get('cityBLabel'), 'Ville B');

  const heading =
    mode === 'company'
      ? `${companyA} vs ${companyB}`
      : mode === 'role_city'
        ? `${role}: ${cityA} vs ${cityB}`
        : 'Comparaison des salaires';

  const subtitle =
    mode === 'company'
      ? 'Benchmark salarial anonymise'
      : mode === 'role_city'
        ? 'Ecart de salaire entre villes'
        : 'Comparez entreprises, roles et villes';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0B1220 0%, #0F172A 55%, #111827 100%)',
          color: '#F8FAFC',
          padding: '56px 64px',
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 999,
              backgroundColor: '#22C55E',
            }}
          />
          <div style={{ fontSize: 30, fontWeight: 700 }}>AVis - Salaires Maroc</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.08 }}>{heading}</div>
          <div style={{ fontSize: 30, opacity: 0.92 }}>{subtitle}</div>
        </div>

        <div style={{ fontSize: 24, opacity: 0.8 }}>
          Donnees anonymisees et agregees - indicateurs informatifs.
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
