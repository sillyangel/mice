import { execSync } from 'node:child_process';

/** @type {import('next').NextConfig} */
const isStandaloneBuild = process.env.BUILD_STANDALONE === '1';

// Resolve the commit SHA at config time instead of overwriting .env.local
// (the old predev/prebuild scripts clobbered user credentials stored there).
function getCommitSha() {
  if (process.env.NEXT_PUBLIC_COMMIT_SHA) return process.env.NEXT_PUBLIC_COMMIT_SHA;
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'unknown';
  }
}

const nextConfig = {
  poweredByHeader: false,
  compress: true,
  reactStrictMode: false,
  output: isStandaloneBuild ? 'standalone' : undefined,
  env: {
    NEXT_PUBLIC_COMMIT_SHA: getCommitSha(),
  },
  experimental: {
    // Tree-shake barrel imports from large icon/UI libraries
    optimizePackageImports: ['lucide-react', 'react-icons', 'framer-motion', '@radix-ui/react-icons', 'date-fns'],
  },
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
