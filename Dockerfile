# Use Node.js 22 Alpine for smaller image size
FROM node:22-alpine

# Install pnpm globally
RUN npm install -g pnpm@10.12.4

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Set default environment variables (can be overridden at runtime)
# Navidrome configuration is optional - app will prompt if not provided
ENV NEXT_PUBLIC_NAVIDROME_URL=""
ENV NEXT_PUBLIC_NAVIDROME_USERNAME=""
ENV NEXT_PUBLIC_NAVIDROME_PASSWORD=""
ENV NEXT_PUBLIC_POSTHOG_KEY=""
ENV NEXT_PUBLIC_POSTHOG_HOST=""
ENV PORT=3000

# Generate git commit hash for build info (fallback if not available)
RUN echo "NEXT_PUBLIC_COMMIT_SHA=docker-build" > .env.local

# Build the application
RUN pnpm build

# Expose the port
EXPOSE $PORT

# Start the application
CMD ["sh", "-c", "pnpm start -p $PORT"]