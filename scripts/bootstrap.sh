#!/usr/bin/env bash
###############################################################################
# Atlas One — Bootstrap Script
# Installs dependencies, starts infrastructure, runs migrations, seeds data.
###############################################################################

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
CYAN='\033[36m'
GREEN='\033[32m'
RED='\033[31m'
YELLOW='\033[33m'
RESET='\033[0m'

info()    { echo -e "${CYAN}▸ $1${RESET}"; }
success() { echo -e "${GREEN}✓ $1${RESET}"; }
warn()    { echo -e "${YELLOW}⚠ $1${RESET}"; }
error()   { echo -e "${RED}✗ $1${RESET}"; exit 1; }

# ── Navigate to repo root ────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${CYAN}║        Atlas One — Bootstrap                    ║${RESET}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${RESET}"
echo ""

# ── Step 1: Check prerequisites ──────────────────────────────────────────────
info "Checking prerequisites..."

command -v node  >/dev/null 2>&1 || error "Node.js is not installed. Please install Node.js >= 20."
command -v pnpm  >/dev/null 2>&1 || error "pnpm is not installed. Run: npm install -g pnpm"
command -v docker >/dev/null 2>&1 || error "Docker is not installed. Please install Docker Desktop."

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  error "Node.js >= 20 is required. Current version: $(node -v)"
fi

success "All prerequisites satisfied (Node $(node -v), pnpm $(pnpm -v))"

# ── Step 2: Environment file ─────────────────────────────────────────────────
info "Checking environment configuration..."

if [ ! -f .env ]; then
  cp .env.example .env
  success "Created .env from .env.example — review and update secrets before production use"
else
  success ".env already exists"
fi

# ── Step 3: Install dependencies ─────────────────────────────────────────────
info "Installing dependencies with pnpm..."

pnpm install --frozen-lockfile 2>/dev/null || pnpm install
success "Dependencies installed"

# ── Step 4: Start Docker infrastructure ──────────────────────────────────────
info "Starting Docker infrastructure (PostgreSQL, Redis)..."

if ! docker info >/dev/null 2>&1; then
  error "Docker daemon is not running. Please start Docker Desktop."
fi

docker compose up -d

# ── Step 5: Wait for PostgreSQL ──────────────────────────────────────────────
info "Waiting for PostgreSQL to be ready..."

MAX_RETRIES=30
RETRY_COUNT=0

until docker compose exec -T postgres pg_isready -U "${DATABASE_USER:-atlas}" -d "${DATABASE_NAME:-atlas_dev}" >/dev/null 2>&1; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
    error "PostgreSQL did not become ready within ${MAX_RETRIES} seconds"
  fi
  sleep 1
done

success "PostgreSQL is ready"

# ── Step 6: Wait for Redis ───────────────────────────────────────────────────
info "Waiting for Redis to be ready..."

RETRY_COUNT=0

until docker compose exec -T redis redis-cli ping >/dev/null 2>&1; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
    error "Redis did not become ready within ${MAX_RETRIES} seconds"
  fi
  sleep 1
done

success "Redis is ready"

# ── Step 7: Run database migrations ──────────────────────────────────────────
info "Running database migrations..."

if pnpm run migrate 2>/dev/null; then
  success "Migrations complete"
else
  warn "Migration script not yet configured — skipping (set up @atlas/database package to enable)"
fi

# ── Step 8: Seed database ────────────────────────────────────────────────────
info "Seeding database..."

if pnpm run seed 2>/dev/null; then
  success "Database seeded"
else
  warn "Seed script not yet configured — skipping (set up @atlas/database package to enable)"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${GREEN}║        Atlas One — Bootstrap Complete!           ║${RESET}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  Next steps:"
echo -e "    ${CYAN}make dev${RESET}            Start all services in dev mode"
echo -e "    ${CYAN}make dev-apps${RESET}       Start only Next.js apps"
echo -e "    ${CYAN}make dev-services${RESET}   Start only Fastify services"
echo -e "    ${CYAN}make test${RESET}           Run the test suite"
echo -e ""
echo -e "  Infrastructure:"
echo -e "    PostgreSQL:  ${GREEN}localhost:5432${RESET}  (atlas_dev)"
echo -e "    Redis:       ${GREEN}localhost:6379${RESET}"
echo ""
