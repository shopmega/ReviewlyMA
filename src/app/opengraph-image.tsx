import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0F172A 0%, #111827 55%, #1F2937 100%)',
          color: '#F8FAFC',
          padding: '56px 64px',
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 22,
              backgroundColor: '#22C55E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F172A',
              fontSize: 42,
              fontWeight: 800,
            }}
          >
            A
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: 0.3 }}>AVis</div>
            <div style={{ fontSize: 26, opacity: 0.88 }}>Avis et confiance pour les entreprises</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.1 }}>
            Trouvez les meilleures entreprises
          </div>
          <div style={{ fontSize: 34, opacity: 0.9 }}>Notes, avis, salaires et informations verifiees</div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
