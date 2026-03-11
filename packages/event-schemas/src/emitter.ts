/**
 * Atlas One — Event Emitter (Outbox Pattern)
 *
 * Events are written to the outbox.event_outbox table within the same
 * transaction as the business operation. A separate poller/CDC process
 * reads the outbox and publishes to Kafka/Redis Streams.
 *
 * This guarantees at-least-once delivery with no dual-write problem.
 */

import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import type { AtlasEventEnvelope, AtlasEventType, AtlasEventPayloadMap } from './index.js';

// ─── Types ──────────────────────────────────────────────────────────

export interface EmitOptions {
  /** Database client (within a transaction) */
  client: PoolClient;
  /** Distributed tracing ID */
  traceId?: string;
  /** Correlation ID linking related events */
  correlationId?: string;
  /** Tenant UUID for multi-tenant isolation */
  tenantId?: string;
  /** Idempotency key to prevent duplicate events */
  idempotencyKey?: string;
}

export interface EventEmitterConfig {
  /** Name of the producing service */
  serviceName: string;
  /** Schema version for all events (default: 1) */
  schemaVersion?: number;
}

// ─── Event Factory ──────────────────────────────────────────────────

export function createEventEnvelope<T extends AtlasEventType>(
  eventType: T,
  payload: AtlasEventPayloadMap[T],
  producer: string,
  options?: Partial<EmitOptions & { schemaVersion: number }>,
): AtlasEventEnvelope<AtlasEventPayloadMap[T]> {
  return {
    event_id: randomUUID(),
    event_type: eventType,
    schema_version: options?.schemaVersion ?? 1,
    occurred_at: new Date().toISOString(),
    producer,
    trace_id: options?.traceId,
    correlation_id: options?.correlationId,
    tenant_id: options?.tenantId ?? null,
    payload,
  };
}

// ─── Outbox Writer ──────────────────────────────────────────────────

const INSERT_OUTBOX_SQL = `
  INSERT INTO outbox.event_outbox (
    id, event_type, aggregate_id, aggregate_type,
    payload, idempotency_key, trace_id, status,
    created_at
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id
`;

/**
 * Writes an event to the outbox table within the caller's transaction.
 * MUST be called inside a BEGIN/COMMIT block to guarantee atomicity
 * with the business operation.
 *
 * @example
 * ```ts
 * await transaction(pool, async (client) => {
 *   // Business operation
 *   await client.query('INSERT INTO dining.dining_slot ...');
 *
 *   // Emit event in same transaction
 *   await emitEvent(client, 'commerce.reservation.confirmed', payload, {
 *     aggregateId: reservationId,
 *     aggregateType: 'reservation',
 *   });
 * });
 * ```
 */
export async function emitEvent<T extends AtlasEventType>(
  client: PoolClient,
  eventType: T,
  payload: AtlasEventPayloadMap[T],
  options: {
    aggregateId: string;
    aggregateType: string;
    producer: string;
    traceId?: string;
    correlationId?: string;
    tenantId?: string;
    idempotencyKey?: string;
  },
): Promise<string | null> {
  const eventId = randomUUID();
  const idempotencyKey = options.idempotencyKey ?? `${eventType}:${options.aggregateId}:${eventId}`;

  const envelope = createEventEnvelope(eventType, payload, options.producer, {
    traceId: options.traceId,
    correlationId: options.correlationId,
    tenantId: options.tenantId,
  });

  const result = await client.query(INSERT_OUTBOX_SQL, [
    envelope.event_id,
    eventType,
    options.aggregateId,
    options.aggregateType,
    JSON.stringify(envelope),
    idempotencyKey,
    options.traceId ?? null,
  ]);

  // Returns null if idempotency key already existed (duplicate)
  return result.rows[0]?.id ?? null;
}

// ─── Event Emitter Class ────────────────────────────────────────────

/**
 * Stateful event emitter bound to a specific service.
 * Provides a convenient interface for services to emit events.
 */
export class AtlasEventEmitter {
  private readonly serviceName: string;
  private readonly schemaVersion: number;

  constructor(config: EventEmitterConfig) {
    this.serviceName = config.serviceName;
    this.schemaVersion = config.schemaVersion ?? 1;
  }

  /**
   * Emit an event within a transaction.
   */
  async emit<T extends AtlasEventType>(
    client: PoolClient,
    eventType: T,
    payload: AtlasEventPayloadMap[T],
    meta: {
      aggregateId: string;
      aggregateType: string;
      traceId?: string;
      correlationId?: string;
      tenantId?: string;
      idempotencyKey?: string;
    },
  ): Promise<string | null> {
    return emitEvent(client, eventType, payload, {
      ...meta,
      producer: this.serviceName,
    });
  }
}

// ─── Outbox Poller (for cron/worker process) ────────────────────────

const POLL_OUTBOX_SQL = `
  UPDATE outbox.event_outbox
  SET status = 'processing', processed_at = NOW()
  WHERE id IN (
    SELECT id FROM outbox.event_outbox
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT $1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *
`;

const MARK_PUBLISHED_SQL = `
  UPDATE outbox.event_outbox
  SET status = 'published', processed_at = NOW()
  WHERE id = $1
`;

const MARK_FAILED_SQL = `
  UPDATE outbox.event_outbox
  SET status = CASE WHEN retry_count >= max_retries THEN 'dead_letter' ELSE 'pending' END,
      retry_count = retry_count + 1,
      last_error = $2,
      next_retry_at = NOW() + INTERVAL '1 minute' * POWER(2, retry_count)
  WHERE id = $1
`;

export interface OutboxMessage {
  id: string;
  event_type: string;
  aggregate_id: string;
  aggregate_type: string;
  payload: string;
  trace_id: string | null;
  created_at: string;
  retry_count: number;
}

/**
 * Poll the outbox for pending events and process them.
 * Call this from a worker process or scheduled job.
 *
 * @param pool - Database pool
 * @param publishFn - Function that publishes to Kafka/Redis Streams
 * @param batchSize - Number of events to process per poll (default: 50)
 */
export async function pollOutbox(
  pool: import('pg').Pool,
  publishFn: (message: OutboxMessage) => Promise<void>,
  batchSize: number = 50,
): Promise<number> {
  const client = await pool.connect();
  let processed = 0;

  try {
    const result = await client.query(POLL_OUTBOX_SQL, [batchSize]);

    for (const row of result.rows) {
      try {
        await publishFn(row as OutboxMessage);
        await client.query(MARK_PUBLISHED_SQL, [row.id]);
        processed++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        await client.query(MARK_FAILED_SQL, [row.id, errorMsg]);
      }
    }
  } finally {
    client.release();
  }

  return processed;
}
