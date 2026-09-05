import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'mice — a music streaming client for Navidrome';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #14121f 55%, #1d1145 100%)',
          color: '#fafafa',
          padding: '64px 80px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '88px',
              height: '88px',
              borderRadius: '22px',
              background: 'linear-gradient(135deg, #60a5fa 0%, #8b5cf6 100%)',
              fontSize: '48px',
              fontWeight: 700,
            }}
          >
            ♪
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '88px', fontWeight: 700, lineHeight: 1 }}>
              mice
            </span>
            <span style={{ fontSize: '28px', color: '#a1a1aa', marginTop: '10px' }}>
              navidrome client
            </span>
          </div>
        </div>

        <span style={{ fontSize: '34px', color: '#d4d4d8', textAlign: 'center' }}>
          Your music library, streamed to every screen you own.
        </span>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '44px',
          }}
        >
          {[32, 56, 40, 72, 48, 84, 60, 40, 66, 52, 76, 46].map((height) => (
            <div
              key={height}
              style={{
                width: '10px',
                height: `${height}px`,
                borderRadius: '5px',
                background: 'linear-gradient(180deg, #60a5fa 0%, #8b5cf6 100%)',
                opacity: 0.9,
              }}
            />
          ))}
        </div>
      </div>
    ),
    {
      width: size.width,
      height: size.height,
    }
  );
}