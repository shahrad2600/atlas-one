import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z, validateBody, validateParams, uuidSchema } from '@atlas/validation';
import {
  findMembershipByUserId,
  findActiveConciergeByUserId,
  findConciergeCase,
  createConciergeCase,
  findMessagesByCaseId,
  createConciergeMessage,
  findInventoryHolds,
  createInventoryHold,
} from '../db/index.js';

// ── Validation Schemas ──────────────────────────────────────────────

const caseIdParamsSchema = z.object({
  caseId: uuidSchema,
});

const createConciergeBodySchema = z.object({
  subject: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  category: z.enum([
    'table_acquisition', 'villa_sourcing', 'disruption',
    'transfer', 'special_request', 'complaint',
  ]).optional(),
});

const createMessageBodySchema = z.object({
  body: z.string().min(1).max(5000),
});

const createHoldBodySchema = z.object({
  productId: uuidSchema,
  expiresAt: z.string().datetime({ offset: true }),
  caseId: uuidSchema.optional(),
});

// ── Helper: get authenticated user ID ───────────────────────────────

function getUserId(request: FastifyRequest): string {
  const user = request.user;
  if (!user?.sub) {
    throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
  }
  return user.sub;
}

// ── Tier hierarchy for permission checks ────────────────────────────

const TIER_LEVELS: Record<string, number> = {
  signature: 1,
  reserve: 2,
  black: 3,
};

// ── Route Registration ──────────────────────────────────────────────

export async function registerRoutes(server: FastifyInstance): Promise<void> {

  // ── Status endpoint ─────────────────────────────────────────────
  server.get('/api/v1/luxury/status', async () => ({
    service: 'luxury-service',
    routes: ['membership', 'concierge', 'inventory-holds'],
  }));

  // ════════════════════════════════════════════════════════════════
  //  MEMBERSHIP
  // ════════════════════════════════════════════════════════════════

  // GET /api/v1/luxury/membership -- Get user's luxury membership
  server.get(
    '/api/v1/luxury/membership',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);

      const membership = await findMembershipByUserId(userId);
      if (!membership) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'No luxury membership found for this user',
          },
        });
      }

      return reply.send({
        membership_id: membership.membership_id,
        tier: membership.tier,
        status: membership.status,
        entitlements: membership.entitlements,
        started_at: membership.started_at,
        ends_at: membership.ends_at,
        renewal_date: membership.renewal_date,
        monthly_fee: membership.monthly_fee,
        currency: membership.currency,
      });
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  CONCIERGE CASES
  // ════════════════════════════════════════════════════════════════

  // GET /api/v1/luxury/concierge -- List active concierge cases
  server.get(
    '/api/v1/luxury/concierge',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);

      const cases = await findActiveConciergeByUserId(userId);

      return reply.send({
        data: cases,
        count: cases.length,
      });
    },
  );

  // POST /api/v1/luxury/concierge -- Create concierge request
  server.post(
    '/api/v1/luxury/concierge',
    { preValidation: [validateBody(createConciergeBodySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const body = request.body as z.infer<typeof createConciergeBodySchema>;

      // Verify user has an active luxury membership
      const membership = await findMembershipByUserId(userId);
      if (!membership || membership.status !== 'active') {
        return reply.code(403).send({
          error: {
            code: 'MEMBERSHIP_REQUIRED',
            message: 'An active luxury membership is required to create concierge requests',
          },
        });
      }

      const conciergeCase = await createConciergeCase({
        userId,
        membershipId: membership.membership_id,
        subject: body.subject,
        description: body.description,
        priority: body.priority,
        category: body.category ?? null,
      });

      request.log.info({ userId, caseId: conciergeCase.case_id }, 'Concierge case created');

      return reply.code(201).send(conciergeCase);
    },
  );

  // GET /api/v1/luxury/concierge/:caseId -- Get case details
  server.get(
    '/api/v1/luxury/concierge/:caseId',
    { preValidation: [validateParams(caseIdParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { caseId } = request.params as z.infer<typeof caseIdParamsSchema>;

      const conciergeCase = await findConciergeCase(caseId);
      if (!conciergeCase) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Concierge case not found',
          },
        });
      }

      // Ownership check
      if (conciergeCase.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this concierge case',
          },
        });
      }

      // Fetch associated messages
      const messages = await findMessagesByCaseId(caseId);

      return reply.send({
        ...conciergeCase,
        messages,
      });
    },
  );

  // POST /api/v1/luxury/concierge/:caseId/messages -- Add message to case
  server.post(
    '/api/v1/luxury/concierge/:caseId/messages',
    {
      preValidation: [
        validateParams(caseIdParamsSchema),
        validateBody(createMessageBodySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { caseId } = request.params as z.infer<typeof caseIdParamsSchema>;
      const { body: messageBody } = request.body as z.infer<typeof createMessageBodySchema>;

      // Verify case exists
      const conciergeCase = await findConciergeCase(caseId);
      if (!conciergeCase) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Concierge case not found',
          },
        });
      }

      // Ownership check
      if (conciergeCase.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this concierge case',
          },
        });
      }

      // Cannot add messages to closed/resolved cases
      if (conciergeCase.status === 'closed' || conciergeCase.status === 'resolved') {
        return reply.code(409).send({
          error: {
            code: 'CASE_CLOSED',
            message: 'Cannot add messages to a closed or resolved case',
          },
        });
      }

      const message = await createConciergeMessage({
        caseId,
        senderId: userId,
        senderType: 'user',
        body: messageBody,
      });

      request.log.info({ userId, caseId, messageId: message.message_id }, 'Concierge message added');

      return reply.code(201).send(message);
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  INVENTORY HOLDS
  // ════════════════════════════════════════════════════════════════

  // GET /api/v1/luxury/inventory-holds -- List inventory holds
  server.get(
    '/api/v1/luxury/inventory-holds',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);

      const holds = await findInventoryHolds(userId);

      return reply.send({
        data: holds,
        count: holds.length,
      });
    },
  );

  // POST /api/v1/luxury/inventory-holds -- Create inventory hold
  server.post(
    '/api/v1/luxury/inventory-holds',
    { preValidation: [validateBody(createHoldBodySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const body = request.body as z.infer<typeof createHoldBodySchema>;

      // Verify user has an active luxury membership
      const membership = await findMembershipByUserId(userId);
      if (!membership || membership.status !== 'active') {
        return reply.code(403).send({
          error: {
            code: 'MEMBERSHIP_REQUIRED',
            message: 'An active luxury membership is required to create inventory holds',
          },
        });
      }

      // Validate tier allows holds (reserve and black can hold)
      const tierLevel = TIER_LEVELS[membership.tier] ?? 0;
      if (tierLevel < TIER_LEVELS['reserve']) {
        return reply.code(403).send({
          error: {
            code: 'TIER_INSUFFICIENT',
            message: 'Your membership tier does not support inventory holds. Reserve or Black tier required.',
          },
        });
      }

      // Validate expiration is in the future
      const expiresAt = new Date(body.expiresAt);
      if (expiresAt <= new Date()) {
        return reply.code(400).send({
          error: {
            code: 'INVALID_EXPIRATION',
            message: 'Expiration date must be in the future',
          },
        });
      }

      const hold = await createInventoryHold({
        slotId: body.productId,
        userId,
        membershipId: membership.membership_id,
        caseId: body.caseId ?? null,
        expiresAt: body.expiresAt,
      });

      request.log.info(
        { userId, holdId: hold.hold_id, slotId: body.productId },
        'Inventory hold created',
      );

      return reply.code(201).send(hold);
    },
  );
}
