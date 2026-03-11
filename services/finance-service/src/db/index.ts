import { getPool, query, transaction } from '@atlas/database';
import type { Pool, PoolClient } from '@atlas/database';

const pool: Pool = getPool();

// ════════════════════════════════════════════════════════════════════
// WALLET QUERIES
// ════════════════════════════════════════════════════════════════════

export async function findWalletByUserId(userId: string) {
  const result = await query(pool, 'SELECT * FROM fin.fin_wallet WHERE user_id = $1', [userId]);
  return result.rows[0] ?? null;
}

export async function createWallet(userId: string, currency: string = 'USD') {
  const result = await query(
    pool,
    `INSERT INTO fin.fin_wallet (user_id, currency)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO NOTHING
     RETURNING *`,
    [userId, currency],
  );
  // If ON CONFLICT hit, fetch the existing wallet
  if (result.rows.length === 0) {
    return findWalletByUserId(userId);
  }
  return result.rows[0];
}

export async function findOrCreateWallet(userId: string, currency: string = 'USD') {
  const existing = await findWalletByUserId(userId);
  if (existing) return existing;
  return createWallet(userId, currency);
}

export async function updateWalletBalance(
  client: PoolClient,
  walletId: string,
  availableDelta: number,
  heldDelta: number = 0,
) {
  const result = await client.query(
    `UPDATE fin.fin_wallet
     SET available_balance = available_balance + $2,
         held_balance = held_balance + $3,
         lifetime_earned = CASE WHEN $2 > 0 THEN lifetime_earned + $2 ELSE lifetime_earned END,
         lifetime_spent = CASE WHEN $2 < 0 THEN lifetime_spent + ABS($2) ELSE lifetime_spent END
     WHERE wallet_id = $1
     RETURNING *`,
    [walletId, availableDelta, heldDelta],
  );
  return result.rows[0] ?? null;
}

// ════════════════════════════════════════════════════════════════════
// LEDGER ENTRY QUERIES
// ════════════════════════════════════════════════════════════════════

export async function findLedgerEntries(walletId: string, limit: number = 50, offset: number = 0) {
  const result = await query(
    pool,
    `SELECT * FROM fin.fin_ledger_entry
     WHERE wallet_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [walletId, limit, offset],
  );
  return result.rows;
}

export async function countLedgerEntries(walletId: string, type?: string) {
  const params: unknown[] = [walletId];
  let sql = 'SELECT COUNT(*)::int AS total FROM fin.fin_ledger_entry WHERE wallet_id = $1';
  if (type) {
    sql += ' AND type = $2';
    params.push(type);
  }
  const result = await query(pool, sql, params);
  return result.rows[0]?.total ?? 0;
}

export async function findLedgerEntriesByType(
  walletId: string,
  type: string,
  limit: number = 50,
  offset: number = 0,
) {
  const result = await query(
    pool,
    `SELECT * FROM fin.fin_ledger_entry
     WHERE wallet_id = $1 AND type = $2
     ORDER BY created_at DESC
     LIMIT $3 OFFSET $4`,
    [walletId, type, limit, offset],
  );
  return result.rows;
}

export async function createLedgerEntry(
  client: PoolClient,
  entry: {
    wallet_id: string;
    type: string;
    amount: number;
    currency: string;
    running_balance: number;
    reference_type?: string;
    reference_id?: string;
    description?: string;
    metadata?: Record<string, unknown>;
    idempotency_key?: string;
  },
) {
  const result = await client.query(
    `INSERT INTO fin.fin_ledger_entry
       (wallet_id, type, amount, currency, running_balance,
        reference_type, reference_id, description, metadata, idempotency_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      entry.wallet_id,
      entry.type,
      entry.amount,
      entry.currency,
      entry.running_balance,
      entry.reference_type ?? null,
      entry.reference_id ?? null,
      entry.description ?? null,
      entry.metadata ? JSON.stringify(entry.metadata) : '{}',
      entry.idempotency_key ?? null,
    ],
  );
  return result.rows[0];
}

export async function findLedgerEntriesByReference(referenceType: string, referenceId: string) {
  const result = await query(
    pool,
    `SELECT * FROM fin.fin_ledger_entry
     WHERE reference_type = $1 AND reference_id = $2
     ORDER BY created_at DESC`,
    [referenceType, referenceId],
  );
  return result.rows;
}

// ════════════════════════════════════════════════════════════════════
// PRICE FREEZE CONTRACT QUERIES
// ════════════════════════════════════════════════════════════════════

export async function findPriceFreezeContract(userId: string, productId: string) {
  const result = await query(
    pool,
    `SELECT * FROM fin.fin_price_freeze_contract WHERE user_id = $1 AND offer_ref_id = $2 AND status = 'active'`,
    [userId, productId],
  );
  return result.rows[0] ?? null;
}

export async function findPriceFreezeById(freezeId: string) {
  const result = await query(
    pool,
    'SELECT * FROM fin.fin_price_freeze_contract WHERE freeze_id = $1',
    [freezeId],
  );
  return result.rows[0] ?? null;
}

export async function findPriceFreezesByUserId(userId: string, limit: number = 50, offset: number = 0) {
  const result = await query(
    pool,
    `SELECT * FROM fin.fin_price_freeze_contract
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );
  return result.rows;
}

export async function countPriceFreezesByUserId(userId: string) {
  const result = await query(
    pool,
    'SELECT COUNT(*)::int AS total FROM fin.fin_price_freeze_contract WHERE user_id = $1',
    [userId],
  );
  return result.rows[0]?.total ?? 0;
}

export async function createPriceFreezeContract(
  client: PoolClient,
  contract: {
    user_id: string;
    offer_type: string;
    offer_ref_id: string;
    offer_snapshot: Record<string, unknown>;
    fee: number;
    currency: string;
    locked_price: number;
    expires_at: string;
  },
) {
  const result = await client.query(
    `INSERT INTO fin.fin_price_freeze_contract
       (user_id, offer_type, offer_ref_id, offer_snapshot, fee, currency, locked_price, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      contract.user_id,
      contract.offer_type,
      contract.offer_ref_id,
      JSON.stringify(contract.offer_snapshot),
      contract.fee,
      contract.currency,
      contract.locked_price,
      contract.expires_at,
    ],
  );
  return result.rows[0];
}

export async function updatePriceFreezeStatus(
  client: PoolClient,
  freezeId: string,
  status: string,
  extra?: { exercised_at?: string; exercised_reservation_id?: string; current_market_price?: number },
) {
  const setClauses = ['status = $2'];
  const params: unknown[] = [freezeId, status];
  let paramIdx = 3;

  if (extra?.exercised_at) {
    setClauses.push(`exercised_at = $${paramIdx}`);
    params.push(extra.exercised_at);
    paramIdx++;
  }
  if (extra?.exercised_reservation_id) {
    setClauses.push(`exercised_reservation_id = $${paramIdx}`);
    params.push(extra.exercised_reservation_id);
    paramIdx++;
  }
  if (extra?.current_market_price !== undefined) {
    setClauses.push(`current_market_price = $${paramIdx}`);
    params.push(extra.current_market_price);
    paramIdx++;
  }

  const result = await client.query(
    `UPDATE fin.fin_price_freeze_contract
     SET ${setClauses.join(', ')}
     WHERE freeze_id = $1
     RETURNING *`,
    params,
  );
  return result.rows[0] ?? null;
}

// ════════════════════════════════════════════════════════════════════
// ESCROW QUERIES
// ════════════════════════════════════════════════════════════════════

export async function findEscrowById(id: string) {
  const result = await query(pool, 'SELECT * FROM fin.fin_escrow WHERE escrow_id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function findEscrowsByUserId(userId: string, limit: number = 50, offset: number = 0) {
  const result = await query(
    pool,
    `SELECT * FROM fin.fin_escrow
     WHERE payer_user_id = $1 OR payee_supplier_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );
  return result.rows;
}

export async function countEscrowsByUserId(userId: string) {
  const result = await query(
    pool,
    'SELECT COUNT(*)::int AS total FROM fin.fin_escrow WHERE payer_user_id = $1 OR payee_supplier_id = $1',
    [userId],
  );
  return result.rows[0]?.total ?? 0;
}

// ════════════════════════════════════════════════════════════════════
// PAYMENT QUERIES (ledger-based)
// ════════════════════════════════════════════════════════════════════

export async function findPaymentLedgerEntries(
  walletId: string,
  limit: number = 50,
  offset: number = 0,
) {
  const result = await query(
    pool,
    `SELECT * FROM fin.fin_ledger_entry
     WHERE wallet_id = $1 AND type IN ('credit', 'debit', 'refund', 'chargeback')
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [walletId, limit, offset],
  );
  return result.rows;
}

export async function countPaymentLedgerEntries(walletId: string) {
  const result = await query(
    pool,
    `SELECT COUNT(*)::int AS total FROM fin.fin_ledger_entry
     WHERE wallet_id = $1 AND type IN ('credit', 'debit', 'refund', 'chargeback')`,
    [walletId],
  );
  return result.rows[0]?.total ?? 0;
}

// ════════════════════════════════════════════════════════════════════
// PAYOUT QUERIES
// ════════════════════════════════════════════════════════════════════

export async function findPayoutsBySupplierId(supplierId: string, limit: number = 50, offset: number = 0) {
  const result = await query(
    pool,
    `SELECT * FROM fin.fin_payout
     WHERE supplier_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [supplierId, limit, offset],
  );
  return result.rows;
}

export async function countPayoutsBySupplierId(supplierId: string) {
  const result = await query(
    pool,
    'SELECT COUNT(*)::int AS total FROM fin.fin_payout WHERE supplier_id = $1',
    [supplierId],
  );
  return result.rows[0]?.total ?? 0;
}

// ════════════════════════════════════════════════════════════════════
// PAYMENT METHOD QUERIES (Stripe Integration)
// ════════════════════════════════════════════════════════════════════

export async function createPaymentMethod(params: {
  user_id: string;
  provider: string;
  provider_method_id: string;
  type: string;
  brand?: string;
  last_four?: string;
  exp_month?: number;
  exp_year?: number;
  is_default?: boolean;
  metadata?: Record<string, unknown>;
}) {
  // If setting as default, unset any existing default first
  if (params.is_default) {
    await query(
      pool,
      `UPDATE fin.fin_payment_method SET is_default = FALSE WHERE user_id = $1 AND is_default = TRUE`,
      [params.user_id],
    );
  }
  const result = await query(
    pool,
    `INSERT INTO fin.fin_payment_method
       (user_id, provider, provider_method_id, type, brand, last_four, exp_month, exp_year, is_default, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      params.user_id,
      params.provider,
      params.provider_method_id,
      params.type,
      params.brand ?? null,
      params.last_four ?? null,
      params.exp_month ?? null,
      params.exp_year ?? null,
      params.is_default ?? false,
      params.metadata ? JSON.stringify(params.metadata) : '{}',
    ],
  );
  return result.rows[0];
}

export async function findPaymentMethodsByUser(userId: string) {
  const result = await query(
    pool,
    `SELECT * FROM fin.fin_payment_method
     WHERE user_id = $1 AND status = 'active'
     ORDER BY is_default DESC, created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function findPaymentMethodById(methodId: string) {
  const result = await query(
    pool,
    'SELECT * FROM fin.fin_payment_method WHERE payment_method_id = $1',
    [methodId],
  );
  return result.rows[0] ?? null;
}

export async function setDefaultPaymentMethod(userId: string, methodId: string) {
  // Unset all defaults for this user
  await query(
    pool,
    `UPDATE fin.fin_payment_method SET is_default = FALSE WHERE user_id = $1 AND is_default = TRUE`,
    [userId],
  );
  // Set the new default
  const result = await query(
    pool,
    `UPDATE fin.fin_payment_method SET is_default = TRUE WHERE payment_method_id = $1 AND user_id = $2 RETURNING *`,
    [methodId, userId],
  );
  return result.rows[0] ?? null;
}

export async function removePaymentMethod(methodId: string, userId: string) {
  const result = await query(
    pool,
    `UPDATE fin.fin_payment_method SET status = 'removed' WHERE payment_method_id = $1 AND user_id = $2 RETURNING *`,
    [methodId, userId],
  );
  return result.rows[0] ?? null;
}

// ════════════════════════════════════════════════════════════════════
// PAYMENT INTENT QUERIES (Stripe Integration)
// ════════════════════════════════════════════════════════════════════

export async function createPaymentIntent(params: {
  user_id: string;
  provider_intent_id?: string;
  order_id?: string;
  reservation_id?: string;
  amount_cents: number;
  currency: string;
  status: string;
  payment_method_id?: string;
  client_secret?: string;
  capture_method?: string;
  metadata?: Record<string, unknown>;
}) {
  const result = await query(
    pool,
    `INSERT INTO fin.fin_payment_intent
       (user_id, provider_intent_id, order_id, reservation_id, amount_cents, currency,
        status, payment_method_id, client_secret, capture_method, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      params.user_id,
      params.provider_intent_id ?? null,
      params.order_id ?? null,
      params.reservation_id ?? null,
      params.amount_cents,
      params.currency,
      params.status,
      params.payment_method_id ?? null,
      params.client_secret ?? null,
      params.capture_method ?? 'automatic',
      params.metadata ? JSON.stringify(params.metadata) : '{}',
    ],
  );
  return result.rows[0];
}

export async function findPaymentIntentById(intentId: string) {
  const result = await query(
    pool,
    'SELECT * FROM fin.fin_payment_intent WHERE intent_id = $1',
    [intentId],
  );
  return result.rows[0] ?? null;
}

export async function findPaymentIntentByProvider(providerIntentId: string) {
  const result = await query(
    pool,
    'SELECT * FROM fin.fin_payment_intent WHERE provider_intent_id = $1',
    [providerIntentId],
  );
  return result.rows[0] ?? null;
}

export async function updatePaymentIntentStatus(
  intentId: string,
  status: string,
  extra?: {
    error_code?: string;
    error_message?: string;
    receipt_url?: string;
    refunded_amount_cents?: number;
    provider_intent_id?: string;
  },
) {
  const setClauses = ['status = $2'];
  const params: unknown[] = [intentId, status];
  let paramIdx = 3;

  if (extra?.error_code !== undefined) {
    setClauses.push(`error_code = $${paramIdx}`);
    params.push(extra.error_code);
    paramIdx++;
  }
  if (extra?.error_message !== undefined) {
    setClauses.push(`error_message = $${paramIdx}`);
    params.push(extra.error_message);
    paramIdx++;
  }
  if (extra?.receipt_url !== undefined) {
    setClauses.push(`receipt_url = $${paramIdx}`);
    params.push(extra.receipt_url);
    paramIdx++;
  }
  if (extra?.refunded_amount_cents !== undefined) {
    setClauses.push(`refunded_amount_cents = $${paramIdx}`);
    params.push(extra.refunded_amount_cents);
    paramIdx++;
  }
  if (extra?.provider_intent_id !== undefined) {
    setClauses.push(`provider_intent_id = $${paramIdx}`);
    params.push(extra.provider_intent_id);
    paramIdx++;
  }

  const result = await query(
    pool,
    `UPDATE fin.fin_payment_intent SET ${setClauses.join(', ')} WHERE intent_id = $1 RETURNING *`,
    params,
  );
  return result.rows[0] ?? null;
}

export async function findPaymentIntentsByUser(userId: string, limit: number = 50, offset: number = 0) {
  const result = await query(
    pool,
    `SELECT * FROM fin.fin_payment_intent
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );
  return result.rows;
}

export async function countPaymentIntentsByUser(userId: string) {
  const result = await query(
    pool,
    'SELECT COUNT(*)::int AS total FROM fin.fin_payment_intent WHERE user_id = $1',
    [userId],
  );
  return result.rows[0]?.total ?? 0;
}

// ════════════════════════════════════════════════════════════════════
// REFUND QUERIES (Stripe Integration)
// ════════════════════════════════════════════════════════════════════

export async function createRefund(params: {
  intent_id: string;
  provider_refund_id?: string;
  amount_cents: number;
  reason?: string;
  status?: string;
}) {
  const result = await query(
    pool,
    `INSERT INTO fin.fin_refund (intent_id, provider_refund_id, amount_cents, reason, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      params.intent_id,
      params.provider_refund_id ?? null,
      params.amount_cents,
      params.reason ?? null,
      params.status ?? 'pending',
    ],
  );
  return result.rows[0];
}

export async function findRefundsByIntent(intentId: string) {
  const result = await query(
    pool,
    'SELECT * FROM fin.fin_refund WHERE intent_id = $1 ORDER BY created_at DESC',
    [intentId],
  );
  return result.rows;
}

export async function findRefundById(refundId: string) {
  const result = await query(
    pool,
    'SELECT * FROM fin.fin_refund WHERE refund_id = $1',
    [refundId],
  );
  return result.rows[0] ?? null;
}

export async function updateRefundStatus(refundId: string, status: string, providerRefundId?: string) {
  const setClauses = ['status = $2'];
  const params: unknown[] = [refundId, status];
  if (providerRefundId) {
    setClauses.push('provider_refund_id = $3');
    params.push(providerRefundId);
  }
  const result = await query(
    pool,
    `UPDATE fin.fin_refund SET ${setClauses.join(', ')} WHERE refund_id = $1 RETURNING *`,
    params,
  );
  return result.rows[0] ?? null;
}

// ════════════════════════════════════════════════════════════════════
// STRIPE PAYOUT QUERIES
// ════════════════════════════════════════════════════════════════════

export async function createStripePayout(params: {
  user_id: string;
  provider_payout_id?: string;
  amount_cents: number;
  currency: string;
  destination_type?: string;
  destination_id?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}) {
  const result = await query(
    pool,
    `INSERT INTO fin.fin_payout_stripe
       (user_id, provider_payout_id, amount_cents, currency, destination_type, destination_id, description, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      params.user_id,
      params.provider_payout_id ?? null,
      params.amount_cents,
      params.currency,
      params.destination_type ?? null,
      params.destination_id ?? null,
      params.description ?? null,
      params.metadata ? JSON.stringify(params.metadata) : '{}',
    ],
  );
  return result.rows[0];
}

export async function findStripePayoutsByUser(userId: string, limit: number = 50, offset: number = 0) {
  const result = await query(
    pool,
    `SELECT * FROM fin.fin_payout_stripe
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );
  return result.rows;
}

export async function countStripePayoutsByUser(userId: string) {
  const result = await query(
    pool,
    'SELECT COUNT(*)::int AS total FROM fin.fin_payout_stripe WHERE user_id = $1',
    [userId],
  );
  return result.rows[0]?.total ?? 0;
}

export async function updateStripePayoutStatus(payoutId: string, status: string, arrivalDate?: string) {
  const setClauses = ['status = $2'];
  const params: unknown[] = [payoutId, status];
  if (arrivalDate) {
    setClauses.push('arrival_date = $3');
    params.push(arrivalDate);
  }
  const result = await query(
    pool,
    `UPDATE fin.fin_payout_stripe SET ${setClauses.join(', ')} WHERE payout_id = $1 RETURNING *`,
    params,
  );
  return result.rows[0] ?? null;
}

// ════════════════════════════════════════════════════════════════════
// WEBHOOK EVENT QUERIES (Stripe deduplication)
// ════════════════════════════════════════════════════════════════════

export async function recordWebhookEvent(params: {
  provider_event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
}) {
  const result = await query(
    pool,
    `INSERT INTO fin.fin_webhook_event (provider_event_id, event_type, payload)
     VALUES ($1, $2, $3)
     ON CONFLICT (provider_event_id) DO NOTHING
     RETURNING *`,
    [params.provider_event_id, params.event_type, JSON.stringify(params.payload)],
  );
  return result.rows[0] ?? null;
}

export async function isWebhookProcessed(providerEventId: string): Promise<boolean> {
  const result = await query(
    pool,
    'SELECT processed FROM fin.fin_webhook_event WHERE provider_event_id = $1',
    [providerEventId],
  );
  if (result.rows.length === 0) return false;
  return result.rows[0].processed === true;
}

export async function markWebhookProcessed(providerEventId: string, errorMessage?: string) {
  const result = await query(
    pool,
    `UPDATE fin.fin_webhook_event
     SET processed = TRUE, processed_at = NOW(), error_message = $2
     WHERE provider_event_id = $1
     RETURNING *`,
    [providerEventId, errorMessage ?? null],
  );
  return result.rows[0] ?? null;
}

// ════════════════════════════════════════════════════════════════════
// Re-exports for convenience
// ════════════════════════════════════════════════════════════════════

export { getPool, transaction };
