import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  z,
  validateBody,
  validateQuery,
  validateParams,
  requestQuoteSchema,
  fileClaimSchema,
  uuidSchema,
} from '@atlas/validation';
import {
  findQuoteRequestById,
  findQuoteRequestsByUserId,
  updateQuoteRequestStatus,
  findQuoteOptionById,
  findQuoteOptionsByRequestId,
  createPolicyFromQuoteOption,
  findPolicyById,
  findPoliciesByUserId,
  updatePolicyStatus,
  createClaim,
  findClaimWithPolicy,
  findClaimsByUserId,
  getPool,
  transaction,
} from '../db/index.js';

// ── Param Schemas ───────────────────────────────────────────────

const quoteIdParamSchema = z.object({
  quoteId: uuidSchema,
});

const policyIdParamSchema = z.object({
  policyId: uuidSchema,
});

const claimIdParamSchema = z.object({
  claimId: uuidSchema,
});

// ── Query Schemas ───────────────────────────────────────────────

const listQuotesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const listPoliciesQuerySchema = z.object({
  status: z.enum(['active', 'cancelled', 'expired', 'void', 'suspended']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const listClaimsQuerySchema = z.object({
  status: z.enum([
    'submitted', 'documents_requested', 'under_review',
    'approved', 'partially_approved', 'denied',
    'paid', 'closed', 'appealed',
  ]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── Body Schemas ────────────────────────────────────────────────

const purchasePolicyBodySchema = z.object({
  quote_option_id: uuidSchema,
});

// ── Helper: get authenticated user ID ───────────────────────────

function getUserId(request: FastifyRequest): string {
  const user = request.user;
  if (!user?.sub) {
    throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
  }
  return user.sub;
}

// ── Coverage type definitions (static data) ─────────────────────

const COVERAGE_TYPES = [
  {
    type: 'trip_cancellation',
    name: 'Trip Cancellation',
    description: 'Reimburses non-refundable trip costs if you must cancel for a covered reason such as illness, injury, or severe weather.',
    typical_limit: '100% of trip cost',
    category: 'trip_protection',
  },
  {
    type: 'cfar',
    name: 'Cancel For Any Reason (CFAR)',
    description: 'Allows cancellation for any reason not covered by standard trip cancellation, typically reimbursing 50-75% of trip cost.',
    typical_limit: '50-75% of trip cost',
    category: 'trip_protection',
  },
  {
    type: 'ifar',
    name: 'Interrupt For Any Reason (IFAR)',
    description: 'Covers trip interruption for any reason, reimbursing unused, non-refundable trip expenses.',
    typical_limit: '50-75% of remaining trip cost',
    category: 'trip_protection',
  },
  {
    type: 'emergency_medical',
    name: 'Emergency Medical',
    description: 'Covers emergency medical and dental expenses incurred while traveling, including hospital stays and treatments.',
    typical_limit: '$50,000 - $500,000',
    category: 'medical',
  },
  {
    type: 'evacuation',
    name: 'Medical Evacuation & Repatriation',
    description: 'Covers emergency medical evacuation to the nearest adequate facility and repatriation of remains.',
    typical_limit: '$100,000 - $1,000,000',
    category: 'medical',
  },
  {
    type: 'trip_delay',
    name: 'Trip Delay',
    description: 'Reimburses additional expenses (meals, lodging, transport) caused by covered travel delays exceeding a specified duration.',
    typical_limit: '$500 - $2,000',
    category: 'delay',
  },
  {
    type: 'baggage',
    name: 'Baggage Loss & Delay',
    description: 'Covers lost, stolen, or damaged baggage and provides reimbursement for essential items during baggage delays.',
    typical_limit: '$1,000 - $3,000',
    category: 'baggage',
  },
  {
    type: 'rental_damage',
    name: 'Rental Car Damage',
    description: 'Covers damage to or theft of a rental vehicle, including collision damage waiver (CDW) benefits.',
    typical_limit: '$25,000 - $50,000',
    category: 'rental',
  },
  {
    type: 'adventure_sports',
    name: 'Adventure Sports',
    description: 'Extends medical and evacuation coverage to adventure activities like skiing, scuba diving, and mountain biking.',
    typical_limit: 'Included in medical limit',
    category: 'specialty',
  },
  {
    type: 'cruise_specific',
    name: 'Cruise Coverage',
    description: 'Covers cruise-specific risks including missed port of call, cabin confinement due to illness, and itinerary changes.',
    typical_limit: '$500 - $5,000',
    category: 'specialty',
  },
];

// ── Quote Generation Logic ──────────────────────────────────────

/**
 * Generates quote options based on trip cost and coverage types.
 * In production this would call insurer APIs; here we generate
 * realistic options using rate factors.
 */
function generateQuoteOptions(params: {
  tripCost: number;
  coverageTypes: string[];
  travelerCount: number;
  currency: string;
}): Array<{
  planName: string;
  planCode: string;
  premium: number;
  coverages: unknown[];
  terms: unknown;
  highlights: unknown[];
  rating: number;
}> {
  const { tripCost, coverageTypes, travelerCount, currency } = params;
  const baseCost = tripCost > 0 ? tripCost : 1000;

  // Basic plan: 4-6% of trip cost
  const basicRate = 0.04 + (coverageTypes.length * 0.002);
  // Standard plan: 6-9% of trip cost
  const standardRate = 0.06 + (coverageTypes.length * 0.003);
  // Premium plan: 9-14% of trip cost
  const premiumRate = 0.09 + (coverageTypes.length * 0.005);

  const perTravelerMultiplier = travelerCount;

  const plans = [
    {
      planName: 'Atlas Basic Protection',
      planCode: 'ATL-BASIC-V1',
      premium: Math.round(baseCost * basicRate * perTravelerMultiplier * 100) / 100,
      coverages: coverageTypes.map((type) => ({
        type,
        limit: Math.round(baseCost * 0.8),
        deductible: 250,
        currency,
        description: `Basic ${type.replace(/_/g, ' ')} coverage`,
      })),
      terms: {
        purchase_window: '14 days before departure',
        effective_period: 'departure to return',
        exclusions: ['pre-existing conditions', 'extreme sports above 6000m'],
      },
      highlights: [
        'Essential coverage for common travel risks',
        '24/7 emergency assistance hotline',
        'Claims processed within 10 business days',
      ],
      rating: 3.2,
    },
    {
      planName: 'Atlas Standard Protection',
      planCode: 'ATL-STD-V1',
      premium: Math.round(baseCost * standardRate * perTravelerMultiplier * 100) / 100,
      coverages: coverageTypes.map((type) => ({
        type,
        limit: Math.round(baseCost * 1.5),
        deductible: 100,
        currency,
        description: `Standard ${type.replace(/_/g, ' ')} coverage`,
      })),
      terms: {
        purchase_window: '21 days before departure',
        effective_period: 'departure to return',
        exclusions: ['extreme sports above 6000m'],
      },
      highlights: [
        'Comprehensive coverage with lower deductibles',
        'Pre-existing condition waiver included',
        '24/7 emergency assistance and concierge',
        'Claims processed within 5 business days',
      ],
      rating: 4.1,
    },
    {
      planName: 'Atlas Premium Protection',
      planCode: 'ATL-PREM-V1',
      premium: Math.round(baseCost * premiumRate * perTravelerMultiplier * 100) / 100,
      coverages: coverageTypes.map((type) => ({
        type,
        limit: Math.round(baseCost * 3),
        deductible: 0,
        currency,
        description: `Premium ${type.replace(/_/g, ' ')} coverage with zero deductible`,
      })),
      terms: {
        purchase_window: 'up to departure date',
        effective_period: 'departure to return',
        exclusions: [],
      },
      highlights: [
        'Maximum coverage with zero deductibles',
        'Cancel for any reason (CFAR) included',
        'Pre-existing condition waiver included',
        'Adventure sports coverage included',
        'Priority 24/7 concierge and claims processing',
        'Claims processed within 2 business days',
      ],
      rating: 4.8,
    },
  ];

  return plans;
}

// ── Route Registration ──────────────────────────────────────────

export async function registerRoutes(server: FastifyInstance): Promise<void> {

  // ────────────────────────────────────────────────────────────
  // Status
  // ────────────────────────────────────────────────────────────

  server.get('/api/v1/insurance/status', async () => ({
    service: 'insurance-service',
    routes: ['quotes', 'policies', 'claims', 'coverage-types'],
  }));

  // ════════════════════════════════════════════════════════════
  // QUOTE ROUTES (AUTHENTICATED)
  // ════════════════════════════════════════════════════════════

  // ────────────────────────────────────────────────────────────
  // 1. POST /api/v1/insurance/quotes — Request insurance quote
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/insurance/quotes',
    { preValidation: [validateBody(requestQuoteSchema)] },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof requestQuoteSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const {
        trip_id,
        coverage_types,
        traveler_count,
        trip_cost,
        currency,
      } = request.body as z.infer<typeof requestQuoteSchema>;

      // Map validation coverage types to DB coverage_intent
      // Use the first coverage type as primary intent, or 'comprehensive' if multiple
      const coverageIntent = coverage_types.length > 2 ? 'comprehensive' : (() => {
        const mapping: Record<string, string> = {
          trip_cancellation: 'cancel',
          cfar: 'cancel',
          ifar: 'cancel',
          emergency_medical: 'medical',
          evacuation: 'medical',
          trip_delay: 'trip',
          baggage: 'trip',
          rental_damage: 'rental',
          adventure_sports: 'adventure',
          cruise_specific: 'cruise',
        };
        return mapping[coverage_types[0]] ?? 'trip';
      })();

      const pool = getPool();

      const result = await transaction(pool, async (client) => {
        // a. Create quote request
        const quoteRequestResult = await client.query(
          `INSERT INTO ins.ins_quote_request
             (user_id, trip_id, coverage_intent, travelers, trip_cost, currency, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'quoted')
           RETURNING *`,
          [
            userId,
            trip_id,
            coverageIntent,
            JSON.stringify({ count: traveler_count }),
            trip_cost,
            currency,
          ],
        );
        const quoteRequest = quoteRequestResult.rows[0];

        // b. Generate quote options
        const generatedPlans = generateQuoteOptions({
          tripCost: trip_cost,
          coverageTypes: coverage_types,
          travelerCount: traveler_count,
          currency,
        });

        // c. Insert quote options with 72-hour expiry
        const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

        // Use a deterministic supplier ID placeholder for generated quotes
        const defaultSupplierId = '00000000-0000-4000-a000-000000000001';

        const options = [];
        for (const plan of generatedPlans) {
          const optionResult = await client.query(
            `INSERT INTO ins.ins_quote_option
               (quote_request_id, insurer_supplier_id, plan_name, plan_code,
                premium, currency, coverages, terms, highlights, rating, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
              quoteRequest.quote_request_id,
              defaultSupplierId,
              plan.planName,
              plan.planCode,
              plan.premium,
              currency,
              JSON.stringify(plan.coverages),
              JSON.stringify(plan.terms),
              JSON.stringify(plan.highlights),
              plan.rating,
              expiresAt,
            ],
          );
          options.push(optionResult.rows[0]);
        }

        return { quote_request: quoteRequest, options };
      });

      return reply.code(201).send(result);
    },
  );

  // ────────────────────────────────────────────────────────────
  // 2. GET /api/v1/insurance/quotes/:quoteId — Get quote details
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/insurance/quotes/:quoteId',
    { preValidation: [validateParams(quoteIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof quoteIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { quoteId } = request.params as z.infer<typeof quoteIdParamSchema>;

      const quoteRequest = await findQuoteRequestById(quoteId);
      if (!quoteRequest) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Quote request not found',
          },
        });
      }

      // Ownership check
      if (quoteRequest.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this quote',
          },
        });
      }

      // Fetch associated options
      const options = await findQuoteOptionsByRequestId(quoteId);

      // Check if any options are expired
      const now = new Date();
      const isExpired = options.length > 0 && options.every(
        (opt) => new Date(opt.expires_at) < now,
      );

      // If all options expired but status is still 'quoted', update to 'expired'
      if (isExpired && quoteRequest.status === 'quoted') {
        await updateQuoteRequestStatus(quoteId, 'expired');
        quoteRequest.status = 'expired';
      }

      return reply.send({
        ...quoteRequest,
        options: options.map((opt) => ({
          ...opt,
          is_expired: new Date(opt.expires_at) < now,
        })),
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // 3. GET /api/v1/insurance/quotes — List user's quotes
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/insurance/quotes',
    { preValidation: [validateQuery(listQuotesQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof listQuotesQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { limit, offset } = request.query as z.infer<typeof listQuotesQuerySchema>;

      const { data, total } = await findQuoteRequestsByUserId(userId, { limit, offset });

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

  // ════════════════════════════════════════════════════════════
  // POLICY ROUTES (AUTHENTICATED)
  // ════════════════════════════════════════════════════════════

  // ────────────────────────────────────────────────────────────
  // 4. POST /api/v1/insurance/policies — Purchase insurance policy
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/insurance/policies',
    { preValidation: [validateBody(purchasePolicyBodySchema)] },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof purchasePolicyBodySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { quote_option_id } = request.body as z.infer<typeof purchasePolicyBodySchema>;

      // a. Verify quote option exists
      const quoteOption = await findQuoteOptionById(quote_option_id);
      if (!quoteOption) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Quote option not found',
          },
        });
      }

      // b. Check expiry
      if (new Date(quoteOption.expires_at) < new Date()) {
        return reply.code(409).send({
          error: {
            code: 'QUOTE_EXPIRED',
            message: 'This quote option has expired. Please request a new quote.',
          },
        });
      }

      // c. Verify the parent quote request belongs to this user
      const quoteRequest = await findQuoteRequestById(quoteOption.quote_request_id);
      if (!quoteRequest || quoteRequest.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this quote option',
          },
        });
      }

      // d. Check quote request is not already bound
      if (quoteRequest.status === 'bound') {
        return reply.code(409).send({
          error: {
            code: 'ALREADY_BOUND',
            message: 'A policy has already been purchased from this quote. Request a new quote to purchase additional coverage.',
          },
        });
      }

      const pool = getPool();

      const policy = await transaction(pool, async (client) => {
        // e. Determine effective period from the quote request trip dates
        const effectiveAt = quoteRequest.trip_start
          ? new Date(quoteRequest.trip_start).toISOString()
          : new Date().toISOString();
        const expiresAt = quoteRequest.trip_end
          ? new Date(quoteRequest.trip_end).toISOString()
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // Default 1 year

        // f. Create policy from the quote option
        const newPolicy = await createPolicyFromQuoteOption(client, {
          quoteOptionId: quote_option_id,
          userId,
          insurerSupplierId: quoteOption.insurer_supplier_id,
          planName: quoteOption.plan_name,
          planCode: quoteOption.plan_code,
          premium: Number(quoteOption.premium),
          currency: quoteOption.currency,
          coverages: quoteOption.coverages,
          coveredTravelers: quoteRequest.travelers,
          effectiveAt,
          expiresAt,
        });

        // g. Mark the quote request as bound
        await client.query(
          `UPDATE ins.ins_quote_request SET status = 'bound' WHERE quote_request_id = $1`,
          [quoteRequest.quote_request_id],
        );

        return newPolicy;
      });

      return reply.code(201).send(policy);
    },
  );

  // ────────────────────────────────────────────────────────────
  // 5. GET /api/v1/insurance/policies — List user's policies
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/insurance/policies',
    { preValidation: [validateQuery(listPoliciesQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof listPoliciesQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { status, limit, offset } = request.query as z.infer<typeof listPoliciesQuerySchema>;

      const { data, total } = await findPoliciesByUserId(userId, { status, limit, offset });

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
  // 6. GET /api/v1/insurance/policies/:policyId — Get policy details
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/insurance/policies/:policyId',
    { preValidation: [validateParams(policyIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof policyIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { policyId } = request.params as z.infer<typeof policyIdParamSchema>;

      const policy = await findPolicyById(policyId);
      if (!policy) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Policy not found',
          },
        });
      }

      // Ownership check
      if (policy.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this policy',
          },
        });
      }

      // Check if policy has expired naturally
      if (policy.status === 'active' && new Date(policy.expires_at) < new Date()) {
        await updatePolicyStatus(policyId, 'expired');
        policy.status = 'expired';
      }

      return reply.send(policy);
    },
  );

  // ────────────────────────────────────────────────────────────
  // 7. POST /api/v1/insurance/policies/:policyId/cancel — Cancel policy
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/insurance/policies/:policyId/cancel',
    { preValidation: [validateParams(policyIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof policyIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { policyId } = request.params as z.infer<typeof policyIdParamSchema>;

      const policy = await findPolicyById(policyId);
      if (!policy) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Policy not found',
          },
        });
      }

      // Ownership check
      if (policy.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this policy',
          },
        });
      }

      // Only active or suspended policies can be cancelled
      const cancellableStatuses = ['active', 'suspended'];
      if (!cancellableStatuses.includes(policy.status)) {
        return reply.code(409).send({
          error: {
            code: 'CANCELLATION_NOT_ALLOWED',
            message: `Policy with status '${policy.status}' cannot be cancelled. Only active or suspended policies can be cancelled.`,
          },
        });
      }

      // Check if the policy has already started (effective_at in the past)
      // and whether a free-look period applies (typically 10-15 days from purchase)
      const purchaseDate = new Date(policy.created_at);
      const freeLookDays = 14;
      const freeLookExpiry = new Date(purchaseDate.getTime() + freeLookDays * 24 * 60 * 60 * 1000);
      const now = new Date();

      const withinFreeLook = now < freeLookExpiry;
      const refundEligible = withinFreeLook;

      await updatePolicyStatus(policyId, 'cancelled');

      return reply.code(204).send();
    },
  );

  // ════════════════════════════════════════════════════════════
  // CLAIM ROUTES (AUTHENTICATED)
  // ════════════════════════════════════════════════════════════

  // ────────────────────────────────────────────────────────────
  // 8. POST /api/v1/insurance/claims — File a claim
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/insurance/claims',
    { preValidation: [validateBody(fileClaimSchema)] },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof fileClaimSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const {
        policy_id,
        claim_type,
        description,
        amount,
        currency,
        incident_date,
        supporting_documents,
      } = request.body as z.infer<typeof fileClaimSchema>;

      // a. Verify policy exists
      const policy = await findPolicyById(policy_id);
      if (!policy) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Policy not found',
          },
        });
      }

      // b. Ownership check
      if (policy.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this policy',
          },
        });
      }

      // c. Verify policy is active
      if (policy.status !== 'active') {
        return reply.code(409).send({
          error: {
            code: 'POLICY_NOT_ACTIVE',
            message: `Cannot file a claim against a policy with status '${policy.status}'. Only active policies accept claims.`,
          },
        });
      }

      // d. Verify incident date falls within coverage period
      const incidentDate = new Date(incident_date);
      const effectiveAt = new Date(policy.effective_at);
      const expiresAt = new Date(policy.expires_at);

      if (incidentDate < effectiveAt || incidentDate > expiresAt) {
        return reply.code(400).send({
          error: {
            code: 'INCIDENT_OUTSIDE_COVERAGE',
            message: 'The incident date falls outside the policy coverage period.',
          },
        });
      }

      // e. Verify claim amount does not exceed policy premium (basic sanity check)
      // In production, this would check per-coverage-type limits
      // For now we allow any amount and let the adjuster review

      // f. Create the claim
      const evidence = supporting_documents
        ? supporting_documents.map((url) => ({ type: 'document', url }))
        : [];

      const claim = await createClaim({
        policyId: policy_id,
        userId,
        claimType: claim_type,
        description,
        amountClaimed: amount,
        currency,
        incidentDate: incident_date,
        evidence,
      });

      return reply.code(201).send(claim);
    },
  );

  // ────────────────────────────────────────────────────────────
  // 9. GET /api/v1/insurance/claims — List user's claims
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/insurance/claims',
    { preValidation: [validateQuery(listClaimsQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof listClaimsQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { status, limit, offset } = request.query as z.infer<typeof listClaimsQuerySchema>;

      const { data, total } = await findClaimsByUserId(userId, { status, limit, offset });

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
  // 10. GET /api/v1/insurance/claims/:claimId — Get claim details
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/insurance/claims/:claimId',
    { preValidation: [validateParams(claimIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof claimIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { claimId } = request.params as z.infer<typeof claimIdParamSchema>;

      const claimWithPolicy = await findClaimWithPolicy(claimId);
      if (!claimWithPolicy) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Claim not found',
          },
        });
      }

      // Ownership check
      if (claimWithPolicy.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this claim',
          },
        });
      }

      return reply.send(claimWithPolicy);
    },
  );

  // ════════════════════════════════════════════════════════════
  // COVERAGE ROUTES (PUBLIC)
  // ════════════════════════════════════════════════════════════

  // ────────────────────────────────────────────────────────────
  // 11. GET /api/v1/insurance/coverage-types — List coverage types
  // ────────────────────────────────────────────────────────────

  server.get('/api/v1/insurance/coverage-types', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      data: COVERAGE_TYPES,
      total: COVERAGE_TYPES.length,
    });
  });
}
