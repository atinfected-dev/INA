import { ImageResponse } from 'next/og';

/** The home-screen icon on iOS, which wants a PNG: the favicon, rendered. */
export const runtime = 'nodejs';
export const size = { width: 180, height: 180 };
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
          background: 'radial-gradient(circle at 50% 38%, #3aa882 0%, #1c5343 55%, #0a1512 100%)',
          borderRadius: 40,
        }}
      >
        <div
          style={{
            width: 150,
            height: 150,
            borderRadius: 75,
            border: '6px solid #c8aa6e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Georgia, serif',
            fontSize: 74,
            color: '#f6e6b4',
            textShadow: '0 3px 0 #000',
          }}
        >
          INA
        </div>
      </div>
    ),
    { ...size },
  );
}
