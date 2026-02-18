import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = {
  width: 512,
  height: 512,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0F172A',
          borderRadius: 120,
          color: '#F8FAFC',
          fontFamily: 'Inter, Arial, sans-serif',
          fontWeight: 800,
          fontSize: 260,
          position: 'relative',
        }}
      >
        A
        <div
          style={{
            position: 'absolute',
            right: 90,
            top: 90,
            width: 72,
            height: 72,
            borderRadius: 9999,
            background: '#22C55E',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
