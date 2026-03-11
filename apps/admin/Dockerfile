###############################################################################
# Atlas One — Admin App Dockerfile (Next.js, Production)
# Run from monorepo root: docker build -f apps/admin/Dockerfile .
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
COPY apps/admin/package.json apps/admin/
RUN pnpm install --frozen-lockfile --filter @atlas/admin...

# ── Builder ────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app .
COPY tsconfig.base.json ./
COPY apps/admin/ apps/admin/
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @atlas/admin build

# ── Runner ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache curl dumb-init

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static apps/admin/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/public apps/admin/public

USER nextjs
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/admin/server.js"]
