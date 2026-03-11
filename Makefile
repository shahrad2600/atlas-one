# ─────────────────────────────────────────────────────────────
# Atlas One — Makefile
# ─────────────────────────────────────────────────────────────

.DEFAULT_GOAL := help
SHELL := /bin/bash

# Colors for terminal output
CYAN  := \033[36m
GREEN := \033[32m
RESET := \033[0m

# ── Environment ───────────────────────────────────────────────

.PHONY: bootstrap
bootstrap: ## Install deps, start infra, run migrations, seed data
	@echo -e "$(CYAN)▸ Bootstrapping Atlas One...$(RESET)"
	bash scripts/bootstrap.sh

.PHONY: env
env: ## Copy .env.example to .env (no-op if .env exists)
	@test -f .env || (cp .env.example .env && echo -e "$(GREEN)✓ .env created from .env.example$(RESET)") || true
	@test -f .env && echo -e "$(GREEN)✓ .env already exists$(RESET)" || true

# ── Development ───────────────────────────────────────────────

.PHONY: dev
dev: ## Start all apps and services in dev mode
	pnpm run dev

.PHONY: dev-apps
dev-apps: ## Start only Next.js apps in dev mode
	pnpm run dev:apps

.PHONY: dev-services
dev-services: ## Start only Fastify services in dev mode
	pnpm run dev:services

# ── Build ─────────────────────────────────────────────────────

.PHONY: build
build: ## Build all packages, apps, and services
	pnpm run build

.PHONY: build-apps
build-apps: ## Build only Next.js apps
	pnpm run build:apps

.PHONY: build-services
build-services: ## Build only Fastify services
	pnpm run build:services

# ── Testing ───────────────────────────────────────────────────

.PHONY: test
test: ## Run all tests across the monorepo
	pnpm run test

.PHONY: test-unit
test-unit: ## Run unit tests only
	pnpm run test:unit

.PHONY: test-integration
test-integration: ## Run integration tests only
	pnpm run test:integration

.PHONY: test-coverage
test-coverage: ## Run tests with coverage reporting
	pnpm run test:coverage

# ── Code Quality ──────────────────────────────────────────────

.PHONY: lint
lint: ## Lint all packages
	pnpm run lint

.PHONY: lint-fix
lint-fix: ## Lint and auto-fix all packages
	pnpm run lint:fix

.PHONY: format
format: ## Format all files with Prettier
	pnpm run format

.PHONY: format-check
format-check: ## Check formatting without writing
	pnpm run format:check

.PHONY: typecheck
typecheck: ## Run TypeScript type checking
	pnpm run typecheck

.PHONY: check
check: lint typecheck test ## Run lint + typecheck + test (CI gate)

# ── Database ──────────────────────────────────────────────────

.PHONY: migrate
migrate: ## Run database migrations
	pnpm run migrate

.PHONY: migrate-create
migrate-create: ## Create a new migration file
	pnpm run migrate:create

.PHONY: migrate-rollback
migrate-rollback: ## Rollback the last migration
	pnpm run migrate:rollback

.PHONY: migrate-status
migrate-status: ## Show migration status
	pnpm run migrate:status

.PHONY: seed
seed: ## Seed the database with sample data
	pnpm run seed

.PHONY: seed-reset
seed-reset: ## Reset and re-seed the database
	pnpm run seed:reset

.PHONY: db-reset
db-reset: docker-down docker-up ## Reset database containers and re-run migrations
	@echo -e "$(CYAN)▸ Waiting for PostgreSQL to be ready...$(RESET)"
	@sleep 3
	$(MAKE) migrate seed

# ── Docker / Infrastructure ───────────────────────────────────

.PHONY: docker-up
docker-up: ## Start Docker Compose services (Postgres, Redis, etc.)
	docker compose up -d
	@echo -e "$(GREEN)✓ Infrastructure services are up$(RESET)"

.PHONY: docker-down
docker-down: ## Stop Docker Compose services
	docker compose down
	@echo -e "$(GREEN)✓ Infrastructure services stopped$(RESET)"

.PHONY: docker-logs
docker-logs: ## Tail Docker Compose logs
	docker compose logs -f

.PHONY: docker-reset
docker-reset: ## Stop, remove volumes, and restart Docker services
	docker compose down -v
	docker compose up -d
	@echo -e "$(GREEN)✓ Infrastructure services reset$(RESET)"

.PHONY: docker-ps
docker-ps: ## Show running Docker containers
	docker compose ps

# ── Cleanup ───────────────────────────────────────────────────

.PHONY: clean
clean: ## Remove all build artifacts and node_modules
	pnpm run clean
	rm -rf node_modules
	@echo -e "$(GREEN)✓ Cleaned all build artifacts$(RESET)"

# ── Help ──────────────────────────────────────────────────────

.PHONY: help
help: ## Show this help message
	@echo -e "$(CYAN)Atlas One — Available Commands$(RESET)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""
