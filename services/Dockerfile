###############################################################################
# Atlas One — Shared Microservice Dockerfile (Production)
# Usage: docker build --build-arg SERVICE=identity-service -f services/Dockerfile .
# Run from monorepo root: docker build --build-arg SERVICE=identity-service -f services/Dockerfile .
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
ARG SERVICE
COPY services/${SERVICE}/package.json services/${SERVICE}/
RUN pnpm install --frozen-lockfile --filter @atlas/${SERVICE}...

# ── Builder ────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app .
COPY tsconfig.base.json ./
ARG SERVICE
COPY services/${SERVICE}/ services/${SERVICE}/
RUN pnpm --filter @atlas/${SERVICE} build

# ── Runner ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

# curl for health checks, dumb-init for proper PID 1 signal handling
RUN apk add --no-cache curl dumb-init

WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 atlas && \
    adduser --system --uid 1001 atlas

ARG SERVICE
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=builder /app/services/${SERVICE}/dist ./dist
COPY --from=builder /app/services/${SERVICE}/package.json ./

USER atlas
EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
