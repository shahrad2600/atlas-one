import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  z,
  addToCartSchema,
  createOrderSchema,
  paginationSchema,
  uuidSchema,
  validateBody,
  validateParams,
  validateQuery,
} from '@atlas/validation';
import {
  findOrCreateCart,
  findCartWithItems,
  findCartItemByProductAndSlot,
  insertCartItem,
  updateCartItemQuantity,
  deleteCartItem,
  findCartItemById,
  findCartItemsByCartId,
  findOrdersByUserId,
  findOrderWithReservations,
  findReservationById,
  findReservationsByUserId,
  findReservationWithAddons,
  updateReservationStatus,
  createRefund,
  findRefundsByUserId,
  findRefundByReservationId,
  findCartWithItemsByClient,
  updateCartStatusByClient,
  createOrder,
  createReservation,
  transaction,
  getPool,
  searchBundles,
  findBundleById,
  findBundleItems,
  bookBundle,
  findAllPriceSources,
  findPriceListings,
  findBestPrice,
} from '../db/index.js';

// ── Param / Query Schemas ────────────────────────────────────────────

const itemIdParamsSchema = z.object({
  itemId: uuidSchema,
});

const orderIdParamsSchema = z.object({
  orderId: uuidSchema,
});

const reservationIdParamsSchema = z.object({
  reservationId: uuidSchema,
});

const updateCartItemBodySchema = z.object({
  quantity: z.number().int().positive(),
});

const ordersQuerySchema = paginationSchema.extend({
  status: z.enum([
    'pending_payment', 'paid', 'partially_refunded',
    'refunded', 'failed', 'cancelled',
  ]).optional(),
});

const reservationsQuerySchema = paginationSchema.extend({
  type: z.enum([
    'dining', 'experience', 'stay', 'rental',
    'cruise', 'flight', 'insurance', 'ancillary',
  ]).optional(),
  status: z.enum([
    'requested', 'confirmed', 'cancelled',
    'completed', 'failed', 'modified',
  ]).optional(),
  upcoming: z.coerce.boolean().optional(),
});

// ── Bundle & Price Comparison Schemas ─────────────────────────────────

const bundleIdParamsSchema = z.object({
  bundleId: uuidSchema,
});

const entityIdParamsSchema = z.object({
  entityId: uuidSchema,
});

const searchBundlesQuerySchema = z.object({
  destination_id: uuidSchema.optional(),
  bundle_type: z.enum(['flight_hotel', 'hotel_experience', 'full_package', 'custom']).optional(),
  max_price: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const priceCompareQuerySchema = z.object({
  entity_type: z.enum(['hotel', 'flight', 'rental_car', 'cruise', 'experience']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const bestPriceQuerySchema = z.object({
  entity_type: z.enum(['hotel', 'flight', 'rental_car', 'cruise', 'experience']).optional(),
});

const refundBodySchema = z.object({
  reason: z.string().max(1000).optional(),
});

// ── Body / Row Types (explicit for cross-rootDir safety) ─────────────

interface AddToCartBody {
  product_id: string;
  quantity: number;
  variant_id?: string;
  price_amount: number;
  currency: string;
}

interface CreateOrderBody {
  cart_id: string;
  payment_method_id: string;
  billing_address?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
}

// ── Helper: get authenticated user ID ────────────────────────────────

function getUserId(request: FastifyRequest): string {
  const user = request.user;
  if (!user?.sub) {
    throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
  }
  return user.sub;
}

// ── Route Registration ───────────────────────────────────────────────

export async function registerRoutes(server: FastifyInstance): Promise<void> {

  // ── Status (public) ────────────────────────────────────────────────
  server.get('/api/v1/commerce/status', async () => ({
    service: 'commerce-service',
    routes: [
      'cart', 'orders', 'reservations', 'refunds',
      'bundles', 'price-compare', 'price-sources',
    ],
  }));

  // ════════════════════════════════════════════════════════════════════
  // CART ROUTES
  // ════════════════════════════════════════════════════════════════════

  // GET /api/v1/commerce/cart — Get user's active cart
  server.get('/api/v1/commerce/cart', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);

    const cartWithItems = await findCartWithItems(userId);

    if (!cartWithItems) {
      // Return an empty cart representation instead of 404
      const newCart = await findOrCreateCart(userId);
      return reply.send({
        ...newCart,
        items: [],
      });
    }

    return reply.send(cartWithItems);
  });

  // POST /api/v1/commerce/cart/items — Add item to cart
  server.post(
    '/api/v1/commerce/cart/items',
    { preValidation: validateBody(addToCartSchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const body = request.body as AddToCartBody;

      // Find or create an open cart for this user
      const cart = await findOrCreateCart(userId);

      // Check if product+slot combo already exists in the cart
      const existingItem = await findCartItemByProductAndSlot(
        cart.cart_id,
        body.product_id,
        body.variant_id ?? null,
      );

      if (existingItem) {
        // Update quantity by adding to existing
        const newQuantity = existingItem.quantity + body.quantity;
        const updatedItem = await updateCartItemQuantity(existingItem.cart_item_id, newQuantity);

        const items = await findCartItemsByCartId(cart.cart_id);
        return reply.code(201).send({
          ...cart,
          items,
          updated_item: updatedItem,
        });
      }

      // Insert new cart item
      await insertCartItem(
        cart.cart_id,
        body.product_id,
        body.variant_id ?? null,
        body.quantity,
        body.price_amount,
        body.currency,
      );

      const items = await findCartItemsByCartId(cart.cart_id);
      return reply.code(201).send({
        ...cart,
        items,
      });
    },
  );

  // PATCH /api/v1/commerce/cart/items/:itemId — Update cart item quantity
  server.patch(
    '/api/v1/commerce/cart/items/:itemId',
    {
      preValidation: [
        validateParams(itemIdParamsSchema),
        validateBody(updateCartItemBodySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { itemId } = request.params as z.infer<typeof itemIdParamsSchema>;
      const { quantity } = request.body as z.infer<typeof updateCartItemBodySchema>;

      // Find the cart item and verify ownership
      const cartItem = await findCartItemById(itemId);
      if (!cartItem) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Cart item not found' },
        });
      }

      if (cartItem.user_id !== userId) {
        return reply.code(403).send({
          error: { code: 'FORBIDDEN', message: 'You do not own this cart item' },
        });
      }

      const updatedItem = await updateCartItemQuantity(itemId, quantity);
      return reply.send(updatedItem);
    },
  );

  // DELETE /api/v1/commerce/cart/items/:itemId — Remove item from cart
  server.delete(
    '/api/v1/commerce/cart/items/:itemId',
    { preValidation: validateParams(itemIdParamsSchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { itemId } = request.params as z.infer<typeof itemIdParamsSchema>;

      // Find the cart item and verify ownership
      const cartItem = await findCartItemById(itemId);
      if (!cartItem) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Cart item not found' },
        });
      }

      if (cartItem.user_id !== userId) {
        return reply.code(403).send({
          error: { code: 'FORBIDDEN', message: 'You do not own this cart item' },
        });
      }

      await deleteCartItem(itemId);
      return reply.code(204).send();
    },
  );

  // ════════════════════════════════════════════════════════════════════
  // CHECKOUT / ORDER ROUTES
  // ════════════════════════════════════════════════════════════════════

  // POST /api/v1/commerce/checkout — Create order from cart
  server.post(
    '/api/v1/commerce/checkout',
    { preValidation: validateBody(createOrderSchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const body = request.body as CreateOrderBody;

      const pool = getPool();

      const result = await transaction(pool, async (client) => {
        // a. Find the open cart with items (with row lock)
        const cart = await findCartWithItemsByClient(client, body.cart_id, userId);

        if (!cart) {
          throw Object.assign(
            new Error('No open cart found with the given ID'),
            { statusCode: 404 },
          );
        }

        if (cart.items.length === 0) {
          throw Object.assign(
            new Error('Cart is empty'),
            { statusCode: 400 },
          );
        }

        // b. Calculate total from cart items
        const totalAmount = cart.items.reduce(
          (sum: number, item: { price: string | number; quantity: number }) =>
            sum + Number(item.price) * item.quantity,
          0,
        );
        const currency = cart.items[0].currency;

        // c. Create the order (pending_payment)
        const order = await createOrder(
          client,
          userId,
          cart.trip_id,
          totalAmount,
          currency,
          body.payment_method_id,
        );

        // d. Create a reservation for each cart item
        const reservations = [];
        for (const item of cart.items) {
          const reservation = await createReservation(client, {
            order_id: order.order_id,
            user_id: userId,
            trip_id: cart.trip_id,
            reservation_type: ((item.metadata as Record<string, string> | undefined) ?? {})['reservation_type'] ?? 'ancillary',
            product_id: item.product_id,
            slot_id: item.slot_id,
            price_paid: Number(item.price) * item.quantity,
            currency: item.currency,
            status: 'requested',
          });
          reservations.push(reservation);
        }

        // e. Mark cart as submitted
        await updateCartStatusByClient(client, cart.cart_id, 'submitted');

        return { order, reservations };
      });

      return reply.code(201).send(result);
    },
  );

  // GET /api/v1/commerce/orders — List user's orders (paginated)
  server.get(
    '/api/v1/commerce/orders',
    { preValidation: validateQuery(ordersQuerySchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const q = request.query as z.infer<typeof ordersQuerySchema>;

      const limit = q.limit ?? 20;
      // Fetch one extra to determine if there's a next page
      const orders = await findOrdersByUserId(userId, {
        cursor: q.cursor,
        limit: limit + 1,
        status: q.status,
      });

      const hasMore = orders.length > limit;
      const data = hasMore ? orders.slice(0, limit) : orders;
      const nextCursor = hasMore ? data[data.length - 1].created_at : null;

      return reply.send({
        data,
        cursor: {
          next: nextCursor,
          prev: null,
        },
        total: data.length,
      });
    },
  );

  // GET /api/v1/commerce/orders/:orderId — Get order details
  server.get(
    '/api/v1/commerce/orders/:orderId',
    { preValidation: validateParams(orderIdParamsSchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { orderId } = request.params as z.infer<typeof orderIdParamsSchema>;

      const order = await findOrderWithReservations(orderId);

      if (!order) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Order not found' },
        });
      }

      if (order.user_id !== userId) {
        return reply.code(403).send({
          error: { code: 'FORBIDDEN', message: 'You do not own this order' },
        });
      }

      return reply.send(order);
    },
  );

  // ════════════════════════════════════════════════════════════════════
  // RESERVATION ROUTES
  // ════════════════════════════════════════════════════════════════════

  // GET /api/v1/commerce/reservations — List user's reservations
  server.get(
    '/api/v1/commerce/reservations',
    { preValidation: validateQuery(reservationsQuerySchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const q = request.query as z.infer<typeof reservationsQuerySchema>;

      const limit = q.limit ?? 20;
      const reservations = await findReservationsByUserId(userId, {
        cursor: q.cursor,
        limit: limit + 1,
        type: q.type,
        status: q.status,
        upcoming: q.upcoming,
      });

      const hasMore = reservations.length > limit;
      const data = hasMore ? reservations.slice(0, limit) : reservations;
      const nextCursor = hasMore ? data[data.length - 1].created_at : null;

      return reply.send({
        data,
        cursor: {
          next: nextCursor,
          prev: null,
        },
        total: data.length,
      });
    },
  );

  // GET /api/v1/commerce/reservations/:reservationId — Get reservation details
  server.get(
    '/api/v1/commerce/reservations/:reservationId',
    { preValidation: validateParams(reservationIdParamsSchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { reservationId } = request.params as z.infer<typeof reservationIdParamsSchema>;

      const reservation = await findReservationWithAddons(reservationId);

      if (!reservation) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Reservation not found' },
        });
      }

      if (reservation.user_id !== userId) {
        return reply.code(403).send({
          error: { code: 'FORBIDDEN', message: 'You do not own this reservation' },
        });
      }

      return reply.send(reservation);
    },
  );

  // POST /api/v1/commerce/reservations/:reservationId/cancel — Cancel reservation
  server.post(
    '/api/v1/commerce/reservations/:reservationId/cancel',
    { preValidation: validateParams(reservationIdParamsSchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { reservationId } = request.params as z.infer<typeof reservationIdParamsSchema>;

      const reservation = await findReservationById(reservationId);

      if (!reservation) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Reservation not found' },
        });
      }

      if (reservation.user_id !== userId) {
        return reply.code(403).send({
          error: { code: 'FORBIDDEN', message: 'You do not own this reservation' },
        });
      }

      // Basic cancellation policy check: only requested or confirmed reservations can be cancelled
      const cancellableStatuses = ['requested', 'confirmed'];
      if (!cancellableStatuses.includes(reservation.status)) {
        return reply.code(409).send({
          error: {
            code: 'CANCELLATION_NOT_ALLOWED',
            message: `Reservation with status '${reservation.status}' cannot be cancelled. Only reservations with status 'requested' or 'confirmed' can be cancelled.`,
          },
        });
      }

      // Check if start_at is in the past (cannot cancel past reservations)
      if (reservation.start_at && new Date(reservation.start_at) < new Date()) {
        return reply.code(409).send({
          error: {
            code: 'CANCELLATION_NOT_ALLOWED',
            message: 'Cannot cancel a reservation that has already started or passed.',
          },
        });
      }

      const updated = await updateReservationStatus(reservationId, 'cancelled');
      return reply.send(updated);
    },
  );

  // ════════════════════════════════════════════════════════════════════
  // REFUND ROUTES
  // ════════════════════════════════════════════════════════════════════

  // POST /api/v1/commerce/reservations/:reservationId/refund — Request refund
  server.post(
    '/api/v1/commerce/reservations/:reservationId/refund',
    {
      preValidation: [
        validateParams(reservationIdParamsSchema),
        validateBody(refundBodySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { reservationId } = request.params as z.infer<typeof reservationIdParamsSchema>;
      const body = request.body as z.infer<typeof refundBodySchema>;

      const reservation = await findReservationById(reservationId);

      if (!reservation) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Reservation not found' },
        });
      }

      if (reservation.user_id !== userId) {
        return reply.code(403).send({
          error: { code: 'FORBIDDEN', message: 'You do not own this reservation' },
        });
      }

      // Must be cancelled to request a refund
      if (reservation.status !== 'cancelled') {
        return reply.code(409).send({
          error: {
            code: 'REFUND_NOT_ALLOWED',
            message: `Refund can only be requested for cancelled reservations. Current status: '${reservation.status}'.`,
          },
        });
      }

      // Check if a refund already exists for this reservation
      const existingRefund = await findRefundByReservationId(reservationId);
      if (existingRefund && existingRefund.status !== 'failed') {
        return reply.code(409).send({
          error: {
            code: 'REFUND_ALREADY_EXISTS',
            message: 'A refund request already exists for this reservation.',
          },
        });
      }

      const refund = await createRefund({
        reservation_id: reservationId,
        order_id: reservation.order_id,
        amount: Number(reservation.price_paid),
        currency: reservation.currency,
        reason: body.reason,
      });

      return reply.code(201).send(refund);
    },
  );

  // GET /api/v1/commerce/refunds — List user's refunds
  server.get('/api/v1/commerce/refunds', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);

    const refunds = await findRefundsByUserId(userId);

    return reply.send({
      data: refunds,
      total: refunds.length,
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // BUNDLE DEAL ROUTES
  // ════════════════════════════════════════════════════════════════════

  // GET /api/v1/commerce/bundles — Search bundle deals
  server.get(
    '/api/v1/commerce/bundles',
    { preValidation: validateQuery(searchBundlesQuerySchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const q = request.query as z.infer<typeof searchBundlesQuerySchema>;

      const { data, total } = await searchBundles({
        destination_id: q.destination_id,
        bundle_type: q.bundle_type,
        max_price: q.max_price,
        limit: q.limit,
        offset: q.offset,
      });

      return reply.send({
        data,
        pagination: {
          total,
          limit: q.limit,
          offset: q.offset,
          hasMore: q.offset + q.limit < total,
        },
      });
    },
  );

  // GET /api/v1/commerce/bundles/:bundleId — Bundle details with items
  server.get(
    '/api/v1/commerce/bundles/:bundleId',
    { preValidation: validateParams(bundleIdParamsSchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { bundleId } = request.params as z.infer<typeof bundleIdParamsSchema>;

      const bundle = await findBundleById(bundleId);
      if (!bundle) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Bundle not found' },
        });
      }

      const items = await findBundleItems(bundleId);

      return reply.send({
        ...bundle,
        items,
      });
    },
  );

  // POST /api/v1/commerce/bundles/:bundleId/book — Book a bundle deal
  server.post(
    '/api/v1/commerce/bundles/:bundleId/book',
    { preValidation: validateParams(bundleIdParamsSchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { bundleId } = request.params as z.infer<typeof bundleIdParamsSchema>;

      try {
        const result = await bookBundle(bundleId, userId);

        request.log.info(
          { bundleId, orderId: result.order.order_id },
          'Bundle booked',
        );

        return reply.code(201).send(result);
      } catch (err: unknown) {
        const error = err as Error & { statusCode?: number };
        if (error.statusCode === 404) {
          return reply.code(404).send({
            error: { code: 'NOT_FOUND', message: error.message },
          });
        }
        if (error.statusCode === 409) {
          return reply.code(409).send({
            error: { code: 'NOT_AVAILABLE', message: error.message },
          });
        }
        throw err;
      }
    },
  );

  // ════════════════════════════════════════════════════════════════════
  // PRICE COMPARISON / METASEARCH ROUTES
  // ════════════════════════════════════════════════════════════════════

  // GET /api/v1/commerce/price-sources — List price sources
  server.get(
    '/api/v1/commerce/price-sources',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const sources = await findAllPriceSources();
      return reply.send({
        data: sources,
        count: sources.length,
      });
    },
  );

  // GET /api/v1/commerce/price-compare/:entityId — Get price comparison for an entity
  server.get(
    '/api/v1/commerce/price-compare/:entityId',
    {
      preValidation: [
        validateParams(entityIdParamsSchema),
        validateQuery(priceCompareQuerySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { entityId } = request.params as z.infer<typeof entityIdParamsSchema>;
      const q = request.query as z.infer<typeof priceCompareQuerySchema>;

      const { data, total } = await findPriceListings({
        entityId,
        entityType: q.entity_type,
        limit: q.limit,
        offset: q.offset,
      });

      return reply.send({
        entity_id: entityId,
        data,
        pagination: {
          total,
          limit: q.limit,
          offset: q.offset,
          hasMore: q.offset + q.limit < total,
        },
      });
    },
  );

  // GET /api/v1/commerce/price-compare/:entityId/best — Get best price for an entity
  server.get(
    '/api/v1/commerce/price-compare/:entityId/best',
    {
      preValidation: [
        validateParams(entityIdParamsSchema),
        validateQuery(bestPriceQuerySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { entityId } = request.params as z.infer<typeof entityIdParamsSchema>;
      const q = request.query as z.infer<typeof bestPriceQuerySchema>;

      const { best, stats } = await findBestPrice(entityId, q.entity_type);

      if (!best) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'No price listings found for this entity',
          },
        });
      }

      return reply.send({
        entity_id: entityId,
        best_price: best,
        market_stats: stats,
      });
    },
  );
}
