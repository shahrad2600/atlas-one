-- ============================================================================
-- Migration 014: Outbox Schema
-- Atlas One - Enterprise AI-Powered Travel Super-Platform
--
-- Purpose: Transactional outbox pattern for reliable event publishing.
--          Guarantees at-least-once delivery of domain events to message
--          brokers (Kafka, SQS, etc.) without distributed transactions.
--          Events are written atomically with their source transaction, then
--          polled and published by a background worker. Failed events are
--          moved to a dead-letter table for manual investigation and replay.
--
-- Dependencies:
--   - 001 (assumed): uuid-ossp extension
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS outbox;

-- ============================================================================
-- outbox.event_outbox
-- ----------------------------------------------------------------------------
-- Transactional outbox table. Domain services write events here inside the
-- same database transaction that produces the state change, guaranteeing
-- atomicity. A polling worker reads pending events, publishes them to the
-- message broker, and marks them as published. Retry logic with exponential
-- backoff handles transient broker failures. Events that exceed max_retries
-- are moved to dead_letter status for manual intervention. The event_id
-- (UNIQUE) serves as the deduplication key on the consumer side.
--
-- Key fields:
--   - aggregate_type + aggregate_id: identifies the source domain object
--   - event_type: fully qualified event name (e.g. "flight.ticket.issued")
--   - schema_version: enables consumer-side schema evolution
--   - producer: name of the service that created the event
--   - trace_id: distributed tracing correlation
--   - tenant_id: multi-tenant isolation
-- ============================================================================
CREATE TABLE outbox.event_outbox (
    outbox_id      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id       UUID        NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
    event_type     TEXT        NOT NULL,
    schema_version INT         NOT NULL DEFAULT 1,
    aggregate_type TEXT        NOT NULL
                               CHECK (aggregate_type IN (
                                   'entity', 'trip', 'reservation', 'order',
                                   'dining', 'flight', 'insurance', 'finance',
                                   'trust', 'ai'
                               )),
    aggregate_id   UUID        NOT NULL,
    payload        JSONB       NOT NULL,
    producer       TEXT        NOT NULL,
    trace_id       TEXT,
    tenant_id      UUID,
    status         TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN (
                                   'pending', 'processing', 'published', 'failed', 'dead_letter'
                               )),
    retries        INT         NOT NULL DEFAULT 0,
    max_retries    INT         NOT NULL DEFAULT 5,
    last_error     TEXT,
    published_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE outbox.event_outbox IS
    'Transactional outbox for reliable at-least-once event delivery. Written atomically with domain state changes and polled by a publishing worker.';

-- Worker polling: "grab the next batch of pending events in FIFO order"
CREATE INDEX idx_event_outbox_status_created
    ON outbox.event_outbox (status, created_at);

-- Aggregate history: "show all events for a given domain object"
CREATE INDEX idx_event_outbox_aggregate
    ON outbox.event_outbox (aggregate_type, aggregate_id);

-- Event type filtering: consumer replay and analytics
CREATE INDEX idx_event_outbox_event_type
    ON outbox.event_outbox (event_type);

-- ============================================================================
-- outbox.event_dead_letter
-- ----------------------------------------------------------------------------
-- Dead-letter queue for events that exhausted retry attempts. Preserves the
-- full event payload and error details for debugging and manual reprocessing.
-- The reprocessed_at column is set when an operator manually replays the
-- event after fixing the underlying issue.
-- ============================================================================
CREATE TABLE outbox.event_dead_letter (
    dead_letter_id UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    outbox_id      UUID        NOT NULL
                               REFERENCES outbox.event_outbox (outbox_id),
    event_type     TEXT        NOT NULL,
    payload        JSONB       NOT NULL,
    error          TEXT        NOT NULL,
    failed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reprocessed_at TIMESTAMPTZ
);

COMMENT ON TABLE outbox.event_dead_letter IS
    'Dead-letter queue for events that exhausted retries. Supports manual investigation and replay after root cause fix.';

-- Primary query: "show failed events by type, newest first"
CREATE INDEX idx_event_dead_letter_type_failed
    ON outbox.event_dead_letter (event_type, failed_at);

COMMIT;
