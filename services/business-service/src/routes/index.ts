import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  z,
  uuidSchema,
  emailSchema,
  paginationSchema,
  isoDateSchema,
  validateBody,
  validateParams,
  validateQuery,
} from '@atlas/validation';
import {
  claimListing,
  findListingsByOwner,
  findListingById,
  updateListing,
  verifyListing,
  findTeamMembers,
  addTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
  findTeamMemberByUserAndListing,
  findTeamMemberById,
  getAnalyticsSummary,
  getAnalyticsDaily,
  getAnalyticsTrends,
  findCompetitors,
  addCompetitor,
  removeCompetitor,
  findCompetitorById,
  compareCompetitorMetrics,
  createCampaign,
  findCampaignsByListing,
  findCampaignById,
  addCampaignRecipients,
  sendCampaign,
  getCampaignStats,
  createAdCampaign,
  findAdCampaignsByListing,
  findAdCampaignById,
  updateAdCampaign,
  getAdPerformance,
  createOffer,
  findOffersByListing,
  findOfferById,
  updateOffer,
  deactivateOffer,
  upsertStoryboard,
  findStoryboard,
  setFavoritePhotos,
  findFavoritePhotos,
  getDashboardOverview,
} from '../db/index.js';

// ── Param Schemas ────────────────────────────────────────────────────

const listingIdParamsSchema = z.object({
  listingId: uuidSchema,
});

const memberIdParamsSchema = z.object({
  listingId: uuidSchema,
  memberId: uuidSchema,
});

const campaignIdParamsSchema = z.object({
  campaignId: uuidSchema,
});

const adIdParamsSchema = z.object({
  adId: uuidSchema,
});

const offerIdParamsSchema = z.object({
  offerId: uuidSchema,
});

const competitorIdParamsSchema = z.object({
  listingId: uuidSchema,
  competitorId: uuidSchema,
});

// ── Query Schemas ────────────────────────────────────────────────────

const dateRangeQuerySchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// ── Body Schemas ─────────────────────────────────────────────────────

const claimListingBodySchema = z.object({
  entity_id: uuidSchema,
  entity_type: z.enum(['restaurant', 'hotel', 'experience', 'attraction']),
  business_name: z.string().min(1).max(300),
  contact_email: emailSchema.optional(),
  contact_phone: z.string().max(50).optional(),
  website_url: z.string().url().optional(),
});

const updateListingBodySchema = z.object({
  business_name: z.string().min(1).max(300).optional(),
  contact_email: emailSchema.optional(),
  contact_phone: z.string().max(50).optional(),
  website_url: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const verifyListingBodySchema = z.object({
  verification_method: z.enum(['email', 'phone', 'document']),
});

const addTeamMemberBodySchema = z.object({
  user_id: uuidSchema,
  role: z.enum(['admin', 'manager', 'viewer']),
});

const updateTeamMemberBodySchema = z.object({
  role: z.enum(['admin', 'manager', 'viewer']),
});

const addCompetitorBodySchema = z.object({
  competitor_entity_id: uuidSchema,
});

const createCampaignBodySchema = z.object({
  name: z.string().min(1).max(200),
  template_subject: z.string().max(500).optional(),
  template_body: z.string().max(10000).optional(),
  scheduled_at: isoDateSchema.optional(),
});

const addRecipientsBodySchema = z.object({
  recipients: z.array(z.object({
    email: emailSchema,
    name: z.string().max(200).optional(),
  })).min(1).max(1000),
});

const createAdBodySchema = z.object({
  name: z.string().min(1).max(200),
  campaign_type: z.enum(['sponsored_placement', 'display', 'direct_booking']),
  budget_cents: z.number().int().nonnegative(),
  daily_budget_cents: z.number().int().nonnegative().optional(),
  bid_type: z.enum(['cpc', 'cpm']),
  bid_amount_cents: z.number().int().nonnegative(),
  targeting: z.record(z.unknown()).optional(),
  starts_at: isoDateSchema.optional(),
  ends_at: isoDateSchema.optional(),
});

const updateAdBodySchema = z.object({
  status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
  budget_cents: z.number().int().nonnegative().optional(),
  daily_budget_cents: z.number().int().nonnegative().optional(),
  bid_amount_cents: z.number().int().nonnegative().optional(),
  targeting: z.record(z.unknown()).optional(),
  starts_at: isoDateSchema.optional(),
  ends_at: isoDateSchema.optional(),
});

const createOfferBodySchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  offer_type: z.enum(['discount', 'package', 'free_upgrade', 'early_booking', 'last_minute']),
  discount_percent: z.number().int().min(1).max(100).optional(),
  discount_amount_cents: z.number().int().nonnegative().optional(),
  conditions: z.string().max(2000).optional(),
  valid_from: isoDateSchema,
  valid_until: isoDateSchema,
  max_redemptions: z.number().int().positive().optional(),
});

const updateOfferBodySchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).optional(),
  discount_percent: z.number().int().min(1).max(100).optional(),
  discount_amount_cents: z.number().int().nonnegative().optional(),
  conditions: z.string().max(2000).optional(),
  valid_from: isoDateSchema.optional(),
  valid_until: isoDateSchema.optional(),
  is_active: z.boolean().optional(),
  max_redemptions: z.number().int().positive().optional(),
});

const storyboardBodySchema = z.object({
  title: z.string().max(200).optional(),
  media_ids: z.array(uuidSchema).max(50),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().nonnegative().optional(),
});

const favoritePhotosBodySchema = z.object({
  photos: z.array(z.object({
    media_id: uuidSchema,
    sort_order: z.number().int().nonnegative(),
  })).max(30),
});

// ── Helper: get authenticated user ID ────────────────────────────────

function getUserId(request: FastifyRequest): string {
  const user = request.user;
  if (!user?.sub) {
    throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
  }
  return user.sub;
}

// ── Helper: check listing access ─────────────────────────────────────

async function requireListingAccess(
  userId: string,
  listingId: string,
  minRole: 'owner' | 'admin' | 'manager' | 'viewer' = 'viewer',
): Promise<{ listing: Record<string, unknown>; member: Record<string, unknown> }> {
  const listing = await findListingById(listingId);
  if (!listing) {
    throw Object.assign(new Error('Listing not found'), { statusCode: 404 });
  }

  const member = await findTeamMemberByUserAndListing(userId, listingId);
  if (!member) {
    throw Object.assign(new Error('You do not have access to this listing'), { statusCode: 403 });
  }

  const roleHierarchy: Record<string, number> = {
    owner: 4,
    admin: 3,
    manager: 2,
    viewer: 1,
  };

  const userLevel = roleHierarchy[member.role as string] ?? 0;
  const requiredLevel = roleHierarchy[minRole] ?? 0;

  if (userLevel < requiredLevel) {
    throw Object.assign(
      new Error(`This action requires '${minRole}' role or higher`),
      { statusCode: 403 },
    );
  }

  return { listing, member };
}

// ── Helper: check subscription tier ──────────────────────────────────

function requireSubscription(
  listing: Record<string, unknown>,
  requiredTier: 'business_advantage' | 'enterprise',
) {
  const tierHierarchy: Record<string, number> = {
    free: 0,
    business_advantage: 1,
    enterprise: 2,
  };

  const currentLevel = tierHierarchy[listing.subscription_tier as string] ?? 0;
  const requiredLevel = tierHierarchy[requiredTier] ?? 0;

  if (currentLevel < requiredLevel) {
    throw Object.assign(
      new Error(`This feature requires '${requiredTier}' subscription or higher. Current tier: '${listing.subscription_tier as string}'.`),
      { statusCode: 402 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ═══════════════════════════════════════════════════════════════════════

export async function registerRoutes(server: FastifyInstance): Promise<void> {

  // ── Status (public) ────────────────────────────────────────────────
  server.get('/api/v1/business/status', async () => ({
    service: 'business-service',
    routes: [
      'listings', 'team', 'analytics', 'competitors',
      'campaigns', 'ads', 'offers', 'storyboard', 'favorite-photos', 'dashboard',
    ],
  }));

  // ════════════════════════════════════════════════════════════════════
  // 36. DASHBOARD OVERVIEW
  // ════════════════════════════════════════════════════════════════════

  server.get('/api/v1/business/dashboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const listings = await getDashboardOverview(userId);

    return reply.send({
      data: listings,
      total: listings.length,
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // LISTING MANAGEMENT (1-5)
  // ════════════════════════════════════════════════════════════════════

  // 1. POST /api/v1/business/listings/claim
  server.post(
    '/api/v1/business/listings/claim',
    { preValidation: validateBody(claimListingBodySchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const body = request.body as z.infer<typeof claimListingBodySchema>;

      const listing = await claimListing({
        ...body,
        owner_user_id: userId,
      });

      return reply.code(201).send(listing);
    },
  );

  // 2. GET /api/v1/business/listings
  server.get('/api/v1/business/listings', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const listings = await findListingsByOwner(userId);

    return reply.send({
      data: listings,
      total: listings.length,
    });
  });

  // 3. GET /api/v1/business/listings/:listingId
  server.get(
    '/api/v1/business/listings/:listingId',
    { preValidation: validateParams(listingIdParamsSchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { listingId } = request.params as z.infer<typeof listingIdParamsSchema>;

      const { listing } = await requireListingAccess(userId, listingId);
      return reply.send(listing);
    },
  );

  // 4. PATCH /api/v1/business/listings/:listingId
  server.patch(
    '/api/v1/business/listings/:listingId',
    {
      preValidation: [
        validateParams(listingIdParamsSchema),
        validateBody(updateListingBodySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { listingId } = request.params as z.infer<typeof listingIdParamsSchema>;
      const body = request.body as z.infer<typeof updateListingBodySchema>;

      await requireListingAccess(userId, listingId, 'manager');
      const updated = await updateListing(listingId, body);
      return reply.send(updated);
    },
  );

  // 5. POST /api/v1/business/listings/:listingId/verify
  server.post(
    '/api/v1/business/listings/:listingId/verify',
    {
      preValidation: [
        validateParams(listingIdParamsSchema),
        validateBody(verifyListingBodySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { listingId } = request.params as z.infer<typeof listingIdParamsSchema>;
      const body = request.body as z.infer<typeof verifyListingBodySchema>;

      await requireListingAccess(userId, listingId, 'owner');

      const listing = await findListingById(listingId);
      if (listing && listing.status === 'verified') {
        return reply.code(409).send({
          error: { code: 'ALREADY_VERIFIED', message: 'This listing is already verified' },
        });
      }

      const verified = await verifyListing(listingId, body.verification_method);
      return reply.send(verified);
    },
  );

  // ════════════════════════════════════════════════════════════════════
  // TEAM MANAGEMENT (6-9)
  // ════════════════════════════════════════════════════════════════════

  // 6. GET /api/v1/business/listings/:listingId/team
  server.get(
    '/api/v1/business/listings/:listingId/team',
    { preValidation: validateParams(listingIdParamsSchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { listingId } = request.params as z.infer<typeof listingIdParamsSchema>;

      await requireListingAccess(userId, listingId);

      const members = await findTeamMembers(listingId);
      return reply.send({
        data: members,
        total: members.length,
      });
    },
  );

  // 7. POST /api/v1/business/listings/:listingId/team
  server.post(
    '/api/v1/business/listings/:listingId/team',
    {
      preValidation: [
        validateParams(listingIdParamsSchema),
        validateBody(addTeamMemberBodySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { listingId } = request.params as z.infer<typeof listingIdParamsSchema>;
      const body = request.body as z.infer<typeof addTeamMemberBodySchema>;

      await requireListingAccess(userId, listingId, 'admin');

      // Check if user is already a member
      const existing = await findTeamMemberByUserAndListing(body.user_id, listingId);
      if (existing) {
        return reply.code(409).send({
          error: { code: 'ALREADY_MEMBER', message: 'User is already a team member' },
        });
      }

      const member = await addTeamMember({
        listing_id: listingId,
        user_id: body.user_id,
        role: body.role,
        invited_by: userId,
      });

      return reply.code(201).send(member);
    },
  );

  // 8. PATCH /api/v1/business/listings/:listingId/team/:memberId
  server.patch(
    '/api/v1/business/listings/:listingId/team/:memberId',
    {
      preValidation: [
        validateParams(memberIdParamsSchema),
        validateBody(updateTeamMemberBodySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { listingId, memberId } = request.params as z.infer<typeof memberIdParamsSchema>;
      const body = request.body as z.infer<typeof updateTeamMemberBodySchema>;

      await requireListingAccess(userId, listingId, 'admin');

      const targetMember = await findTeamMemberById(memberId);
      if (!targetMember || targetMember.listing_id !== listingId) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Team member not found' },
        });
      }

      // Cannot change the role of an owner
      if (targetMember.role === 'owner') {
        return reply.code(403).send({
          error: { code: 'FORBIDDEN', message: 'Cannot change the role of the owner' },
        });
      }

      const updated = await updateTeamMemberRole(memberId, body.role);
      return reply.send(updated);
    },
  );

  // 9. DELETE /api/v1/business/listings/:listingId/team/:memberId
  server.delete(
    '/api/v1/business/listings/:listingId/team/:memberId',
    { preValidation: validateParams(memberIdParamsSchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { listingId, memberId } = request.params as z.infer<typeof memberIdParamsSchema>;

      await requireListingAccess(userId, listingId, 'admin');

      const targetMember = await findTeamMemberById(memberId);
      if (!targetMember || targetMember.listing_id !== listingId) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Team member not found' },
        });
      }

      // Cannot remove the owner
      if (targetMember.role === 'owner') {
        return reply.code(403).send({
          error: { code: 'FORBIDDEN', message: 'Cannot remove the owner from the team' },
        });
      }

      await removeTeamMember(memberId);
      return reply.code(204).send();
    },
  );

  // ════════════════════════════════════════════════════════════════════
  // ANALYTICS DASHBOARD (10-12)
  // ════════════════════════════════════════════════════════════════════

  // 10. GET /api/v1/business/listings/:listingId/analytics
  server.get(
    '/api/v1/business/listings/:listingId/analytics',
    {
      preValidation: [
        validateParams(listingIdParamsSchema),
        validateQuery(dateRangeQuerySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { listingId } = request.params as z.infer<typeof listingIdParamsSchema>;
      const { start_date, end_date } = request.query as z.infer<typeof dateRangeQuerySchema>;

      await requireListingAccess(userId, listingId);

      const summary = await getAnalyticsSummary(listingId, start_date, end_date);
      return reply.send({
        listing_id: listingId,
        period: { start_date, end_date },
        summary,
      });
    },
  );

  // 11. GET /api/v1/business/listings/:listingId/analytics/daily
  server.get(
    '/api/v1/business/listings/:listingId/analytics/daily',
    {
      preValidation: [
        validateParams(listingIdParamsSchema),
        validateQuery(dateRangeQuerySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { listingId } = request.params as z.infer<typeof listingIdParamsSchema>;
      const { start_date, end_date } = request.query as z.infer<typeof dateRangeQuerySchema>;

      await requireListingAccess(userId, listingId);

      const daily = await getAnalyticsDaily(listingId, start_date, end_date);
      return reply.send({
        listing_id: listingId,
        period: { start_date, end_date },
        data: daily,
        total: daily.length,
      });
    },
  );

  // 12. GET /api/v1/business/listings/:listingId/analytics/trends
  server.get(
    '/api/v1/business/listings/:listingId/analytics/trends',
    {
      preValidation: [
        validateParams(listingIdParamsSchema),
        validateQuery(dateRangeQuerySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { listingId } = request.params as z.infer<typeof listingIdParamsSchema>;
      const { start_date, end_date } = request.query as z.infer<typeof dateRangeQuerySchema>;

      await requireListingAccess(userId, listingId);

      const trends = await getAnalyticsTrends(listingId, start_date, end_date);
      return reply.send({
        listing_id: listingId,
        current_period: { start_date, end_date },
        trends,
      });
    },
  );

  // ════════════════════════════════════════════════════════════════════
  // COMPETITOR BENCHMARKING (13-16)
  // ════════════════════════════════════════════════════════════════════

  // 13. GET /api/v1/business/listings/:listingId/competitors
  server.get(
    '/api/v1/business/listings/:listingId/competitors',
    { preValidation: validateParams(listingIdParamsSchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { listingId } = request.params as z.infer<typeof listingIdParamsSchema>;

      const { listing } = await requireListingAccess(userId, listingId);
      requireSubscription(listing, 'business_advantage');

      const competitors = await findCompetitors(listingId);
      return reply.send({
        data: competitors,
        total: competitors.length,
      });
    },
  );

  // 14. POST /api/v1/business/listings/:listingId/competitors
  server.post(
    '/api/v1/business/listings/:listingId/competitors',
    {
      preValidation: [
        validateParams(listingIdParamsSchema),
        validateBody(addCompetitorBodySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { listingId } = request.params as z.infer<typeof listingIdParamsSchema>;
      const body = request.body as z.infer<typeof addCompetitorBodySchema>;

      const { listing } = await requireListingAccess(userId, listingId, 'manager');
      requireSubscription(listing, 'business_advantage');

      const competitor = await addCompetitor({
        listing_id: listingId,
        competitor_entity_id: body.competitor_entity_id,
        added_by: userId,
      });

      return reply.code(201).send(competitor);
    },
  );

  // 15. DELETE /api/v1/business/listings/:listingId/competitors/:competitorId
  server.delete(
    '/api/v1/business/listings/:listingId/competitors/:competitorId',
    { preValidation: validateParams(competitorIdParamsSchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { listingId, competitorId } = request.params as z.infer<typeof competitorIdParamsSchema>;

      const { listing } = await requireListingAccess(userId, listingId, 'manager');
      requireSubscription(listing, 'business_advantage');

      const existing = await findCompetitorById(competitorId);
      if (!existing || existing.listing_id !== listingId) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Competitor not found' },
        });
      }

      await removeCompetitor(competitorId);
      return reply.code(204).send();
    },
  );

  // 16. GET /api/v1/business/listings/:listingId/competitors/compare
  server.get(
    '/api/v1/business/listings/:listingId/competitors/compare',
    {
      preValidation: [
        validateParams(listingIdParamsSchema),
        validateQuery(dateRangeQuerySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { listingId } = request.params as z.infer<typeof listingIdParamsSchema>;
      const { start_date, end_date } = request.query as z.infer<typeof dateRangeQuerySchema>;

      const { listing } = await requireListingAccess(userId, listingId);
      requireSubscription(listing, 'business_advantage');

      const comparison = await compareCompetitorMetrics(listingId, start_date, end_date);

      const mine = comparison.find((r: Record<string, unknown>) => r.source === 'mine');
      const competitors = comparison.filter((r: Record<string, unknown>) => r.source === 'competitor');

      return reply.send({
        listing_id: listingId,
        period: { start_date, end_date },
        my_metrics: mine ?? null,
        competitor_metrics: competitors,
      });
    },
  );

  // ════════════════════════════════════════════════════════════════════
  // REVIEW EXPRESS (17-22)
  // ════════════════════════════════════════════════════════════════════

  // 17. POST /api/v1/business/listings/:listingId/campaigns
  server.post(
    '/api/v1/business/listings/:listingId/campaigns',
    {
      preValidation: [
        validateParams(listingIdParamsSchema),
        validateBody(createCampaignBodySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { listingId } = request.params as z.infer<typeof listingIdParamsSchema>;
      const body = request.body as z.infer<typeof createCampaignBodySchema>;

      const { listing } = await requireListingAccess(userId, listingId, 'manager');
      requireSubscription(listing, 'business_advantage');

      const campaign = await createCampaign({
        listing_id: listingId,
        ...body,
      });

      return reply.code(201).send(campaign);
    },
  );

  // 18. GET /api/v1/business/listings/:listingId/campaigns
  server.get(
    '/api/v1/business/listings/:listingId/campaigns',
    { preValidation: validateParams(listingIdParamsSchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { listingId } = request.params as z.infer<typeof listingIdParamsSchema>;

      const { listing } = await requireListingAccess(userId, listingId);
      requireSubscription(listing, 'business_advantage');

      const campaigns = await findCampaignsByListing(listingId);
      return reply.send({
        data: campaigns,
        total: campaigns.length,
      });
    },
  );

  // 19. GET /api/v1/business/campaigns/:campaignId
  server.get(
    '/api/v1/business/campaigns/:campaignId',
    { preValidation: validateParams(campaignIdParamsSchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { campaignId } = request.params as z.infer<typeof campaignIdParamsSchema>;

      const campaign = await findCampaignById(campaignId);
      if (!campaign) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Campaign not found' },
        });
      }

      const { listing } = await requireListingAccess(userId, campaign.listing_id as string);
      requireSubscription(listing, 'business_advantage');

      const stats = await getCampaignStats(campaignId);

      return reply.send({
        ...campaign,
        stats,
      });
    },
  );

  // 20. POST /api/v1/business/campaigns/:campaignId/recipients
  server.post(
    '/api/v1/business/campaigns/:campaignId/recipients',
    {
      preValidation: [
        validateParams(campaignIdParamsSchema),
        validateBody(addRecipientsBodySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { campaignId } = request.params as z.infer<typeof campaignIdParamsSchema>;
      const body = request.body as z.infer<typeof addRecipientsBodySchema>;

      const campaign = await findCampaignById(campaignId);
      if (!campaign) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Campaign not found' },
        });
      }

      const { listing } = await requireListingAccess(userId, campaign.listing_id as string, 'manager');
      requireSubscription(listing, 'business_advantage');

      if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
        return reply.code(409).send({
          error: {
            code: 'CAMPAIGN_NOT_EDITABLE',
            message: `Cannot add recipients to a campaign with status '${campaign.status as string}'`,
          },
        });
      }

      const recipients = await addCampaignRecipients(campaignId, body.recipients);
      return reply.code(201).send({
        data: recipients,
        total: recipients.length,
      });
    },
  );

  // 21. POST /api/v1/business/campaigns/:campaignId/send
  server.post(
    '/api/v1/business/campaigns/:campaignId/send',
    { preValidation: validateParams(campaignIdParamsSchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { campaignId } = request.params as z.infer<typeof campaignIdParamsSchema>;

      const campaign = await findCampaignById(campaignId);
      if (!campaign) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Campaign not found' },
        });
      }

      const { listing } = await requireListingAccess(userId, campaign.listing_id as string, 'manager');
      requireSubscription(listing, 'business_advantage');

      if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
        return reply.code(409).send({
          error: {
            code: 'CAMPAIGN_ALREADY_SENT',
            message: `Campaign with status '${campaign.status as string}' cannot be sent`,
          },
        });
      }

      if ((campaign.total_recipients as number) === 0) {
        return reply.code(400).send({
          error: {
            code: 'NO_RECIPIENTS',
            message: 'Campaign has no recipients. Add recipients before sending.',
          },
        });
      }

      const updated = await sendCampaign(campaignId);
      return reply.send(updated);
    },
  );

  // 22. GET /api/v1/business/campaigns/:campaignId/stats
  server.get(
    '/api/v1/business/campaigns/:campaignId/stats',
    { preValidation: validateParams(campaignIdParamsSchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { campaignId } = request.params as z.infer<typeof campaignIdParamsSchema>;

      const campaign = await findCampaignById(campaignId);
      if (!campaign) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Campaign not found' },
        });
      }

      const { listing } = await requireListingAccess(userId, campaign.listing_id as string);
      requireSubscription(listing, 'business_advantage');

      const stats = await getCampaignStats(campaignId);
      return reply.send({
        campaign_id: campaignId,
        campaign_name: campaign.name,
        ...stats,
      });
    },
  );

  // ════════════════════════════════════════════════════════════════════
  // ADVERTISING (23-27)
  // ════════════════════════════════════════════════════════════════════

  // 23. POST /api/v1/business/listings/:listingId/ads
  server.post(
    '/api/v1/business/listings/:listingId/ads',
    {
      preValidation: [
        validateParams(listingIdParamsSchema),
        validateBody(createAdBodySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { listingId } = request.params as z.infer<typeof listingIdParamsSchema>;
      const body = request.body as z.infer<typeof createAdBodySchema>;

      const { listing } = await requireListingAccess(userId, listingId, 'manager');
      // Sponsored placements require business_advantage
      if (body.campaign_type === 'sponsored_placement') {
        requireSubscription(listing, 'business_advantage');
      }

      // Verify listing is verified before ads
      if (listing.status !== 'verified') {
        return reply.code(409).send({
          error: {
            code: 'LISTING_NOT_VERIFIED',
            message: 'Listing must be verified before creating ad campaigns',
          },
        });
      }

      const ad = await createAdCampaign({
        listing_id: listingId,
        ...body,
      });

      return reply.code(201).send(ad);
    },
  );

  // 24. GET /api/v1/business/listings/:listingId/ads
  server.get(
    '/api/v1/business/listings/:listingId/ads',
    { preValidation: validateParams(listingIdParamsSchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { listingId } = request.params as z.infer<typeof listingIdParamsSchema>;

      await requireListingAccess(userId, listingId);

      const ads = await findAdCampaignsByListing(listingId);
      return reply.send({
        data: ads,
        total: ads.length,
      });
    },
  );

  // 25. GET /api/v1/business/ads/:adId
  server.get(
    '/api/v1/business/ads/:adId',
    { preValidation: validateParams(adIdParamsSchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { adId } = request.params as z.infer<typeof adIdParamsSchema>;

      const ad = await findAdCampaignById(adId);
      if (!ad) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Ad campaign not found' },
        });
      }

      await requireListingAccess(userId, ad.listing_id as string);
      return reply.send(ad);
    },
  );

  // 26. PATCH /api/v1/business/ads/:adId
  server.patch(
    '/api/v1/business/ads/:adId',
    {
      preValidation: [
        validateParams(adIdParamsSchema),
        validateBody(updateAdBodySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { adId } = request.params as z.infer<typeof adIdParamsSchema>;
      const body = request.body as z.infer<typeof updateAdBodySchema>;

      const ad = await findAdCampaignById(adId);
      if (!ad) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Ad campaign not found' },
        });
      }

      await requireListingAccess(userId, ad.listing_id as string, 'manager');

      // Cannot modify a completed or exhausted campaign (except pausing)
      if (ad.status === 'completed' || ad.status === 'exhausted') {
        return reply.code(409).send({
          error: {
            code: 'AD_NOT_EDITABLE',
            message: `Cannot modify an ad campaign with status '${ad.status as string}'`,
          },
        });
      }

      const updated = await updateAdCampaign(adId, body);
      return reply.send(updated);
    },
  );

  // 27. GET /api/v1/business/ads/:adId/performance
  server.get(
    '/api/v1/business/ads/:adId/performance',
    { preValidation: validateParams(adIdParamsSchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { adId } = request.params as z.infer<typeof adIdParamsSchema>;

      const ad = await findAdCampaignById(adId);
      if (!ad) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Ad campaign not found' },
        });
      }

      await requireListingAccess(userId, ad.listing_id as string);

      const performance = await getAdPerformance(adId);
      return reply.send({
        ad_campaign_id: adId,
        campaign_name: ad.name,
        status: ad.status,
        budget_cents: ad.budget_cents,
        spent_cents: ad.spent_cents,
        ...performance,
      });
    },
  );

  // ════════════════════════════════════════════════════════════════════
  // SPECIAL OFFERS (28-31)
  // ════════════════════════════════════════════════════════════════════

  // 28. POST /api/v1/business/listings/:listingId/offers
  server.post(
    '/api/v1/business/listings/:listingId/offers',
    {
      preValidation: [
        validateParams(listingIdParamsSchema),
        validateBody(createOfferBodySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { listingId } = request.params as z.infer<typeof listingIdParamsSchema>;
      const body = request.body as z.infer<typeof createOfferBodySchema>;

      await requireListingAccess(userId, listingId, 'manager');

      const offer = await createOffer({
        listing_id: listingId,
        ...body,
      });

      return reply.code(201).send(offer);
    },
  );

  // 29. GET /api/v1/business/listings/:listingId/offers
  server.get(
    '/api/v1/business/listings/:listingId/offers',
    { preValidation: validateParams(listingIdParamsSchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { listingId } = request.params as z.infer<typeof listingIdParamsSchema>;

      await requireListingAccess(userId, listingId);

      const offers = await findOffersByListing(listingId);
      return reply.send({
        data: offers,
        total: offers.length,
      });
    },
  );

  // 30. PATCH /api/v1/business/offers/:offerId
  server.patch(
    '/api/v1/business/offers/:offerId',
    {
      preValidation: [
        validateParams(offerIdParamsSchema),
        validateBody(updateOfferBodySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { offerId } = request.params as z.infer<typeof offerIdParamsSchema>;
      const body = request.body as z.infer<typeof updateOfferBodySchema>;

      const offer = await findOfferById(offerId);
      if (!offer) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Special offer not found' },
        });
      }

      await requireListingAccess(userId, offer.listing_id as string, 'manager');

      const updated = await updateOffer(offerId, body);
      return reply.send(updated);
    },
  );

  // 31. DELETE /api/v1/business/offers/:offerId (deactivate, not hard delete)
  server.delete(
    '/api/v1/business/offers/:offerId',
    { preValidation: validateParams(offerIdParamsSchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { offerId } = request.params as z.infer<typeof offerIdParamsSchema>;

      const offer = await findOfferById(offerId);
      if (!offer) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Special offer not found' },
        });
      }

      await requireListingAccess(userId, offer.listing_id as string, 'manager');

      const deactivated = await deactivateOffer(offerId);
      return reply.send(deactivated);
    },
  );

  // ════════════════════════════════════════════════════════════════════
  // STORYBOARD & PHOTOS (32-35)
  // ════════════════════════════════════════════════════════════════════

  // 32. POST /api/v1/business/listings/:listingId/storyboard
  server.post(
    '/api/v1/business/listings/:listingId/storyboard',
    {
      preValidation: [
        validateParams(listingIdParamsSchema),
        validateBody(storyboardBodySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { listingId } = request.params as z.infer<typeof listingIdParamsSchema>;
      const body = request.body as z.infer<typeof storyboardBodySchema>;

      const { listing } = await requireListingAccess(userId, listingId, 'manager');
      requireSubscription(listing, 'business_advantage');

      const storyboard = await upsertStoryboard({
        listing_id: listingId,
        ...body,
      });

      return reply.code(201).send(storyboard);
    },
  );

  // 33. GET /api/v1/business/listings/:listingId/storyboard
  server.get(
    '/api/v1/business/listings/:listingId/storyboard',
    { preValidation: validateParams(listingIdParamsSchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { listingId } = request.params as z.infer<typeof listingIdParamsSchema>;

      const { listing } = await requireListingAccess(userId, listingId);
      requireSubscription(listing, 'business_advantage');

      const storyboard = await findStoryboard(listingId);
      return reply.send({
        data: storyboard,
        total: storyboard.length,
      });
    },
  );

  // 34. POST /api/v1/business/listings/:listingId/favorite-photos
  server.post(
    '/api/v1/business/listings/:listingId/favorite-photos',
    {
      preValidation: [
        validateParams(listingIdParamsSchema),
        validateBody(favoritePhotosBodySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { listingId } = request.params as z.infer<typeof listingIdParamsSchema>;
      const body = request.body as z.infer<typeof favoritePhotosBodySchema>;

      const { listing } = await requireListingAccess(userId, listingId, 'manager');
      requireSubscription(listing, 'business_advantage');

      const photos = await setFavoritePhotos(listingId, body.photos);
      return reply.send({
        data: photos,
        total: photos.length,
      });
    },
  );

  // 35. GET /api/v1/business/listings/:listingId/favorite-photos
  server.get(
    '/api/v1/business/listings/:listingId/favorite-photos',
    { preValidation: validateParams(listingIdParamsSchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { listingId } = request.params as z.infer<typeof listingIdParamsSchema>;

      const { listing } = await requireListingAccess(userId, listingId);
      requireSubscription(listing, 'business_advantage');

      const photos = await findFavoritePhotos(listingId);
      return reply.send({
        data: photos,
        total: photos.length,
      });
    },
  );
}
