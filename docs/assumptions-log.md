# Atlas One -- Assumptions Log

> Living document. Every assumption should be validated or revised as the build progresses.
> Last updated: 2026-03-01

---

## How to Use This Log

Each assumption is tagged with:

- **ID** -- unique reference (e.g., `ASM-001`)
- **Category** -- Architecture, Data, Business, Infrastructure, Security, UX, Integration
- **Status** -- `ASSUMED` (unvalidated) | `VALIDATED` | `REVISED` | `REJECTED`
- **Impact if Wrong** -- Low, Medium, High, Critical
- **Owner** -- agent or team responsible for validation

---

## Architecture

| ID | Assumption | Status | Impact if Wrong | Owner | Notes |
| -------- | ---------- | -------- | --------------- | ----- | ----- |
| ASM-001 | PostgreSQL 16 with pgvector is sufficient for all vector search needs at launch scale (< 10M embeddings). No separate vector DB (Pinecone, Weaviate) is needed initially. | ASSUMED | High | Database Agent | Revisit if p99 vector query latency exceeds 200ms at 5M rows. |
| ASM-002 | A single Postgres database with schema-based isolation (`tg`, `identity`, future schemas) is adequate. No need for separate database instances per service in Phase 1-2. | ASSUMED | High | Database Agent | Move to per-service databases if cross-schema joins become a performance bottleneck or if team autonomy demands it. |
| ASM-003 | Microservices communicate primarily via synchronous HTTP/gRPC for reads and asynchronous Kafka events for writes/state changes. | ASSUMED | Medium | Platform Agent | Could switch to fully event-driven if latency budgets allow. |
| ASM-004 | Fastify (or Hono) on Node.js 20+ is the default service runtime. No JVM or Go services are needed at launch. | ASSUMED | Medium | Platform Agent | Performance-critical paths (search, AI) may require language switch later. |
| ASM-005 | Next.js App Router with server components is the right frontend framework for both the consumer web app and admin panel. | ASSUMED | Medium | Frontend Agent | Evaluate if RSC complexity vs. SPA simplicity becomes a developer experience issue. |
| ASM-006 | A single monorepo (pnpm workspaces) can scale to 15+ services and 5+ packages without unacceptable CI times. | ASSUMED | Medium | Infra Agent | Introduce Turborepo or Nx caching if CI wall-clock exceeds 15 minutes. |
| ASM-007 | The Travel Graph (entity-relationship model in Postgres) is sufficient. A dedicated graph database (Neo4j) is not required for the relationship queries at launch. | ASSUMED | High | Graph Agent | If multi-hop graph traversals (depth > 3) become common and slow, evaluate Neo4j or Apache AGE extension. |

---

## Data Model

| ID | Assumption | Status | Impact if Wrong | Owner | Notes |
| -------- | ---------- | -------- | --------------- | ----- | ----- |
| ASM-010 | UUID v4 primary keys everywhere. No auto-increment IDs. This provides global uniqueness for distributed systems and avoids enumeration attacks. | ASSUMED | Low | Database Agent | UUID v7 (time-sortable) could improve index locality. Consider migration if insert throughput suffers. |
| ASM-011 | A single `tg_entity` table with `entity_type` discriminator is preferable to fully separate tables per entity type. This enables uniform aliasing, external refs, reviews, media, and embeddings via a single FK. | ASSUMED | High | Database Agent | If the single-table approach leads to confusing queries or performance issues on large datasets, refactor to separate base tables with a shared trait/interface. |
| ASM-012 | 1536-dimension embeddings (OpenAI text-embedding-3-small) are the default. All vectors stored in VECTOR(1536) columns. | ASSUMED | Medium | AI Agent | If switching to a model with different dimensions, a migration to alter the vector column width will be needed. |
| ASM-013 | JSONB columns for semi-structured data (amenities, attributes, hours, policy rules, metadata) are acceptable. Schema enforcement happens at the application layer, not in Postgres CHECK constraints on JSONB. | ASSUMED | Medium | Database Agent | If data quality issues arise from unvalidated JSONB, introduce JSON Schema validation in a Postgres trigger or application middleware. |
| ASM-014 | Soft-delete via `status` columns (e.g., `status = 'deleted'`) rather than physical deletion. Rows are never removed except by explicit data-retention jobs. | ASSUMED | Low | Database Agent | Aligns with GDPR right-to-erasure if we add a hard-delete job for `status = 'deleted'` rows after the retention period. |
| ASM-015 | BCP 47 language tags (e.g., `en`, `fr-CA`, `ja`) are used consistently across aliases, reviews, and content. | ASSUMED | Low | Platform Agent | |

---

## Business & Product

| ID | Assumption | Status | Impact if Wrong | Owner | Notes |
| -------- | ---------- | -------- | --------------- | ----- | ----- |
| ASM-020 | The platform operates as a marketplace/aggregator at launch -- it does not hold inventory itself. Suppliers own inventory; Atlas One facilitates discovery and booking. | ASSUMED | Critical | Commerce Agent | If Atlas One buys and resells inventory (merchant model), the commerce and finance schemas need significant changes (purchase orders, cost basis, margin tracking). |
| ASM-021 | USD is the primary settlement currency. Multi-currency display is Phase 3; multi-currency settlement is post-launch. | ASSUMED | Medium | Finance Agent | If international suppliers demand local-currency settlement at launch, the finance schema needs currency ledgers earlier. |
| ASM-022 | Stripe is the sole payment processor at launch. No PayPal, Adyen, or direct bank integrations until post-launch. | ASSUMED | Medium | Commerce Agent | Stripe covers cards, Apple Pay, Google Pay. If a key market (e.g., Asia) requires local payment methods unavailable via Stripe, add a second processor. |
| ASM-023 | The AI concierge is conversational (text-based, multi-turn). Voice input/output is post-launch. | ASSUMED | Low | AI Agent | Voice would require ASR/TTS integrations and a different UX. |
| ASM-024 | Dining reservations are the lead vertical. Hotel/stay and experiences follow closely. Flights and insurance are Phase 3 additions. | ASSUMED | Medium | Verticals Agent | If business strategy shifts to flights-first, reorder the task graph accordingly. |
| ASM-025 | Launch market is United States, expanding to UK/EU in a follow-up phase. Timezone, currency, and compliance assumptions are US-centric initially. | ASSUMED | High | Platform Agent | EU launch requires GDPR DPA, cookie consent, VAT handling. |
| ASM-026 | Supplier onboarding is manual/admin-assisted at launch. Self-serve supplier portal is a post-launch feature. | ASSUMED | Low | Admin Agent | |

---

## Infrastructure & DevOps

| ID | Assumption | Status | Impact if Wrong | Owner | Notes |
| -------- | ---------- | -------- | --------------- | ----- | ----- |
| ASM-030 | AWS is the cloud provider. All infrastructure (RDS, ElastiCache, MSK, EKS, S3, CloudFront) is on AWS. | ASSUMED | High | Infra Agent | Multi-cloud or GCP switch would require rewriting Terraform modules and changing managed service choices. |
| ASM-031 | Kubernetes (EKS) for production orchestration. Docker Compose for local development only. | ASSUMED | Medium | Infra Agent | If team is small enough, ECS Fargate could reduce operational overhead. Evaluate before Phase 4. |
| ASM-032 | Kafka is used for async event streaming between services. At low scale, Redis Streams could substitute, but Kafka is chosen for future throughput headroom. | ASSUMED | Medium | Platform Agent | If Kafka operational cost is too high early on, use Redis Streams in Phase 1-2 and migrate to Kafka when needed. |
| ASM-033 | GitHub Actions is the CI/CD platform. No Jenkins, CircleCI, or GitLab CI. | ASSUMED | Low | Infra Agent | |
| ASM-034 | Feature flags are managed via environment variables initially. A dedicated feature flag service (LaunchDarkly, Unleash) is post-launch. | ASSUMED | Low | Platform Agent | |
| ASM-035 | Blue-green deployments for zero-downtime releases. No canary or rolling deployments at launch. | ASSUMED | Low | Infra Agent | |

---

## Security & Compliance

| ID | Assumption | Status | Impact if Wrong | Owner | Notes |
| -------- | ---------- | -------- | --------------- | ----- | ----- |
| ASM-040 | No raw credit card data is stored or processed. Stripe Elements / Payment Intents handle all PCI-sensitive data. Atlas One targets SAQ-A level PCI compliance. | ASSUMED | Critical | Security Agent | If any flow requires server-side card data, PCI scope explodes to SAQ-D. Avoid at all costs. |
| ASM-041 | Passwords are hashed with Argon2id (or bcrypt as fallback). No plaintext or reversible encryption for passwords. | ASSUMED | Critical | Identity Agent | |
| ASM-042 | JWT access tokens are short-lived (15 min). Refresh tokens are long-lived (7 days) and rotated on use. | ASSUMED | Medium | Identity Agent | If mobile app requirements demand longer access tokens, adjust but add token binding. |
| ASM-043 | Row-level security (RLS) is NOT used in Phase 1. Access control is enforced at the service/application layer. RLS may be introduced later for multi-tenant isolation. | ASSUMED | Medium | Database Agent | If a data leak occurs due to application-layer access control bugs, RLS becomes urgent. |
| ASM-044 | GDPR compliance is required from launch even for US market (some users may be EU residents). Data export and deletion APIs must exist. | ASSUMED | High | Security Agent | |
| ASM-045 | All inter-service communication is within a VPC. No mTLS between services at launch; rely on network-level isolation. | ASSUMED | Medium | Infra Agent | Add mTLS or service mesh (Istio/Linkerd) if zero-trust is required. |

---

## UX & Frontend

| ID | Assumption | Status | Impact if Wrong | Owner | Notes |
| -------- | ---------- | -------- | --------------- | ----- | ----- |
| ASM-050 | The primary interface is a responsive web app. Native mobile apps (iOS/Android) are post-launch. The concierge app is a PWA-capable web app. | ASSUMED | Medium | Frontend Agent | If app store presence is required at launch, consider React Native or Capacitor wrapper. |
| ASM-051 | Server-side rendering (SSR) is used for SEO-critical pages (search results, venue/place detail). The concierge chat interface is client-rendered. | ASSUMED | Low | Frontend Agent | |
| ASM-052 | English is the only UI language at launch. i18n framework (next-intl or similar) is scaffolded but translations are not provided until international expansion. | ASSUMED | Low | Frontend Agent | Scaffold i18n early to avoid costly retrofitting. |
| ASM-053 | Design system uses Tailwind CSS with Radix UI primitives. No Material UI, Chakra, or Ant Design. | ASSUMED | Low | Frontend Agent | |

---

## Integration & Third-Party

| ID | Assumption | Status | Impact if Wrong | Owner | Notes |
| -------- | ---------- | -------- | --------------- | ----- | ----- |
| ASM-060 | OpenAI is the primary LLM provider (GPT-4o). Anthropic Claude is the fallback/secondary. Google Gemini is available for experimentation. | ASSUMED | Medium | AI Agent | Abstract behind a provider interface so swapping is a config change, not a code change. |
| ASM-061 | Flight data comes from a single aggregator API (e.g., Duffel, Kiwi, or Amadeus) at launch. Direct airline NDC connections are Phase 4+. | ASSUMED | High | Flights Agent | Aggregator coverage and pricing may not be competitive for all routes. |
| ASM-062 | Hotel/stay inventory is sourced from a single aggregator (e.g., Impala, Booking.com Connectivity) at launch. | ASSUMED | High | Verticals Agent | |
| ASM-063 | Restaurant reservation integration uses OpenTable or Resy API where available, plus a direct booking model for suppliers without aggregator presence. | ASSUMED | Medium | Verticals Agent | API access to OpenTable/Resy may require partnership agreements. |
| ASM-064 | Email delivery uses a transactional provider (SendGrid, AWS SES, or Resend). No in-house SMTP. | ASSUMED | Low | Messaging Agent | |
| ASM-065 | Map and geocoding services use Mapbox or Google Maps. A single provider, not both. | ASSUMED | Low | Frontend Agent | |

---

## Revision History

| Date | ID(s) | Change | Author |
| ---------- | ------ | ------ | ------ |
| 2026-03-01 | All | Initial assumptions log created | Atlas Build Team |
