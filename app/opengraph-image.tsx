import { ImageResponse } from 'next/og';
import fs from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'mice';

export default async function OpengraphImage() {
  const cwd = process.cwd();

  // Load the continuous wave background that extends the app icon's wave field
  const bgBuffer = fs.readFileSync(path.join(cwd, 'public', 'og-wave-bg.png'));
  const bgBase64 = `data:image/png;base64,${bgBuffer.toString('base64')}`;

  // Load the official app icon
  const iconBuffer = fs.readFileSync(path.join(cwd, 'public', 'icon-512.png'));
  const iconBase64 = `data:image/png;base64,${iconBuffer.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          backgroundColor: '#222222',
          overflow: 'hidden',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Continuous Wave Background from Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bgBase64}
          alt=""
          width={1200}
          height={630}
          style={{
            position: 'absolute',
            inset: 0,
            width: '1200px',
            height: '630px',
            objectFit: 'cover',
          }}
        />

        {/* Centered Lockup: [App Logo] + [mice] */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '36px',
            position: 'relative',
          }}
        >
          {/* Logo with Soft Depth Shadow */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={iconBase64}
            alt="mice"
            width={210}
            height={210}
            style={{
              width: '210px',
              height: '210px',
              borderRadius: '9999px',
              boxShadow:
                '0 24px 60px rgba(0, 0, 0, 0.75), 0 8px 20px rgba(0, 0, 0, 0.55)',
            }}
          />

          {/* App Name 'mice' in bold, clean typography */}
          <span
            style={{
              fontSize: '170px',
              fontWeight: 800,
              letterSpacing: '-0.045em',
              lineHeight: 1,
              color: '#ffffff',
              textShadow:
                '0 4px 30px rgba(0, 0, 0, 0.8), 0 2px 10px rgba(0, 0, 0, 0.6)',
              paddingBottom: '8px',
            }}
          >
            mice
          </span>
        </div>
      </div>
    ),
    {
      width: size.width,
      height: size.height,
    }
  );
}