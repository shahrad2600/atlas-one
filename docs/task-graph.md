# Atlas One -- Task Graph

> Build execution plan with parallel lanes, phase gates, and agent assignments.
> Last updated: 2026-03-01

---

## Legend

| Symbol | Meaning |
| ------ | --------------------------------- |
| `-->` | Sequential dependency |
| `\|\|` | Parallel execution within a lane |
| `[G]` | Phase gate -- all predecessors must pass before continuing |
| `A:` | Agent assignment prefix |

---

## Phase Overview

```
PHASE 1A          PHASE 1B          PHASE 2           PHASE 3           PHASE 4
Foundation        Core Services     Intelligence      Premium           Scale & Polish
(Weeks 1-3)       (Weeks 4-7)       (Weeks 8-11)      (Weeks 12-15)     (Weeks 16-18)
     |                 |                 |                  |                 |
     +---> [G1] ------>+---> [G2] ------>+----> [G3] ------>+---> [G4] ------>+---> LAUNCH
```

---

## Phase 1A -- Foundation (Weeks 1-3)

### Lane 1: Database & Schema (A: Database Agent)

```
1A-DB-01  Create tg schema + extensions (uuid-ossp, vector, pg_trgm)
    |
1A-DB-02  Travel Graph core tables (tg_entity, tg_relationship, tg_place,
    |      tg_venue, tg_supplier, tg_product, tg_inventory_slot, tg_review,
    |      tg_media, tg_embedding, tg_policy, tg_address, tg_entity_alias,
    |      tg_entity_external_ref)
    |
1A-DB-03  Identity schema (identity_user, identity_profile, identity_session,
    |      identity_verification)
    |
1A-DB-04  Seed data scripts (reference places, sample suppliers)
    |
    +--> [G1 prerequisite]
```

### Lane 2: Shared Packages (A: Platform Agent)

```
1A-PKG-01  @atlas/shared-types -- domain type definitions (TypeScript)
     ||
1A-PKG-02  @atlas/event-schemas -- event envelope + per-domain event types
     ||
1A-PKG-03  @atlas/policy-engine -- rule evaluator skeleton
     |
1A-PKG-04  @atlas/ui-components -- design system foundation (tokens, primitives)
     |
     +--> [G1 prerequisite]
```

### Lane 3: Infrastructure (A: Infra Agent)

```
1A-INF-01  Docker Compose (Postgres 16 + pgvector, Redis, Kafka, MinIO, Mailpit)
     |
1A-INF-02  Terraform modules -- VPC, RDS, ElastiCache, MSK stubs
     ||
1A-INF-03  CI pipeline -- lint, typecheck, test, build (GitHub Actions)
     ||
1A-INF-04  Observability scaffolding -- OpenTelemetry + Grafana dashboards
     |
     +--> [G1 prerequisite]
```

### Gate G1 -- Foundation Complete

```
Criteria:
  - All migrations run cleanly on fresh database
  - Shared packages compile and export types
  - Docker Compose boots all dependencies
  - CI pipeline green on main branch
```

---

## Phase 1B -- Core Services (Weeks 4-7)

### Lane 4: Identity & Auth (A: Identity Agent)

```
1B-ID-01   identity-service scaffold (Fastify / Hono)
    |
1B-ID-02   Registration, login, JWT issuance, refresh token rotation
    |
1B-ID-03   Session management + device tracking
    |
1B-ID-04   Profile CRUD + preferences storage
    |
    +--> [G2 prerequisite]
```

### Lane 5: Travel Graph Service (A: Graph Agent)

```
1B-TG-01   travel-graph-service scaffold
    |
1B-TG-02   Entity CRUD (create, read, update, soft-delete)
    |
1B-TG-03   Relationship management + graph traversal queries
    |
1B-TG-04   Alias resolution + external ref sync
    |
1B-TG-05   Embedding ingestion + vector similarity search
    |
    +--> [G2 prerequisite]
```

### Lane 6: Search Service (A: Search Agent)

```
1B-SR-01   search-service scaffold
    |
1B-SR-02   Full-text search over entities (trigram + tsvector)
    |
1B-SR-03   Faceted filtering (type, place, price tier, rating)
    |
1B-SR-04   Vector-powered semantic search integration
    |
    +--> [G2 prerequisite]
```

### Lane 7: Commerce Foundation (A: Commerce Agent)

```
1B-CM-01   commerce-service scaffold
    |
1B-CM-02   Cart model + hold/reserve inventory slots
    |
1B-CM-03   Stripe payment intent flow (create, confirm, webhook)
    |
1B-CM-04   Order lifecycle (pending -> confirmed -> fulfilled -> completed)
    |
    +--> [G2 prerequisite]
```

### Lane 8: Web App Foundation (A: Frontend Agent)

```
1B-WEB-01  Next.js app scaffold (App Router, server components)
    |
1B-WEB-02  Auth pages (sign-up, sign-in, forgot password)
     ||
1B-WEB-03  Layout shell, nav, responsive breakpoints
    |
1B-WEB-04  Search bar + results page
    |
1B-WEB-05  Entity detail pages (place, venue, product)
    |
    +--> [G2 prerequisite]
```

### Gate G2 -- Core Services Live

```
Criteria:
  - Users can register, log in, maintain sessions
  - Entities searchable via text and vector
  - Cart -> checkout -> payment flow end-to-end
  - Web app renders search results and detail pages
  - Integration tests passing for each service
```

---

## Phase 2 -- Intelligence Layer (Weeks 8-11)

### Lane 9: AI Orchestrator (A: AI Agent)

```
2-AI-01   ai-orchestrator scaffold (agent framework)
    |
2-AI-02   Conversational trip planner (multi-turn, memory)
    |
2-AI-03   Itinerary generation from natural language
    |
2-AI-04   Re-ranking search results with preference model
    |
2-AI-05   Tool-use integration (search, book, modify trip)
    |
   +--> [G3 prerequisite]
```

### Lane 10: Trip Service (A: Trip Agent)

```
2-TR-01   trip-service scaffold
    |
2-TR-02   Trip model (multi-day, multi-segment itineraries)
    |
2-TR-03   Trip item CRUD (flights, stays, dining, experiences)
    |
2-TR-04   Collaborative trips (invite, permissions, real-time sync)
    |
2-TR-05   Trip versioning + undo/redo
    |
   +--> [G3 prerequisite]
```

### Lane 11: Vertical Services Batch 1 (A: Verticals Agent)

```
2-VS-01   dining-service -- restaurant search, reservation flow
     ||
2-VS-02   stay-service -- hotel/rental search, room booking
     ||
2-VS-03   experiences-service -- tours/tickets/attractions
    |
2-VS-04   Unified availability calendar across verticals
    |
   +--> [G3 prerequisite]
```

### Lane 12: Trust & Safety (A: Trust Agent)

```
2-TS-01   trust-service scaffold
    |
2-TS-02   Review ingestion + fraud scoring pipeline
    |
2-TS-03   Content moderation (text + image)
    |
2-TS-04   User reputation system
    |
   +--> [G3 prerequisite]
```

### Lane 13: Concierge App (A: Frontend Agent)

```
2-CC-01   concierge app scaffold (chat-first mobile-responsive UI)
    |
2-CC-02   Streaming chat interface with AI orchestrator
    |
2-CC-03   Inline booking cards (search results rendered in chat)
    |
2-CC-04   Trip timeline visualization
    |
   +--> [G3 prerequisite]
```

### Gate G3 -- Intelligence Operational

```
Criteria:
  - AI concierge can plan a multi-day trip via conversation
  - Dining, stay, and experience bookings end-to-end
  - Trip CRUD with collaborative editing functional
  - Trust scoring active on reviews
  - Concierge app demo-ready
```

---

## Phase 3 -- Premium & Verticals (Weeks 12-15)

### Lane 14: Flight Service (A: Flights Agent)

```
3-FL-01   flight-service scaffold
    |
3-FL-02   IATA data model (airports, airlines, aircraft, routes)
    |
3-FL-03   NDC / aggregator adapter layer
    |
3-FL-04   Fare search + seat map display
    |
3-FL-05   Booking + ticketing integration
    |
   +--> [G4 prerequisite]
```

### Lane 15: Luxury & Experiences (A: Luxury Agent)

```
3-LX-01   luxury-service scaffold
    |
3-LX-02   Curated collections + editorial content model
    |
3-LX-03   Concierge-assisted booking (human-in-the-loop)
    |
3-LX-04   VIP perks engine (upgrades, early access, amenities)
    |
   +--> [G4 prerequisite]
```

### Lane 16: Insurance & Finance (A: Finance Agent)

```
3-FN-01   insurance-service scaffold
    |
3-FN-02   Policy quoting engine (trip cancellation, medical, baggage)
    |
3-FN-03   Claims intake workflow
     ||
3-FN-04   finance-service -- supplier payouts, reconciliation ledger
     ||
3-FN-05   Multi-currency pricing + FX rate sync
    |
   +--> [G4 prerequisite]
```

### Lane 17: Messaging & Notifications (A: Messaging Agent)

```
3-MS-01   messaging-service scaffold
    |
3-MS-02   Transactional email (booking confirm, itinerary, reminders)
    |
3-MS-03   Push notifications (mobile + web)
    |
3-MS-04   In-app notification center
    |
   +--> [G4 prerequisite]
```

### Lane 18: Admin Panel (A: Admin Agent)

```
3-AD-01   admin app scaffold (Next.js)
    |
3-AD-02   Entity management dashboard (CRUD all Travel Graph entities)
    |
3-AD-03   Order & booking management
    |
3-AD-04   Supplier onboarding + content review queue
    |
3-AD-05   Analytics dashboards (bookings, revenue, engagement)
    |
   +--> [G4 prerequisite]
```

### Gate G4 -- Full Feature Set

```
Criteria:
  - Flights searchable and bookable end-to-end
  - Insurance quotable and purchasable within trip flow
  - Luxury concierge flow functional
  - Notifications delivered across all channels
  - Admin panel operational for content management
```

---

## Phase 4 -- Scale & Polish (Weeks 16-18)

### Lane 19: Performance & Resilience (A: Platform Agent)

```
4-PE-01   Load testing (k6 scripts, baseline benchmarks)
    |
4-PE-02   Query optimization + connection pooling (PgBouncer)
    |
4-PE-03   Read replicas + cache warming strategies
    |
4-PE-04   Circuit breakers + retry policies for external APIs
    |
4-PE-05   CDN configuration + static asset optimization
```

### Lane 20: Security & Compliance (A: Security Agent)

```
4-SC-01   OWASP top-10 audit
    |
4-SC-02   PCI DSS scoping (Stripe Elements, no raw card data)
    |
4-SC-03   GDPR data flows -- consent, export, right-to-delete
    |
4-SC-04   SOC 2 control documentation
    |
4-SC-05   Penetration testing + remediation
```

### Lane 21: End-to-End QA (A: QA Agent)

```
4-QA-01   E2E test suite (Playwright) -- critical user journeys
    |
4-QA-02   Accessibility audit (WCAG 2.1 AA)
    |
4-QA-03   Cross-browser / cross-device testing matrix
    |
4-QA-04   Chaos engineering (failure injection)
    |
4-QA-05   UAT with beta testers
```

### Lane 22: Deployment & Launch (A: Infra Agent)

```
4-DP-01   Kubernetes manifests (Helm charts)
    |
4-DP-02   Blue-green deployment pipeline
    |
4-DP-03   Database migration automation (zero-downtime)
    |
4-DP-04   Runbook creation + on-call rotation setup
    |
4-DP-05   Launch checklist sign-off
```

---

## Agent Assignment Summary

| Agent ID | Agent Name | Primary Lanes | Key Responsibilities |
| -------- | ------------------ | ------------- | ------------------------------------------------ |
| A1 | Database Agent | 1 | Schema design, migrations, seed data, query perf |
| A2 | Platform Agent | 2, 19 | Shared packages, performance, resilience |
| A3 | Infra Agent | 3, 22 | Docker, Terraform, CI/CD, Kubernetes, deployment |
| A4 | Identity Agent | 4 | Auth, sessions, user profiles, verification |
| A5 | Graph Agent | 5 | Travel Graph service, entity CRUD, graph queries |
| A6 | Search Agent | 6 | Full-text search, facets, vector search |
| A7 | Commerce Agent | 7 | Cart, payments, orders, inventory holds |
| A8 | Frontend Agent | 8, 13 | Web app, concierge app, UI components |
| A9 | AI Agent | 9 | AI orchestrator, trip planner, re-ranking |
| A10 | Trip Agent | 10 | Trip model, itineraries, collaboration |
| A11 | Verticals Agent | 11 | Dining, stays, experiences vertical services |
| A12 | Trust Agent | 12 | Reviews, moderation, reputation |
| A13 | Flights Agent | 14 | Flight search, NDC, booking, ticketing |
| A14 | Luxury Agent | 15 | Curated content, VIP perks, concierge-assisted |
| A15 | Finance Agent | 16 | Insurance, payouts, multi-currency |
| A16 | Messaging Agent | 17 | Email, push, in-app notifications |
| A17 | Admin Agent | 18 | Admin panel, dashboards, supplier onboarding |
| A18 | Security Agent | 20 | OWASP, PCI, GDPR, SOC 2, pen testing |
| A19 | QA Agent | 21 | E2E tests, accessibility, chaos engineering |

---

## Dependency Graph (Cross-Lane)

```
1A-DB-02 ──┬──> 1B-TG-01 (Travel Graph service needs schema)
           ├──> 1B-SR-01 (Search service queries TG tables)
           ├──> 1B-CM-01 (Commerce reads products/inventory)
           └──> 2-VS-01..03 (Vertical services extend TG)

1A-DB-03 ──┬──> 1B-ID-01 (Identity service needs identity schema)
           └──> 1B-WEB-02 (Auth pages need identity endpoints)

1A-PKG-01 ──┬──> All services (shared types imported everywhere)
            └──> 1B-WEB-01 (web app uses shared types)

1A-PKG-02 ──┬──> 1B-CM-03 (commerce emits order events)
            └──> 3-MS-01 (messaging subscribes to events)

1B-ID-02 ────> 1B-WEB-02 (auth pages call identity API)

1B-TG-02 ──┬──> 1B-SR-02 (search indexes entity data)
           └──> 2-AI-02 (AI reads graph for trip planning)

1B-CM-04 ──┬──> 2-TR-03 (trip items reference orders)
           └──> 3-FN-04 (finance reconciles orders)

2-AI-05 ────> 2-CC-02 (concierge app streams from AI orchestrator)

2-TR-02 ────> 2-CC-04 (trip timeline displayed in concierge)

2-VS-01..03 ─> 2-TR-03 (trip items span dining/stay/experience)

3-FL-05 ────> 2-TR-03 (flight bookings become trip items)

3-FN-02 ────> 1B-CM-02 (insurance added to cart as product)
```

---

## Parallel Execution Matrix

```
Week  | Lane 1 | Lane 2 | Lane 3 | Lane 4 | Lane 5 | Lane 6 | Lane 7 | Lane 8 |
------+--------+--------+--------+--------+--------+--------+--------+--------+
 1    | DB-01  | PKG-01 | INF-01 |        |        |        |        |        |
 2    | DB-02  | PKG-02 | INF-02 |        |        |        |        |        |
      |        | PKG-03 | INF-03 |        |        |        |        |        |
 3    | DB-03  | PKG-04 | INF-04 |        |        |        |        |        |
      | DB-04  |        |        |        |        |        |        |        |
------+--------+--------+--------+--------+--------+--------+--------+--------+
      |  [G1]  |  [G1]  |  [G1]  |        |        |        |        |        |
------+--------+--------+--------+--------+--------+--------+--------+--------+
 4    |        |        |        | ID-01  | TG-01  | SR-01  | CM-01  | WEB-01 |
 5    |        |        |        | ID-02  | TG-02  | SR-02  | CM-02  | WEB-02 |
      |        |        |        |        | TG-03  |        |        | WEB-03 |
 6    |        |        |        | ID-03  | TG-04  | SR-03  | CM-03  | WEB-04 |
 7    |        |        |        | ID-04  | TG-05  | SR-04  | CM-04  | WEB-05 |
------+--------+--------+--------+--------+--------+--------+--------+--------+
      |        |        |        |  [G2]  |  [G2]  |  [G2]  |  [G2]  |  [G2]  |
------+--------+--------+--------+--------+--------+--------+--------+--------+

Week  | Lane 9 | Lane 10| Lane 11| Lane 12| Lane 13|
------+--------+--------+--------+--------+--------+
 8    | AI-01  | TR-01  | VS-01  | TS-01  | CC-01  |
 9    | AI-02  | TR-02  | VS-02  | TS-02  | CC-02  |
      |        |        | VS-03  |        |        |
10    | AI-03  | TR-03  | VS-04  | TS-03  | CC-03  |
      | AI-04  | TR-04  |        |        |        |
11    | AI-05  | TR-05  |        | TS-04  | CC-04  |
------+--------+--------+--------+--------+--------+
      |  [G3]  |  [G3]  |  [G3]  |  [G3]  |  [G3]  |
------+--------+--------+--------+--------+--------+

Week  | Lane 14| Lane 15| Lane 16| Lane 17| Lane 18|
------+--------+--------+--------+--------+--------+
12    | FL-01  | LX-01  | FN-01  | MS-01  | AD-01  |
13    | FL-02  | LX-02  | FN-02  | MS-02  | AD-02  |
      | FL-03  |        | FN-03  |        | AD-03  |
14    | FL-04  | LX-03  | FN-04  | MS-03  | AD-04  |
      |        |        | FN-05  |        |        |
15    | FL-05  | LX-04  |        | MS-04  | AD-05  |
------+--------+--------+--------+--------+--------+
      |  [G4]  |  [G4]  |  [G4]  |  [G4]  |  [G4]  |
------+--------+--------+--------+--------+--------+

Week  | Lane 19| Lane 20| Lane 21| Lane 22|
------+--------+--------+--------+--------+
16    | PE-01  | SC-01  | QA-01  | DP-01  |
17    | PE-02  | SC-02  | QA-02  | DP-02  |
      | PE-03  | SC-03  | QA-03  | DP-03  |
18    | PE-04  | SC-04  | QA-04  | DP-04  |
      | PE-05  | SC-05  | QA-05  | DP-05  |
------+--------+--------+--------+--------+
      |               LAUNCH               |
------+------------------------------------+
```

---

## Critical Path

The longest sequential chain determines the minimum timeline:

```
1A-DB-01 -> 1A-DB-02 -> 1A-DB-03 -> [G1]
  -> 1B-TG-01 -> 1B-TG-02 -> 1B-TG-05 -> [G2]
    -> 2-AI-01 -> 2-AI-02 -> 2-AI-05 -> [G3]
      -> 3-FL-01 -> 3-FL-05 -> [G4]
        -> 4-DP-01 -> 4-DP-05 -> LAUNCH
```

Estimated critical path duration: **18 weeks**

Any delay on this path delays launch. All other lanes have float and can absorb minor slips without affecting the overall timeline.
