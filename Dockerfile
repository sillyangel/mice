# ---------- deps ----------
FROM node:24-alpine AS deps

RUN apk add --no-cache libc6-compat
RUN npm i -g pnpm@latest-11

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile


# ---------- build ----------
FROM node:24-alpine AS builder

RUN apk add --no-cache libc6-compat
RUN npm i -g pnpm@latest-11

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build


# ---------- prod deps only ----------
FROM node:24-alpine AS prod-deps

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm i -g pnpm@latest-11 \
  && pnpm install --prod --frozen-lockfile


# ---------- runtime ----------
FROM node:24-alpine AS runner

RUN apk add --no-cache libc6-compat
RUN npm i -g pnpm@latest-11

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# production node_modules only
COPY --from=prod-deps /app/node_modules ./node_modules

# build output only
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# your runtime env injector
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["pnpm", "start", "-p", "3000"]
