import { getPool, query, transaction } from '@atlas/database';
import type { Pool, PoolClient } from '@atlas/database';

const pool: Pool = getPool();

// ── Cart Queries ─────────────────────────────────────────────────────

export async function findCartByUserId(userId: string) {
  const result = await query(
    pool,
    `SELECT * FROM commerce.commerce_cart WHERE user_id = $1 AND status = 'open'`,
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function createCart(userId: string, tripId?: string) {
  const result = await query(
    pool,
    `INSERT INTO commerce.commerce_cart (user_id, trip_id, status)
     VALUES ($1, $2, 'open')
     RETURNING *`,
    [userId, tripId ?? null],
  );
  return result.rows[0];
}

export async function findOrCreateCart(userId: string, tripId?: string) {
  const existing = await findCartByUserId(userId);
  if (existing) return existing;
  return createCart(userId, tripId);
}

export async function findCartItemsByCartId(cartId: string) {
  const result = await query(
    pool,
    `SELECT * FROM commerce.commerce_cart_item
     WHERE cart_id = $1
     ORDER BY created_at ASC`,
    [cartId],
  );
  return result.rows;
}

export async function findCartWithItems(userId: string) {
  const cart = await findCartByUserId(userId);
  if (!cart) return null;
  const items = await findCartItemsByCartId(cart.cart_id);
  return { ...cart, items };
}

export async function findCartItemByProductAndSlot(
  cartId: string,
  productId: string,
  slotId: string | null,
) {
  const result = await query(
    pool,
    `SELECT * FROM commerce.commerce_cart_item
     WHERE cart_id = $1
       AND product_id = $2
       AND COALESCE(slot_id, '00000000-0000-0000-0000-000000000000'::uuid) =
           COALESCE($3::uuid, '00000000-0000-0000-0000-000000000000'::uuid)`,
    [cartId, productId, slotId],
  );
  return result.rows[0] ?? null;
}

export async function insertCartItem(
  cartId: string,
  productId: string,
  slotId: string | null,
  quantity: number,
  price: number,
  currency: string,
) {
  const result = await query(
    pool,
    `INSERT INTO commerce.commerce_cart_item (cart_id, product_id, slot_id, quantity, price, currency)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [cartId, productId, slotId, quantity, price, currency],
  );
  return result.rows[0];
}

export async function updateCartItemQuantity(cartItemId: string, quantity: number) {
  const result = await query(
    pool,
    `UPDATE commerce.commerce_cart_item
     SET quantity = $2
     WHERE cart_item_id = $1
     RETURNING *`,
    [cartItemId, quantity],
  );
  return result.rows[0] ?? null;
}

export async function deleteCartItem(cartItemId: string) {
  const result = await query(
    pool,
    `DELETE FROM commerce.commerce_cart_item WHERE cart_item_id = $1 RETURNING *`,
    [cartItemId],
  );
  return result.rows[0] ?? null;
}

export async function findCartItemById(cartItemId: string) {
  const result = await query(
    pool,
    `SELECT ci.*, c.user_id
     FROM commerce.commerce_cart_item ci
     JOIN commerce.commerce_cart c ON c.cart_id = ci.cart_id
     WHERE ci.cart_item_id = $1`,
    [cartItemId],
  );
  return result.rows[0] ?? null;
}

export async function updateCartStatus(cartId: string, status: string) {
  const result = await query(
    pool,
    `UPDATE commerce.commerce_cart SET status = $2 WHERE cart_id = $1 RETURNING *`,
    [cartId, status],
  );
  return result.rows[0] ?? null;
}

// ── Order Queries ────────────────────────────────────────────────────

export async function findOrderById(id: string) {
  const result = await query(pool, 'SELECT * FROM commerce.commerce_order WHERE order_id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function findOrdersByUserId(
  userId: string,
  opts: { cursor?: string; limit: number; status?: string },
) {
  const params: unknown[] = [userId, opts.limit];
  let sql = `SELECT * FROM commerce.commerce_order WHERE user_id = $1`;

  let paramIdx = 3;

  if (opts.status) {
    sql += ` AND order_status = $${paramIdx}`;
    params.push(opts.status);
    paramIdx++;
  }

  if (opts.cursor) {
    sql += ` AND created_at < $${paramIdx}`;
    params.push(opts.cursor);
    paramIdx++;
  }

  sql += ` ORDER BY created_at DESC LIMIT $2`;

  const result = await query(pool, sql, params);
  return result.rows;
}

export async function createOrder(
  client: PoolClient,
  userId: string,
  tripId: string | null,
  totalAmount: number,
  currency: string,
  paymentIntentId?: string,
) {
  const result = await client.query(
    `INSERT INTO commerce.commerce_order
       (user_id, trip_id, order_status, total_amount, currency, payment_intent_id)
     VALUES ($1, $2, 'pending_payment', $3, $4, $5)
     RETURNING *`,
    [userId, tripId, totalAmount, currency, paymentIntentId ?? null],
  );
  return result.rows[0];
}

export async function findOrderWithReservations(orderId: string) {
  const order = await findOrderById(orderId);
  if (!order) return null;

  const reservations = await query(
    pool,
    `SELECT * FROM commerce.commerce_reservation WHERE order_id = $1 ORDER BY created_at ASC`,
    [orderId],
  );

  return { ...order, reservations: reservations.rows };
}

// ── Reservation Queries ──────────────────────────────────────────────

export async function findReservationById(id: string) {
  const result = await query(
    pool,
    'SELECT * FROM commerce.commerce_reservation WHERE reservation_id = $1',
    [id],
  );
  return result.rows[0] ?? null;
}

export async function findReservationsByUserId(
  userId: string,
  opts: {
    cursor?: string;
    limit: number;
    type?: string;
    status?: string;
    upcoming?: boolean;
  },
) {
  const params: unknown[] = [userId, opts.limit];
  let sql = `SELECT * FROM commerce.commerce_reservation WHERE user_id = $1`;

  let paramIdx = 3;

  if (opts.type) {
    sql += ` AND reservation_type = $${paramIdx}`;
    params.push(opts.type);
    paramIdx++;
  }

  if (opts.status) {
    sql += ` AND status = $${paramIdx}`;
    params.push(opts.status);
    paramIdx++;
  }

  if (opts.upcoming) {
    sql += ` AND start_at >= NOW()`;
  }

  if (opts.cursor) {
    sql += ` AND created_at < $${paramIdx}`;
    params.push(opts.cursor);
    paramIdx++;
  }

  sql += ` ORDER BY created_at DESC LIMIT $2`;

  const result = await query(pool, sql, params);
  return result.rows;
}

export async function createReservation(
  client: PoolClient,
  data: {
    order_id: string;
    user_id: string;
    trip_id: string | null;
    reservation_type: string;
    product_id: string;
    slot_id: string | null;
    price_paid: number;
    currency: string;
    status?: string;
  },
) {
  const result = await client.query(
    `INSERT INTO commerce.commerce_reservation
       (order_id, user_id, trip_id, reservation_type, product_id, slot_id,
        price_paid, currency, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      data.order_id,
      data.user_id,
      data.trip_id,
      data.reservation_type,
      data.product_id,
      data.slot_id,
      data.price_paid,
      data.currency,
      data.status ?? 'requested',
    ],
  );
  return result.rows[0];
}

export async function updateReservationStatus(reservationId: string, status: string) {
  const result = await query(
    pool,
    `UPDATE commerce.commerce_reservation SET status = $2 WHERE reservation_id = $1 RETURNING *`,
    [reservationId, status],
  );
  return result.rows[0] ?? null;
}

export async function findReservationWithAddons(reservationId: string) {
  const reservation = await findReservationById(reservationId);
  if (!reservation) return null;

  const addons = await query(
    pool,
    `SELECT * FROM commerce.commerce_protection_addon
     WHERE reservation_id = $1
     ORDER BY created_at ASC`,
    [reservationId],
  );

  return { ...reservation, protection_addons: addons.rows };
}

// ── Refund Queries ───────────────────────────────────────────────────

export async function createRefund(data: {
  reservation_id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  reason?: string;
}) {
  const result = await query(
    pool,
    `INSERT INTO commerce.commerce_refund
       (reservation_id, order_id, amount, currency, reason, status)
     VALUES ($1, $2, $3, $4, $5, 'requested')
     RETURNING *`,
    [data.reservation_id, data.order_id, data.amount, data.currency, data.reason ?? null],
  );
  return result.rows[0];
}

export async function findRefundsByUserId(userId: string) {
  const result = await query(
    pool,
    `SELECT r.*, res.reservation_type, res.product_id, res.status AS reservation_status
     FROM commerce.commerce_refund r
     JOIN commerce.commerce_reservation res ON res.reservation_id = r.reservation_id
     WHERE res.user_id = $1
     ORDER BY r.created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function findRefundByReservationId(reservationId: string) {
  const result = await query(
    pool,
    `SELECT * FROM commerce.commerce_refund WHERE reservation_id = $1 ORDER BY created_at DESC`,
    [reservationId],
  );
  return result.rows[0] ?? null;
}

// ── Checkout Transaction ─────────────────────────────────────────────

export async function findCartWithItemsByClient(client: PoolClient, cartId: string, userId: string) {
  const cartResult = await client.query(
    `SELECT * FROM commerce.commerce_cart
     WHERE cart_id = $1 AND user_id = $2 AND status = 'open'
     FOR UPDATE`,
    [cartId, userId],
  );
  const cart = cartResult.rows[0] ?? null;
  if (!cart) return null;

  const itemsResult = await client.query(
    `SELECT * FROM commerce.commerce_cart_item WHERE cart_id = $1 ORDER BY created_at ASC`,
    [cartId],
  );

  return { ...cart, items: itemsResult.rows };
}

export async function updateCartStatusByClient(client: PoolClient, cartId: string, status: string) {
  await client.query(
    `UPDATE commerce.commerce_cart SET status = $2 WHERE cart_id = $1`,
    [cartId, status],
  );
}

// ── Bundle Queries ──────────────────────────────────────────────

export interface SearchBundlesParams {
  destination_id?: string;
  bundle_type?: string;
  max_price?: number;
  limit: number;
  offset: number;
}

export async function searchBundles(params: SearchBundlesParams) {
  const conditions: string[] = [
    `b.status = 'active'`,
    `(b.valid_until IS NULL OR b.valid_until >= CURRENT_DATE)`,
    `(b.max_bookings IS NULL OR b.current_bookings < b.max_bookings)`,
  ];
  const values: unknown[] = [];
  let idx = 1;

  if (params.destination_id) {
    conditions.push(`b.destination_id = $${idx}`);
    values.push(params.destination_id);
    idx++;
  }

  if (params.bundle_type) {
    conditions.push(`b.bundle_type = $${idx}`);
    values.push(params.bundle_type);
    idx++;
  }

  if (params.max_price !== undefined) {
    conditions.push(`b.total_price_cents <= $${idx}`);
    values.push(params.max_price);
    idx++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total FROM commerce.commerce_bundle b ${whereClause}`,
    values,
  );
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT b.*,
            (b.original_price_cents - b.total_price_cents) AS savings_cents,
            CASE WHEN b.original_price_cents > 0
              THEN ROUND(((b.original_price_cents - b.total_price_cents)::numeric / b.original_price_cents) * 100, 1)
              ELSE 0
            END AS savings_percent
     FROM commerce.commerce_bundle b
     ${whereClause}
     ORDER BY b.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.limit, params.offset],
  );

  return { data: dataResult.rows, total };
}

export async function findBundleById(bundleId: string) {
  const result = await query(
    pool,
    `SELECT b.*,
            (b.original_price_cents - b.total_price_cents) AS savings_cents,
            CASE WHEN b.original_price_cents > 0
              THEN ROUND(((b.original_price_cents - b.total_price_cents)::numeric / b.original_price_cents) * 100, 1)
              ELSE 0
            END AS savings_percent
     FROM commerce.commerce_bundle b
     WHERE b.bundle_id = $1`,
    [bundleId],
  );
  return result.rows[0] ?? null;
}

export async function findBundleItems(bundleId: string) {
  const result = await query(
    pool,
    `SELECT * FROM commerce.commerce_bundle_item
     WHERE bundle_id = $1
     ORDER BY sort_order ASC`,
    [bundleId],
  );
  return result.rows;
}

export async function bookBundle(bundleId: string, userId: string) {
  return transaction(pool, async (client) => {
    // Lock and verify bundle
    const bundleResult = await client.query(
      `SELECT * FROM commerce.commerce_bundle
       WHERE bundle_id = $1
       FOR UPDATE`,
      [bundleId],
    );

    const bundle = bundleResult.rows[0];
    if (!bundle) {
      throw Object.assign(new Error('Bundle not found'), { statusCode: 404 });
    }

    if (bundle.status !== 'active') {
      throw Object.assign(new Error('This bundle is no longer active'), { statusCode: 409 });
    }

    if (bundle.valid_until && new Date(bundle.valid_until) < new Date()) {
      throw Object.assign(new Error('This bundle has expired'), { statusCode: 409 });
    }

    if (bundle.max_bookings && bundle.current_bookings >= bundle.max_bookings) {
      throw Object.assign(new Error('This bundle is sold out'), { statusCode: 409 });
    }

    // Increment booking count
    await client.query(
      `UPDATE commerce.commerce_bundle
       SET current_bookings = current_bookings + 1
       WHERE bundle_id = $1`,
      [bundleId],
    );

    // Create an order for the bundle
    const orderResult = await client.query(
      `INSERT INTO commerce.commerce_order
         (user_id, order_status, total_amount, currency, payment_intent_id)
       VALUES ($1, 'pending_payment', $2, $3, NULL)
       RETURNING *`,
      [userId, bundle.total_price_cents, bundle.currency],
    );
    const order = orderResult.rows[0];

    // Create a reservation for the bundle
    const resResult = await client.query(
      `INSERT INTO commerce.commerce_reservation
         (order_id, user_id, reservation_type, product_id,
          price_paid, currency, status, metadata)
       VALUES ($1, $2, 'ancillary', $3, $4, $5, 'requested',
               jsonb_build_object('bundle_type', $6::text, 'bundle_name', $7::text))
       RETURNING *`,
      [
        order.order_id,
        userId,
        bundleId,
        bundle.total_price_cents,
        bundle.currency,
        bundle.bundle_type,
        bundle.name,
      ],
    );

    return {
      order,
      reservation: resResult.rows[0],
      bundle: {
        bundle_id: bundleId,
        name: bundle.name,
        total_price_cents: bundle.total_price_cents,
        original_price_cents: bundle.original_price_cents,
        savings_cents: bundle.original_price_cents - bundle.total_price_cents,
        currency: bundle.currency,
      },
    };
  });
}

// ── Price Source Queries ─────────────────────────────────────────

export async function findAllPriceSources() {
  const result = await query(
    pool,
    `SELECT * FROM commerce.commerce_price_source
     WHERE is_active = TRUE
     ORDER BY sort_order ASC, name ASC`,
    [],
  );
  return result.rows;
}

// ── Price Comparison Queries ────────────────────────────────────

export interface FindPriceListingsParams {
  entityId: string;
  entityType?: string;
  limit: number;
  offset: number;
}

export async function findPriceListings(params: FindPriceListingsParams) {
  const conditions: string[] = [
    `pl.entity_id = $1`,
    `pl.availability != 'unavailable'`,
    `(pl.expires_at IS NULL OR pl.expires_at > NOW())`,
  ];
  const values: unknown[] = [params.entityId];
  let idx = 2;

  if (params.entityType) {
    conditions.push(`pl.entity_type = $${idx}`);
    values.push(params.entityType);
    idx++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total
     FROM commerce.commerce_price_listing pl
     ${whereClause}`,
    values,
  );
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT pl.*,
            ps.name AS source_name, ps.slug AS source_slug,
            ps.source_type, ps.logo_url AS source_logo,
            ps.website_url AS source_website,
            CASE WHEN pl.original_price_cents IS NOT NULL AND pl.original_price_cents > pl.price_cents
              THEN pl.original_price_cents - pl.price_cents
              ELSE 0
            END AS discount_cents
     FROM commerce.commerce_price_listing pl
     JOIN commerce.commerce_price_source ps ON ps.source_id = pl.source_id
     ${whereClause}
     ORDER BY pl.price_cents ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.limit, params.offset],
  );

  return { data: dataResult.rows, total };
}

export async function findBestPrice(entityId: string, entityType?: string) {
  const conditions: string[] = [
    `pl.entity_id = $1`,
    `pl.availability != 'unavailable'`,
    `(pl.expires_at IS NULL OR pl.expires_at > NOW())`,
  ];
  const values: unknown[] = [entityId];
  let idx = 2;

  if (entityType) {
    conditions.push(`pl.entity_type = $${idx}`);
    values.push(entityType);
    idx++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Best price
  const bestResult = await query(
    pool,
    `SELECT pl.*,
            ps.name AS source_name, ps.slug AS source_slug,
            ps.source_type, ps.logo_url AS source_logo,
            ps.website_url AS source_website
     FROM commerce.commerce_price_listing pl
     JOIN commerce.commerce_price_source ps ON ps.source_id = pl.source_id
     ${whereClause}
     ORDER BY pl.price_cents ASC
     LIMIT 1`,
    values,
  );

  const best = bestResult.rows[0] ?? null;

  // Also get the count and average for context
  const statsResult = await query(
    pool,
    `SELECT COUNT(*)::int AS listing_count,
            ROUND(AVG(pl.price_cents))::int AS avg_price_cents,
            MIN(pl.price_cents) AS min_price_cents,
            MAX(pl.price_cents) AS max_price_cents
     FROM commerce.commerce_price_listing pl
     ${whereClause}`,
    values,
  );

  const stats = statsResult.rows[0] ?? {
    listing_count: 0,
    avg_price_cents: 0,
    min_price_cents: 0,
    max_price_cents: 0,
  };

  return { best, stats };
}

// Re-export transaction helper for routes to use
export { transaction, getPool };
