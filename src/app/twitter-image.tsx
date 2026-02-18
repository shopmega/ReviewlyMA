import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function TwitterImage() {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 74,
              height: 74,
              borderRadius: 18,
              backgroundColor: '#22C55E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F172A',
              fontSize: 36,
              fontWeight: 800,
            }}
          >
            A
          </div>
          <div style={{ fontSize: 46, fontWeight: 800 }}>AVis</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1 }}>
            Avis, salaires et insights
          </div>
          <div style={{ fontSize: 32, opacity: 0.9 }}>Une vision claire des entreprises au Maroc</div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
