###############################################################################
# Atlas One — Concierge App Dockerfile (Next.js, Production)
# Run from monorepo root: docker build -f apps/concierge/Dockerfile .
###############################################################################

# ── Base ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# ── Dependencies ───────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ packages/
COPY apps/concierge/package.json apps/concierge/
RUN pnpm install --frozen-lockfile --filter @atlas/concierge...

# ── Builder ────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app .
COPY tsconfig.base.json ./
COPY apps/concierge/ apps/concierge/
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @atlas/concierge build

# ── Runner ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache curl dumb-init

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/concierge/.next/standalone ./
COPY --from=builder /app/apps/concierge/.next/static apps/concierge/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/concierge/public apps/concierge/public

USER nextjs
EXPOSE 3002
ENV PORT=3002
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/concierge/server.js"]
