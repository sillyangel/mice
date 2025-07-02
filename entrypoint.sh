#!/bin/sh
set -e

echo "🔧 Replacing environment variable placeholders..."

# Replace env variable placeholders with real values for NEXT_PUBLIC_ variables
printenv | grep NEXT_PUBLIC_ | while read -r line ; do
  key=$(echo "$line" | cut -d "=" -f1)
  value=$(echo "$line" | cut -d "=" -f2-)
  
  echo "  🔄 Replacing $key with actual value"
  
  # Replace in all .next files
  find /app/.next/ -type f \( -name "*.js" -o -name "*.json" \) -exec sed -i "s|$key|$value|g" {} \; 2>/dev/null || true
done

echo "✅ Environment variable replacement complete"

# Execute the container's main process (CMD in Dockerfile)
exec "$@"
