#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Building Mice IWA package..."

mkdir -p iwa-dist/.well-known
cp public/*.png public/*.ico iwa-dist/ 2>/dev/null || true

if [ ! -f iwa-key.pem ]; then
  echo "==> Generating new Ed25519 signing key (iwa-key.pem)..."
  openssl genpkey -algorithm Ed25519 -out iwa-key.pem
fi

echo "==> Creating Web Bundle (out.wbn)..."
npx -y wbn --dir iwa-dist -o mice.wbn

echo "==> Signing Web Bundle with iwa-key.pem..."
npx -y wbn-sign sign mice.wbn iwa-key.pem -o mice.swbn

echo "==> IWA Package created successfully!"
npx -y wbn-sign info mice.swbn
