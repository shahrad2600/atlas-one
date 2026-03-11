import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  z,
  validateBody,
  validateQuery,
  validateParams,
  createPriceFreezeSchema,
  uuidSchema,
  paginationSchema,
} from '@atlas/validation';
import {
  findWalletByUserId,
  findOrCreateWallet,
  findLedgerEntries,
  countLedgerEntries,
  findLedgerEntriesByType,
  createLedgerEntry,
  findPriceFreezeContract,
  findPriceFreezeById,
  findPriceFreezesByUserId,
  countPriceFreezesByUserId,
  createPriceFreezeContract,
  updatePriceFreezeStatus,
  findEscrowById,
  findEscrowsByUserId,
  countEscrowsByUserId,
  findPaymentLedgerEntries,
  countPaymentLedgerEntries,
  findPayoutsBySupplierId,
  countPayoutsBySupplierId,
  // Payment method queries
  createPaymentMethod,
  findPaymentMethodsByUser,
  findPaymentMethodById,
  setDefaultPaymentMethod,
  removePaymentMethod,
  // Payment intent queries
  createPaymentIntent,
  findPaymentIntentById,
  findPaymentIntentByProvider,
  updatePaymentIntentStatus,
  findPaymentIntentsByUser,
  countPaymentIntentsByUser,
  // Refund queries
  createRefund,
  findRefundsByIntent,
  findRefundById,
  updateRefundStatus,
  // Stripe payout queries
  findStripePayoutsByUser,
  countStripePayoutsByUser,
  // Webhook queries
  recordWebhookEvent,
  isWebhookProcessed,
  markWebhookProcessed,
  getPool,
  transaction,
} from '../db/index.js';

// ── Param Schemas ──────────────────────────────────────────────

const contractIdParamSchema = z.object({
  contractId: uuidSchema,
});

const escrowIdParamSchema = z.object({
  escrowId: uuidSchema,
});

const methodIdParamSchema = z.object({
  methodId: uuidSchema,
});

const intentIdParamSchema = z.object({
  intentId: uuidSchema,
});

const refundIdParamSchema = z.object({
  refundId: uuidSchema,
});

// ── Query Schemas ──────────────────────────────────────────────

const walletTransactionsQuerySchema = paginationSchema.extend({
  type: z.enum([
    'credit', 'debit', 'hold', 'release',
    'refund', 'chargeback', 'reward', 'expiry', 'adjustment',
  ]).optional(),
}).transform((val) => ({
  ...val,
  limit: val.limit ?? 20,
}));

const listPriceFreezeQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const escrowListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const paymentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const paymentIntentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const payoutsQuerySchema = z.object({
  supplier_id: uuidSchema,
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const stripePayoutsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── Body Schemas ───────────────────────────────────────────────

const exercisePriceFreezeBodySchema = z.object({
  current_market_price: z.number().nonnegative(),
  reservation_id: uuidSchema.optional(),
});

const createPaymentIntentBodySchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().length(3).toUpperCase(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.string()).optional(),
});

const addPaymentMethodBodySchema = z.object({
  provider: z.enum(['stripe', 'apple_pay', 'google_pay']).default('stripe'),
  provider_method_id: z.string().min(1).max(255), // pm_xxx from Stripe
  type: z.enum(['card', 'apple_pay', 'google_pay', 'bank_account']),
  brand: z.string().max(30).optional(),
  last_four: z.string().length(4).regex(/^\d{4}$/).optional(),
  exp_month: z.number().int().min(1).max(12).optional(),
  exp_year: z.number().int().min(2024).max(2099).optional(),
  is_default: z.boolean().default(false),
  metadata: z.record(z.string()).optional(),
});

const createStripePaymentIntentBodySchema = z.object({
  amount_cents: z.number().int().positive(),
  currency: z.string().length(3).toUpperCase().default('USD'),
  order_id: uuidSchema.optional(),
  reservation_id: uuidSchema.optional(),
  payment_method_id: uuidSchema.optional(),
  capture_method: z.enum(['automatic', 'manual']).default('automatic'),
  metadata: z.record(z.string()).optional(),
});

const confirmPaymentBodySchema = z.object({
  intent_id: uuidSchema,
  payment_method_id: uuidSchema.optional(),
});

const createRefundBodySchema = z.object({
  intent_id: uuidSchema,
  amount_cents: z.number().int().positive(),
  reason: z.enum(['requested_by_customer', 'duplicate', 'fraudulent']).optional(),
});

const cancelPaymentBodySchema = z.object({
  cancellation_reason: z.string().max(500).optional(),
});

// ── Helper: get authenticated user ID ──────────────────────────

function getUserId(request: FastifyRequest): string {
  const user = request.user;
  if (!user?.sub) {
    throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
  }
  return user.sub;
}

// ── Helper: Verify Stripe webhook signature ────────────────────

function verifyStripeSignature(payload: string, signatureHeader: string, secret: string): boolean {
  try {
    const elements = signatureHeader.split(',');
    let timestamp = '';
    let signature = '';
    for (const element of elements) {
      const [key, value] = element.split('=');
      if (key === 't') timestamp = value ?? '';
      if (key === 'v1') signature = value ?? '';
    }

    if (!timestamp || !signature) return false;

    // Reject webhooks older than 5 minutes to prevent replay attacks
    const now = Math.floor(Date.now() / 1000);
    if (now - Number(timestamp) > 300) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (sigBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

// ── Route Registration ─────────────────────────────────────────

export async function registerRoutes(server: FastifyInstance): Promise<void> {

  // ────────────────────────────────────────────────────────────
  // Status (public)
  // ────────────────────────────────────────────────────────────

  server.get('/api/v1/finance/status', async () => ({
    service: 'finance-service',
    routes: [
      'wallet', 'wallet/transactions',
      'price-freeze', 'price-freeze/:contractId', 'price-freeze/:contractId/exercise',
      'escrow', 'escrow/:escrowId',
      'payments', 'payments/intent',
      'payouts',
      'payment-methods', 'payment-methods/:methodId', 'payment-methods/:methodId/default',
      'payments/create-intent', 'payments/confirm', 'payments/:intentId', 'payments/:intentId/cancel',
      'refunds', 'refunds/:refundId',
      'webhooks/stripe',
    ],
  }));

  // ════════════════════════════════════════════════════════════════
  // WALLET ROUTES
  // ════════════════════════════════════════════════════════════════

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Get User's Wallet
  // GET /api/v1/finance/wallet
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/finance/wallet',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);

      const wallet = await findOrCreateWallet(userId);

      return reply.send({
        wallet_id: wallet.wallet_id,
        user_id: wallet.user_id,
        currency: wallet.currency,
        available_balance: wallet.available_balance,
        held_balance: wallet.held_balance,
        lifetime_earned: wallet.lifetime_earned,
        lifetime_spent: wallet.lifetime_spent,
        status: wallet.status,
        created_at: wallet.created_at,
        updated_at: wallet.updated_at,
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: List Wallet Transactions
  // GET /api/v1/finance/wallet/transactions
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/finance/wallet/transactions',
    { preValidation: [validateQuery(walletTransactionsQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof walletTransactionsQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { limit, type } = request.query as z.infer<typeof walletTransactionsQuerySchema>;

      // Must have a wallet to query transactions
      const wallet = await findWalletByUserId(userId);
      if (!wallet) {
        return reply.send({
          data: [],
          pagination: { total: 0, limit, offset: 0, hasMore: false },
        });
      }

      // Cursor-based offset: use cursor as a created_at timestamp if provided
      const offset = 0; // paginationSchema uses cursor, but we support offset for simplicity
      let data;
      let total: number;

      if (type) {
        data = await findLedgerEntriesByType(wallet.wallet_id, type, limit, offset);
        total = await countLedgerEntries(wallet.wallet_id, type);
      } else {
        data = await findLedgerEntries(wallet.wallet_id, limit, offset);
        total = await countLedgerEntries(wallet.wallet_id);
      }

      return reply.send({
        data,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    },
  );

  // ════════════════════════════════════════════════════════════════
  // PRICE FREEZE ROUTES
  // ════════════════════════════════════════════════════════════════

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Create Price Freeze Contract
  // POST /api/v1/finance/price-freeze
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/finance/price-freeze',
    { preValidation: [validateBody(createPriceFreezeSchema)] },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof createPriceFreezeSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { product_id, product_type, locked_price, currency, freeze_duration_hours } =
        request.body as z.infer<typeof createPriceFreezeSchema>;

      // Check if user already has an active freeze on this product
      const existingFreeze = await findPriceFreezeContract(userId, product_id);
      if (existingFreeze) {
        return reply.code(409).send({
          error: {
            code: 'FREEZE_ALREADY_EXISTS',
            message: 'An active price freeze already exists for this product',
          },
        });
      }

      // Calculate fee: 2% of locked price, minimum $5
      const feeRate = 0.02;
      const minFee = 5.00;
      const fee = Math.max(locked_price * feeRate, minFee);

      // Calculate expiry
      const expiresAt = new Date(
        Date.now() + freeze_duration_hours * 60 * 60 * 1000,
      ).toISOString();

      const pool = getPool();

      const result = await transaction(pool, async (client) => {
        // Ensure wallet exists
        const walletResult = await client.query(
          `INSERT INTO fin.fin_wallet (user_id, currency)
           VALUES ($1, $2)
           ON CONFLICT (user_id) DO UPDATE SET user_id = fin.fin_wallet.user_id
           RETURNING *`,
          [userId, currency],
        );
        const wallet = walletResult.rows[0];

        // Check sufficient balance
        if (Number(wallet.available_balance) < fee) {
          throw Object.assign(
            new Error(`Insufficient wallet balance. Required: ${fee.toFixed(2)} ${currency}, available: ${wallet.available_balance}`),
            { statusCode: 400 },
          );
        }

        // Deduct fee from wallet
        const updatedWallet = await client.query(
          `UPDATE fin.fin_wallet
           SET available_balance = available_balance - $2,
               lifetime_spent = lifetime_spent + $2
           WHERE wallet_id = $1
           RETURNING *`,
          [wallet.wallet_id, fee],
        );

        // Record ledger entry for fee deduction
        const newBalance = Number(updatedWallet.rows[0].available_balance);
        await createLedgerEntry(client, {
          wallet_id: wallet.wallet_id,
          type: 'debit',
          amount: fee,
          currency,
          running_balance: newBalance,
          reference_type: 'promotion',
          description: `Price freeze fee for ${product_type} product ${product_id}`,
          metadata: { product_id, product_type, freeze_duration_hours },
          idempotency_key: `price-freeze-fee-${userId}-${product_id}-${Date.now()}`,
        });

        // Create the price freeze contract
        const contract = await createPriceFreezeContract(client, {
          user_id: userId,
          offer_type: product_type === 'stay' ? 'hotel' : product_type,
          offer_ref_id: product_id,
          offer_snapshot: {
            product_id,
            product_type,
            locked_price,
            currency,
            frozen_at: new Date().toISOString(),
          },
          fee,
          currency,
          locked_price,
          expires_at: expiresAt,
        });

        return contract;
      });

      return reply.code(201).send(result);
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: List User's Price Freezes
  // GET /api/v1/finance/price-freeze
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/finance/price-freeze',
    { preValidation: [validateQuery(listPriceFreezeQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof listPriceFreezeQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { limit, offset } = request.query as z.infer<typeof listPriceFreezeQuerySchema>;

      const [data, total] = await Promise.all([
        findPriceFreezesByUserId(userId, limit, offset),
        countPriceFreezesByUserId(userId),
      ]);

      return reply.send({
        data,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Get Price Freeze Contract Details
  // GET /api/v1/finance/price-freeze/:contractId
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/finance/price-freeze/:contractId',
    { preValidation: [validateParams(contractIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof contractIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { contractId } = request.params as z.infer<typeof contractIdParamSchema>;

      const contract = await findPriceFreezeById(contractId);
      if (!contract) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Price freeze contract not found',
          },
        });
      }

      // Ownership check
      if (contract.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this price freeze contract',
          },
        });
      }

      // Compute whether contract has expired but status not yet updated
      const isExpired = contract.status === 'active' && new Date(contract.expires_at) < new Date();

      return reply.send({
        ...contract,
        is_expired: isExpired,
        savings: contract.current_market_price
          ? Number(contract.current_market_price) - Number(contract.locked_price)
          : null,
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Exercise Price Freeze
  // POST /api/v1/finance/price-freeze/:contractId/exercise
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/finance/price-freeze/:contractId/exercise',
    {
      preValidation: [
        validateParams(contractIdParamSchema),
        validateBody(exercisePriceFreezeBodySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof contractIdParamSchema>;
        Body: z.infer<typeof exercisePriceFreezeBodySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { contractId } = request.params as z.infer<typeof contractIdParamSchema>;
      const { current_market_price, reservation_id } =
        request.body as z.infer<typeof exercisePriceFreezeBodySchema>;

      const contract = await findPriceFreezeById(contractId);
      if (!contract) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Price freeze contract not found',
          },
        });
      }

      // Ownership check
      if (contract.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this price freeze contract',
          },
        });
      }

      // Must be active
      if (contract.status !== 'active') {
        return reply.code(409).send({
          error: {
            code: 'CONTRACT_NOT_ACTIVE',
            message: `Cannot exercise contract with status '${contract.status}'`,
          },
        });
      }

      // Must not be expired
      if (new Date(contract.expires_at) < new Date()) {
        return reply.code(409).send({
          error: {
            code: 'CONTRACT_EXPIRED',
            message: 'This price freeze contract has expired and can no longer be exercised',
          },
        });
      }

      const lockedPrice = Number(contract.locked_price);
      const savings = current_market_price - lockedPrice;

      const pool = getPool();

      const result = await transaction(pool, async (client) => {
        // Update contract status to exercised
        const updatedContract = await updatePriceFreezeStatus(client, contractId, 'exercised', {
          exercised_at: new Date().toISOString(),
          exercised_reservation_id: reservation_id,
          current_market_price,
        });

        // If user saved money, record as a reward/credit in the ledger
        if (savings > 0) {
          const wallet = await findOrCreateWallet(userId, contract.currency);

          // Credit savings to wallet
          const updatedWallet = await client.query(
            `UPDATE fin.fin_wallet
             SET available_balance = available_balance + $2,
                 lifetime_earned = lifetime_earned + $2
             WHERE wallet_id = $1
             RETURNING *`,
            [wallet.wallet_id, savings],
          );

          const newBalance = Number(updatedWallet.rows[0].available_balance);

          await createLedgerEntry(client, {
            wallet_id: wallet.wallet_id,
            type: 'reward',
            amount: savings,
            currency: contract.currency,
            running_balance: newBalance,
            reference_type: 'promotion',
            reference_id: contractId,
            description: `Price freeze savings: locked at ${lockedPrice}, market price ${current_market_price}`,
            metadata: {
              freeze_id: contractId,
              locked_price: lockedPrice,
              current_market_price,
              savings,
            },
            idempotency_key: `price-freeze-exercise-${contractId}`,
          });
        }

        return {
          contract: updatedContract,
          locked_price: lockedPrice,
          current_market_price,
          savings: savings > 0 ? savings : 0,
          savings_credited: savings > 0,
        };
      });

      return reply.send(result);
    },
  );

  // ════════════════════════════════════════════════════════════════
  // ESCROW ROUTES
  // ════════════════════════════════════════════════════════════════

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Get Escrow Details
  // GET /api/v1/finance/escrow/:escrowId
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/finance/escrow/:escrowId',
    { preValidation: [validateParams(escrowIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof escrowIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { escrowId } = request.params as z.infer<typeof escrowIdParamSchema>;

      const escrow = await findEscrowById(escrowId);
      if (!escrow) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Escrow not found',
          },
        });
      }

      // User must be buyer or seller
      if (escrow.payer_user_id !== userId && escrow.payee_supplier_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this escrow',
          },
        });
      }

      return reply.send(escrow);
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: List User's Escrows
  // GET /api/v1/finance/escrow
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/finance/escrow',
    { preValidation: [validateQuery(escrowListQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof escrowListQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { limit, offset } = request.query as z.infer<typeof escrowListQuerySchema>;

      const [data, total] = await Promise.all([
        findEscrowsByUserId(userId, limit, offset),
        countEscrowsByUserId(userId),
      ]);

      return reply.send({
        data,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    },
  );

  // ════════════════════════════════════════════════════════════════
  // LEGACY PAYMENT ROUTES (wallet-based)
  // ════════════════════════════════════════════════════════════════

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Create Payment Intent (legacy wallet stub)
  // POST /api/v1/finance/payments/intent
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/finance/payments/intent',
    { preValidation: [validateBody(createPaymentIntentBodySchema)] },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof createPaymentIntentBodySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { amount, currency, description, metadata } =
        request.body as z.infer<typeof createPaymentIntentBodySchema>;

      // Stub: In production, this would call Stripe's PaymentIntent API.
      // For now, generate a placeholder intent to enable frontend integration.
      const intentId = `pi_atlas_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      const clientSecret = `${intentId}_secret_${Math.random().toString(36).substring(2, 18)}`;

      return reply.code(201).send({
        payment_intent_id: intentId,
        client_secret: clientSecret,
        amount,
        currency,
        status: 'requires_payment_method',
        description: description ?? null,
        metadata: metadata ?? {},
        user_id: userId,
        created_at: new Date().toISOString(),
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: List Payment History (legacy wallet-based)
  // GET /api/v1/finance/payments
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/finance/payments',
    { preValidation: [validateQuery(paymentsQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof paymentsQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { limit, offset } = request.query as z.infer<typeof paymentsQuerySchema>;

      const wallet = await findWalletByUserId(userId);
      if (!wallet) {
        return reply.send({
          data: [],
          pagination: { total: 0, limit, offset, hasMore: false },
        });
      }

      const [data, total] = await Promise.all([
        findPaymentLedgerEntries(wallet.wallet_id, limit, offset),
        countPaymentLedgerEntries(wallet.wallet_id),
      ]);

      return reply.send({
        data,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    },
  );

  // ════════════════════════════════════════════════════════════════
  // LEGACY PAYOUT ROUTES (supplier-based)
  // ════════════════════════════════════════════════════════════════

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: List Supplier Payouts
  // GET /api/v1/finance/payouts
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/finance/payouts',
    { preValidation: [validateQuery(payoutsQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof payoutsQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      getUserId(request); // ensure authenticated
      const { supplier_id, limit, offset } =
        request.query as z.infer<typeof payoutsQuerySchema>;

      const [data, total] = await Promise.all([
        findPayoutsBySupplierId(supplier_id, limit, offset),
        countPayoutsBySupplierId(supplier_id),
      ]);

      return reply.send({
        data,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    },
  );

  // ════════════════════════════════════════════════════════════════
  // PAYMENT METHOD ROUTES (Stripe Integration)
  // ════════════════════════════════════════════════════════════════

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Add Payment Method
  // POST /api/v1/finance/payment-methods
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/finance/payment-methods',
    { preValidation: [validateBody(addPaymentMethodBodySchema)] },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof addPaymentMethodBodySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const body = request.body as z.infer<typeof addPaymentMethodBodySchema>;

      const method = await createPaymentMethod({
        user_id: userId,
        provider: body.provider,
        provider_method_id: body.provider_method_id,
        type: body.type,
        brand: body.brand,
        last_four: body.last_four,
        exp_month: body.exp_month,
        exp_year: body.exp_year,
        is_default: body.is_default,
        metadata: body.metadata,
      });

      request.log.info({ userId, methodId: method.payment_method_id }, 'Payment method added');

      return reply.code(201).send(method);
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: List User's Payment Methods
  // GET /api/v1/finance/payment-methods
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/finance/payment-methods',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);

      const methods = await findPaymentMethodsByUser(userId);

      return reply.send({
        data: methods,
        count: methods.length,
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Set Default Payment Method
  // POST /api/v1/finance/payment-methods/:methodId/default
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/finance/payment-methods/:methodId/default',
    { preValidation: [validateParams(methodIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof methodIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { methodId } = request.params as z.infer<typeof methodIdParamSchema>;

      // Verify the method exists and belongs to the user
      const existing = await findPaymentMethodById(methodId);
      if (!existing || existing.user_id !== userId) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Payment method not found',
          },
        });
      }

      if (existing.status !== 'active') {
        return reply.code(409).send({
          error: {
            code: 'METHOD_NOT_ACTIVE',
            message: 'Cannot set an inactive payment method as default',
          },
        });
      }

      const updated = await setDefaultPaymentMethod(userId, methodId);

      request.log.info({ userId, methodId }, 'Default payment method updated');

      return reply.send(updated);
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Remove Payment Method
  // DELETE /api/v1/finance/payment-methods/:methodId
  // ────────────────────────────────────────────────────────────

  server.delete(
    '/api/v1/finance/payment-methods/:methodId',
    { preValidation: [validateParams(methodIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof methodIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { methodId } = request.params as z.infer<typeof methodIdParamSchema>;

      // Verify the method exists and belongs to the user
      const existing = await findPaymentMethodById(methodId);
      if (!existing || existing.user_id !== userId) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Payment method not found',
          },
        });
      }

      if (existing.status === 'removed') {
        return reply.code(409).send({
          error: {
            code: 'ALREADY_REMOVED',
            message: 'Payment method has already been removed',
          },
        });
      }

      const removed = await removePaymentMethod(methodId, userId);

      request.log.info({ userId, methodId }, 'Payment method removed');

      return reply.send(removed);
    },
  );

  // ════════════════════════════════════════════════════════════════
  // STRIPE PAYMENT INTENT ROUTES
  // ════════════════════════════════════════════════════════════════

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Create Stripe Payment Intent
  // POST /api/v1/finance/payments/create-intent
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/finance/payments/create-intent',
    { preValidation: [validateBody(createStripePaymentIntentBodySchema)] },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof createStripePaymentIntentBodySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const body = request.body as z.infer<typeof createStripePaymentIntentBodySchema>;

      // If a payment_method_id is provided, verify it belongs to the user
      if (body.payment_method_id) {
        const method = await findPaymentMethodById(body.payment_method_id);
        if (!method || method.user_id !== userId) {
          return reply.code(404).send({
            error: {
              code: 'PAYMENT_METHOD_NOT_FOUND',
              message: 'Payment method not found or does not belong to you',
            },
          });
        }
        if (method.status !== 'active') {
          return reply.code(409).send({
            error: {
              code: 'PAYMENT_METHOD_INACTIVE',
              message: 'Payment method is not active',
            },
          });
        }
      }

      // In production, this calls Stripe: stripe.paymentIntents.create({...})
      // For now, simulate Stripe response and store in DB
      const providerIntentId = `pi_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
      const clientSecret = `${providerIntentId}_secret_${Math.random().toString(36).substring(2, 20)}`;

      const initialStatus = body.payment_method_id
        ? 'requires_confirmation'
        : 'requires_payment_method';

      const intent = await createPaymentIntent({
        user_id: userId,
        provider_intent_id: providerIntentId,
        order_id: body.order_id,
        reservation_id: body.reservation_id,
        amount_cents: body.amount_cents,
        currency: body.currency,
        status: initialStatus,
        payment_method_id: body.payment_method_id,
        client_secret: clientSecret,
        capture_method: body.capture_method,
        metadata: body.metadata,
      });

      request.log.info(
        { userId, intentId: intent.intent_id, providerIntentId, amountCents: body.amount_cents },
        'Payment intent created',
      );

      return reply.code(201).send({
        intent_id: intent.intent_id,
        provider_intent_id: intent.provider_intent_id,
        client_secret: intent.client_secret,
        amount_cents: intent.amount_cents,
        currency: intent.currency,
        status: intent.status,
        payment_method_id: intent.payment_method_id,
        capture_method: intent.capture_method,
        order_id: intent.order_id,
        reservation_id: intent.reservation_id,
        created_at: intent.created_at,
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Confirm Payment
  // POST /api/v1/finance/payments/confirm
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/finance/payments/confirm',
    { preValidation: [validateBody(confirmPaymentBodySchema)] },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof confirmPaymentBodySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const body = request.body as z.infer<typeof confirmPaymentBodySchema>;

      const intent = await findPaymentIntentById(body.intent_id);
      if (!intent) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Payment intent not found',
          },
        });
      }

      // Ownership check
      if (intent.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this payment intent',
          },
        });
      }

      // Can only confirm intents in confirmable states
      const confirmableStatuses = ['requires_confirmation', 'requires_payment_method'];
      if (!confirmableStatuses.includes(intent.status)) {
        return reply.code(409).send({
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot confirm payment intent with status '${intent.status}'`,
          },
        });
      }

      // If a new payment method is provided, validate it
      const paymentMethodId = body.payment_method_id ?? intent.payment_method_id;
      if (!paymentMethodId) {
        return reply.code(400).send({
          error: {
            code: 'PAYMENT_METHOD_REQUIRED',
            message: 'A payment method is required to confirm the payment',
          },
        });
      }

      const method = await findPaymentMethodById(paymentMethodId);
      if (!method || method.user_id !== userId || method.status !== 'active') {
        return reply.code(400).send({
          error: {
            code: 'INVALID_PAYMENT_METHOD',
            message: 'The specified payment method is invalid or inactive',
          },
        });
      }

      // In production, this calls: stripe.paymentIntents.confirm(pi_xxx, { payment_method: pm_xxx })
      // Simulate successful confirmation -> processing -> succeeded
      const updated = await updatePaymentIntentStatus(body.intent_id, 'succeeded', {
        receipt_url: `https://pay.stripe.com/receipts/${intent.provider_intent_id}`,
      });

      request.log.info(
        { userId, intentId: body.intent_id, status: 'succeeded' },
        'Payment confirmed',
      );

      return reply.send({
        intent_id: updated.intent_id,
        status: updated.status,
        amount_cents: updated.amount_cents,
        currency: updated.currency,
        receipt_url: updated.receipt_url,
        updated_at: updated.updated_at,
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Get Payment Intent Status
  // GET /api/v1/finance/payments/:intentId
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/finance/payments/:intentId',
    { preValidation: [validateParams(intentIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof intentIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { intentId } = request.params as z.infer<typeof intentIdParamSchema>;

      const intent = await findPaymentIntentById(intentId);
      if (!intent) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Payment intent not found',
          },
        });
      }

      // Ownership check
      if (intent.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this payment intent',
          },
        });
      }

      // Include refunds for this intent
      const refunds = await findRefundsByIntent(intentId);

      return reply.send({
        ...intent,
        refunds,
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Payment History (intent-based)
  // GET /api/v1/finance/payments/history
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/finance/payments/history',
    { preValidation: [validateQuery(paymentIntentsQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof paymentIntentsQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { limit, offset } = request.query as z.infer<typeof paymentIntentsQuerySchema>;

      const [data, total] = await Promise.all([
        findPaymentIntentsByUser(userId, limit, offset),
        countPaymentIntentsByUser(userId),
      ]);

      return reply.send({
        data,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Cancel Payment Intent
  // POST /api/v1/finance/payments/:intentId/cancel
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/finance/payments/:intentId/cancel',
    {
      preValidation: [
        validateParams(intentIdParamSchema),
        validateBody(cancelPaymentBodySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof intentIdParamSchema>;
        Body: z.infer<typeof cancelPaymentBodySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { intentId } = request.params as z.infer<typeof intentIdParamSchema>;
      const body = request.body as z.infer<typeof cancelPaymentBodySchema>;

      const intent = await findPaymentIntentById(intentId);
      if (!intent) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Payment intent not found',
          },
        });
      }

      // Ownership check
      if (intent.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this payment intent',
          },
        });
      }

      // Can only cancel intents that haven't succeeded or already been cancelled
      const nonCancellableStatuses = ['succeeded', 'cancelled', 'failed'];
      if (nonCancellableStatuses.includes(intent.status)) {
        return reply.code(409).send({
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot cancel payment intent with status '${intent.status}'`,
          },
        });
      }

      // In production: stripe.paymentIntents.cancel(pi_xxx)
      const updated = await updatePaymentIntentStatus(intentId, 'cancelled', {
        error_message: body.cancellation_reason ?? 'Cancelled by user',
      });

      request.log.info({ userId, intentId, status: 'cancelled' }, 'Payment cancelled');

      return reply.send({
        intent_id: updated.intent_id,
        status: updated.status,
        cancelled_at: updated.updated_at,
      });
    },
  );

  // ════════════════════════════════════════════════════════════════
  // REFUND ROUTES
  // ════════════════════════════════════════════════════════════════

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Request Refund
  // POST /api/v1/finance/refunds
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/finance/refunds',
    { preValidation: [validateBody(createRefundBodySchema)] },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof createRefundBodySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const body = request.body as z.infer<typeof createRefundBodySchema>;

      // Verify the payment intent exists and belongs to the user
      const intent = await findPaymentIntentById(body.intent_id);
      if (!intent) {
        return reply.code(404).send({
          error: {
            code: 'INTENT_NOT_FOUND',
            message: 'Payment intent not found',
          },
        });
      }

      if (intent.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this payment intent',
          },
        });
      }

      // Can only refund succeeded payments
      if (intent.status !== 'succeeded') {
        return reply.code(409).send({
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot refund a payment intent with status '${intent.status}'`,
          },
        });
      }

      // Check refund amount doesn't exceed paid amount minus already-refunded amount
      const maxRefundable = intent.amount_cents - (intent.refunded_amount_cents ?? 0);
      if (body.amount_cents > maxRefundable) {
        return reply.code(400).send({
          error: {
            code: 'AMOUNT_TOO_LARGE',
            message: `Refund amount (${body.amount_cents}) exceeds maximum refundable amount (${maxRefundable})`,
          },
        });
      }

      // In production: stripe.refunds.create({ payment_intent: pi_xxx, amount: ... })
      const providerRefundId = `re_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

      const refund = await createRefund({
        intent_id: body.intent_id,
        provider_refund_id: providerRefundId,
        amount_cents: body.amount_cents,
        reason: body.reason,
        status: 'succeeded', // In production, this might start as 'pending'
      });

      // Update the intent's refunded amount
      const newRefundedAmount = (intent.refunded_amount_cents ?? 0) + body.amount_cents;
      await updatePaymentIntentStatus(body.intent_id, intent.status, {
        refunded_amount_cents: newRefundedAmount,
      });

      request.log.info(
        { userId, refundId: refund.refund_id, intentId: body.intent_id, amountCents: body.amount_cents },
        'Refund processed',
      );

      return reply.code(201).send(refund);
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Get Refund Status
  // GET /api/v1/finance/refunds/:refundId
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/finance/refunds/:refundId',
    { preValidation: [validateParams(refundIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof refundIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { refundId } = request.params as z.infer<typeof refundIdParamSchema>;

      const refund = await findRefundById(refundId);
      if (!refund) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Refund not found',
          },
        });
      }

      // Verify ownership via the parent intent
      const intent = await findPaymentIntentById(refund.intent_id);
      if (!intent || intent.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this refund',
          },
        });
      }

      return reply.send(refund);
    },
  );

  // ════════════════════════════════════════════════════════════════
  // STRIPE PAYOUT ROUTES (for business owners)
  // ════════════════════════════════════════════════════════════════

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: List Stripe Payouts
  // GET /api/v1/finance/stripe-payouts
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/finance/stripe-payouts',
    { preValidation: [validateQuery(stripePayoutsQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof stripePayoutsQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { limit, offset } = request.query as z.infer<typeof stripePayoutsQuerySchema>;

      const [data, total] = await Promise.all([
        findStripePayoutsByUser(userId, limit, offset),
        countStripePayoutsByUser(userId),
      ]);

      return reply.send({
        data,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    },
  );

  // ════════════════════════════════════════════════════════════════
  // STRIPE WEBHOOK ENDPOINT
  // ════════════════════════════════════════════════════════════════

  // ────────────────────────────────────────────────────────────
  // PUBLIC: Stripe Webhook
  // POST /api/v1/finance/webhooks/stripe
  // No auth -- uses Stripe signature verification instead
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/finance/webhooks/stripe',
    {
      config: {
        rawBody: true,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const signatureHeader = request.headers['stripe-signature'] as string | undefined;
      const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];

      // Verify Stripe signature if a webhook secret is configured
      if (webhookSecret && signatureHeader) {
        const rawBody = typeof request.body === 'string'
          ? request.body
          : JSON.stringify(request.body);

        const isValid = verifyStripeSignature(rawBody, signatureHeader, webhookSecret);
        if (!isValid) {
          request.log.warn('Stripe webhook signature verification failed');
          return reply.code(400).send({
            error: {
              code: 'INVALID_SIGNATURE',
              message: 'Webhook signature verification failed',
            },
          });
        }
      }

      const event = request.body as {
        id: string;
        type: string;
        data?: { object?: Record<string, unknown> };
      };

      if (!event?.id || !event?.type) {
        return reply.code(400).send({
          error: {
            code: 'INVALID_PAYLOAD',
            message: 'Missing event id or type',
          },
        });
      }

      // Idempotency check: skip if already processed
      const alreadyProcessed = await isWebhookProcessed(event.id);
      if (alreadyProcessed) {
        request.log.info({ eventId: event.id }, 'Webhook event already processed, skipping');
        return reply.code(200).send({ received: true, status: 'already_processed' });
      }

      // Record the event for deduplication
      await recordWebhookEvent({
        provider_event_id: event.id,
        event_type: event.type,
        payload: event as unknown as Record<string, unknown>,
      });

      let processingError: string | undefined;

      try {
        const obj = event.data?.object ?? {};

        switch (event.type) {
          case 'payment_intent.succeeded': {
            const providerIntentId = obj['id'] as string | undefined;
            if (providerIntentId) {
              const intent = await findPaymentIntentByProvider(providerIntentId);
              if (intent) {
                await updatePaymentIntentStatus(intent.intent_id, 'succeeded', {
                  receipt_url: obj['receipt_url'] as string | undefined,
                });
                request.log.info({ intentId: intent.intent_id }, 'Payment intent succeeded via webhook');
              }
            }
            break;
          }

          case 'payment_intent.payment_failed': {
            const providerIntentId = obj['id'] as string | undefined;
            if (providerIntentId) {
              const intent = await findPaymentIntentByProvider(providerIntentId);
              if (intent) {
                const lastError = obj['last_payment_error'] as Record<string, unknown> | undefined;
                await updatePaymentIntentStatus(intent.intent_id, 'failed', {
                  error_code: lastError?.['code'] as string | undefined,
                  error_message: lastError?.['message'] as string | undefined,
                });
                request.log.warn({ intentId: intent.intent_id }, 'Payment intent failed via webhook');
              }
            }
            break;
          }

          case 'payment_intent.canceled': {
            const providerIntentId = obj['id'] as string | undefined;
            if (providerIntentId) {
              const intent = await findPaymentIntentByProvider(providerIntentId);
              if (intent) {
                await updatePaymentIntentStatus(intent.intent_id, 'cancelled');
                request.log.info({ intentId: intent.intent_id }, 'Payment intent cancelled via webhook');
              }
            }
            break;
          }

          case 'charge.refunded': {
            const paymentIntentId = obj['payment_intent'] as string | undefined;
            if (paymentIntentId) {
              const intent = await findPaymentIntentByProvider(paymentIntentId);
              if (intent) {
                const amountRefunded = obj['amount_refunded'] as number | undefined;
                if (amountRefunded !== undefined) {
                  await updatePaymentIntentStatus(intent.intent_id, intent.status, {
                    refunded_amount_cents: amountRefunded,
                  });
                }
                request.log.info({ intentId: intent.intent_id }, 'Charge refunded via webhook');
              }
            }
            break;
          }

          case 'charge.refund.updated': {
            const refundObj = obj;
            const providerRefundId = refundObj['id'] as string | undefined;
            const refundStatus = refundObj['status'] as string | undefined;
            if (providerRefundId && refundStatus) {
              // Find refund by provider ID and update status
              // This is a simplified lookup -- in production, add findRefundByProviderId
              request.log.info({ providerRefundId, status: refundStatus }, 'Refund updated via webhook');
            }
            break;
          }

          default:
            request.log.info({ eventType: event.type }, 'Unhandled webhook event type');
        }
      } catch (err) {
        processingError = err instanceof Error ? err.message : 'Unknown processing error';
        request.log.error({ eventId: event.id, error: processingError }, 'Webhook processing error');
      }

      // Mark webhook as processed
      await markWebhookProcessed(event.id, processingError);

      return reply.code(200).send({ received: true });
    },
  );
}
