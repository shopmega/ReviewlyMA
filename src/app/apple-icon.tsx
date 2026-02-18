import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default function AppleIcon() {
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
          borderRadius: 40,
          color: '#F8FAFC',
          fontFamily: 'Inter, Arial, sans-serif',
          fontWeight: 800,
          fontSize: 96,
          position: 'relative',
        }}
      >
        A
        <div
          style={{
            position: 'absolute',
            right: 24,
            top: 24,
            width: 24,
            height: 24,
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
