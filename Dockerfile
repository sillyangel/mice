# Use Node.js 20 Alpine for smaller image size
FROM node:24-alpine

# Install pnpm globally
RUN npm install -g pnpm@latest-11

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Copy README.md to the app directory for documentation
COPY README.md /app/

# Set environment variable placeholders during build
# These will be replaced at runtime with actual values
ENV NEXT_PUBLIC_NAVIDROME_URL=NEXT_PUBLIC_NAVIDROME_URL
ENV NEXT_PUBLIC_NAVIDROME_USERNAME=NEXT_PUBLIC_NAVIDROME_USERNAME
ENV NEXT_PUBLIC_NAVIDROME_PASSWORD=NEXT_PUBLIC_NAVIDROME_PASSWORD
ENV NEXT_PUBLIC_COMMIT_SHA=docker-build
ENV PORT=3000

# Build the application
RUN pnpm build

# Copy entrypoint script
COPY entrypoint.sh /usr/bin/
RUN chmod +x /usr/bin/entrypoint.sh

# Expose the port
EXPOSE $PORT

# Set entrypoint to replace env vars at runtime
ENTRYPOINT ["entrypoint.sh"]

# Start the application
CMD ["sh", "-c", "pnpm start -p $PORT"]