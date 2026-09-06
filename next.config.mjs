/** @type {import('next').NextConfig} */
const isStandaloneBuild = process.env.BUILD_STANDALONE === '1';

const nextConfig = {
  poweredByHeader: false,
  output: isStandaloneBuild ? 'standalone' : undefined,
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' *; connect-src 'self' *; script-src 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
