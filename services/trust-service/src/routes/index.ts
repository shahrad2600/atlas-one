import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z, validateBody, validateQuery, validateParams, uuidSchema } from '@atlas/validation';
import {
  findUserTrustScore,
  findReviewById,
  findReviewsByUserId,
  createReview,
  updateReview,
  softDeleteReview,
  findReportsByUserId,
  createReport,
  // UGC: Review enhancements
  upsertReviewVote,
  getReviewVoteCounts,
  findSubratingsByReviewId,
  findReviewResponse,
  createReviewResponse,
  searchReviews,
} from '../db/index.js';

// ── Validation Schemas ──────────────────────────────────────────────

const reviewIdParamsSchema = z.object({
  reviewId: uuidSchema,
});

const listReviewsQuerySchema = z.object({
  entityType: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const createReviewBodySchema = z.object({
  entityId: uuidSchema,
  entityType: z.string().min(1).max(50),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(5000).optional(),
});

const updateReviewBodySchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(5000).optional(),
});

const createReportBodySchema = z.object({
  entityId: uuidSchema,
  entityType: z.enum(['review', 'photo', 'video', 'message', 'listing']),
  reason: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
});

// ── UGC Review Enhancement Schemas ──────────────────────────────────

const reviewVoteBodySchema = z.object({
  vote_type: z.enum(['helpful', 'not_helpful']),
});

const reviewResponseBodySchema = z.object({
  body: z.string().min(1).max(5000),
});

const enhancedListReviewsQuerySchema = z.object({
  entityId: uuidSchema.optional(),
  entityType: z.string().max(50).optional(),
  travelerType: z.string().max(50).optional(),
  season: z.enum(['spring', 'summer', 'fall', 'winter']).optional(),
  ratingMin: z.coerce.number().int().min(1).max(5).optional(),
  ratingMax: z.coerce.number().int().min(1).max(5).optional(),
  lang: z.string().max(10).optional(),
  sort: z.enum(['recent', 'helpful', 'highest', 'lowest']).default('recent'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── Helper: get authenticated user ID ───────────────────────────────

function getUserId(request: FastifyRequest): string {
  const user = request.user;
  if (!user?.sub) {
    throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
  }
  return user.sub;
}

// ── Route Registration ──────────────────────────────────────────────

export async function registerRoutes(server: FastifyInstance): Promise<void> {

  // ── Status endpoint ─────────────────────────────────────────────
  server.get('/api/v1/trust/status', async () => ({
    service: 'trust-service',
    routes: [
      'score', 'reviews', 'reports', 'verification',
      // UGC review enhancements
      'reviews/:reviewId/vote', 'reviews/:reviewId/subratings',
      'reviews/:reviewId/response', 'reviews/search',
    ],
  }));

  // ════════════════════════════════════════════════════════════════
  //  TRUST SCORE
  // ════════════════════════════════════════════════════════════════

  // GET /api/v1/trust/score -- Get user's trust score
  server.get(
    '/api/v1/trust/score',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);

      const score = await findUserTrustScore(userId);
      if (!score) {
        // Return a default score for users without an existing record
        return reply.send({
          user_id: userId,
          trustworthiness: 50.0,
          tier: 'new',
          verified_identity: false,
          breakdown: {
            no_show_rate: 0,
            cancellation_rate: 0,
            review_quality: 50.0,
            fraud_flags: 0,
          },
        });
      }

      return reply.send({
        user_id: score.user_id,
        trustworthiness: score.trustworthiness,
        tier: score.tier,
        verified_identity: score.verified_identity,
        breakdown: {
          no_show_rate: score.no_show_rate,
          cancellation_rate: score.cancellation_rate,
          review_quality: score.review_quality,
          fraud_flags: score.fraud_flags,
        },
        updated_at: score.updated_at,
      });
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  REVIEWS
  // ════════════════════════════════════════════════════════════════

  // GET /api/v1/trust/reviews -- List user's reviews
  server.get(
    '/api/v1/trust/reviews',
    { preValidation: [validateQuery(listReviewsQuerySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { entityType, limit, offset } =
        request.query as z.infer<typeof listReviewsQuerySchema>;

      const { data, total } = await findReviewsByUserId(userId, {
        entityType,
        limit,
        offset,
      });

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

  // POST /api/v1/trust/reviews -- Submit a review
  server.post(
    '/api/v1/trust/reviews',
    { preValidation: [validateBody(createReviewBodySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const body = request.body as z.infer<typeof createReviewBodySchema>;

      const review = await createReview({
        entityId: body.entityId,
        userId,
        rating: body.rating,
        title: body.title ?? null,
        body: body.body ?? null,
      });

      request.log.info(
        { userId, reviewId: review.review_id, entityId: body.entityId },
        'Review submitted',
      );

      return reply.code(201).send(review);
    },
  );

  // GET /api/v1/trust/reviews/:reviewId -- Get review details
  server.get(
    '/api/v1/trust/reviews/:reviewId',
    { preValidation: [validateParams(reviewIdParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { reviewId } = request.params as z.infer<typeof reviewIdParamsSchema>;

      const review = await findReviewById(reviewId);
      if (!review || review.status === 'removed') {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Review not found',
          },
        });
      }

      return reply.send(review);
    },
  );

  // PATCH /api/v1/trust/reviews/:reviewId -- Update review
  server.patch(
    '/api/v1/trust/reviews/:reviewId',
    {
      preValidation: [
        validateParams(reviewIdParamsSchema),
        validateBody(updateReviewBodySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { reviewId } = request.params as z.infer<typeof reviewIdParamsSchema>;
      const body = request.body as z.infer<typeof updateReviewBodySchema>;

      // Find review and verify it exists
      const review = await findReviewById(reviewId);
      if (!review || review.status === 'removed') {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Review not found',
          },
        });
      }

      // Ownership check
      if (review.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You can only update your own reviews',
          },
        });
      }

      // Ensure at least one field is provided
      if (body.rating === undefined && body.title === undefined && body.body === undefined) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'At least one field (rating, title, body) must be provided',
          },
        });
      }

      const updated = await updateReview(reviewId, {
        rating: body.rating,
        title: body.title,
        body: body.body,
      });

      if (!updated) {
        return reply.code(500).send({
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to update review',
          },
        });
      }

      request.log.info({ userId, reviewId }, 'Review updated');

      return reply.send(updated);
    },
  );

  // DELETE /api/v1/trust/reviews/:reviewId -- Delete review (soft delete)
  server.delete(
    '/api/v1/trust/reviews/:reviewId',
    { preValidation: [validateParams(reviewIdParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { reviewId } = request.params as z.infer<typeof reviewIdParamsSchema>;

      // Find review
      const review = await findReviewById(reviewId);
      if (!review || review.status === 'removed') {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Review not found',
          },
        });
      }

      // Ownership check
      if (review.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You can only delete your own reviews',
          },
        });
      }

      await softDeleteReview(reviewId);

      request.log.info({ userId, reviewId }, 'Review soft-deleted');

      return reply.code(204).send();
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  REPORTS
  // ════════════════════════════════════════════════════════════════

  // GET /api/v1/trust/reports -- List user's filed reports
  server.get(
    '/api/v1/trust/reports',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);

      const reports = await findReportsByUserId(userId);

      return reply.send({
        data: reports,
        count: reports.length,
      });
    },
  );

  // POST /api/v1/trust/reports -- File a report
  server.post(
    '/api/v1/trust/reports',
    { preValidation: [validateBody(createReportBodySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const body = request.body as z.infer<typeof createReportBodySchema>;

      const report = await createReport({
        contentType: body.entityType,
        contentId: body.entityId,
        entityId: userId,
        reason: body.reason,
        description: body.description,
      });

      request.log.info(
        { userId, reportId: report.queue_id, entityId: body.entityId },
        'Report filed',
      );

      return reply.code(201).send(report);
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  VERIFICATION
  // ════════════════════════════════════════════════════════════════

  // GET /api/v1/trust/verification -- Get verification status
  server.get(
    '/api/v1/trust/verification',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);

      const score = await findUserTrustScore(userId);

      if (!score) {
        return reply.send({
          user_id: userId,
          verified_identity: false,
          tier: 'new',
          verification_level: 'none',
        });
      }

      // Derive verification level from tier and verified_identity flag
      let verificationLevel: string;
      if (score.verified_identity && score.tier === 'verified') {
        verificationLevel = 'full';
      } else if (score.verified_identity) {
        verificationLevel = 'identity_verified';
      } else if (score.tier === 'trusted') {
        verificationLevel = 'trusted';
      } else if (score.tier === 'standard') {
        verificationLevel = 'basic';
      } else {
        verificationLevel = 'none';
      }

      return reply.send({
        user_id: score.user_id,
        verified_identity: score.verified_identity,
        tier: score.tier,
        verification_level: verificationLevel,
        updated_at: score.updated_at,
      });
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  UGC: REVIEW ENHANCEMENTS
  // ════════════════════════════════════════════════════════════════

  // 21. POST /api/v1/trust/reviews/:reviewId/vote -- Vote helpful/not helpful
  server.post(
    '/api/v1/trust/reviews/:reviewId/vote',
    {
      preValidation: [
        validateParams(reviewIdParamsSchema),
        validateBody(reviewVoteBodySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { reviewId } = request.params as z.infer<typeof reviewIdParamsSchema>;
      const { vote_type } = request.body as z.infer<typeof reviewVoteBodySchema>;

      // Verify review exists
      const review = await findReviewById(reviewId);
      if (!review || review.status === 'removed') {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Review not found',
          },
        });
      }

      // Cannot vote on your own review
      if (review.user_id === userId) {
        return reply.code(409).send({
          error: {
            code: 'SELF_VOTE',
            message: 'You cannot vote on your own review',
          },
        });
      }

      const vote = await upsertReviewVote({
        reviewId,
        userId,
        voteType: vote_type,
      });

      // Get updated counts
      const counts = await getReviewVoteCounts(reviewId);

      request.log.info({ userId, reviewId, voteType: vote_type }, 'Review vote recorded');

      return reply.send({
        vote,
        counts,
      });
    },
  );

  // 22. GET /api/v1/trust/reviews/:reviewId/subratings -- Get sub-ratings
  server.get(
    '/api/v1/trust/reviews/:reviewId/subratings',
    { preValidation: [validateParams(reviewIdParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { reviewId } = request.params as z.infer<typeof reviewIdParamsSchema>;

      // Verify review exists
      const review = await findReviewById(reviewId);
      if (!review || review.status === 'removed') {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Review not found',
          },
        });
      }

      const subratings = await findSubratingsByReviewId(reviewId);

      return reply.send({
        review_id: reviewId,
        subratings,
      });
    },
  );

  // 23. POST /api/v1/trust/reviews/:reviewId/response -- Business owner response
  server.post(
    '/api/v1/trust/reviews/:reviewId/response',
    {
      preValidation: [
        validateParams(reviewIdParamsSchema),
        validateBody(reviewResponseBodySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { reviewId } = request.params as z.infer<typeof reviewIdParamsSchema>;
      const { body: responseBody } = request.body as z.infer<typeof reviewResponseBodySchema>;

      // Verify review exists
      const review = await findReviewById(reviewId);
      if (!review || review.status === 'removed') {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Review not found',
          },
        });
      }

      // Check if a response already exists
      const existing = await findReviewResponse(reviewId);
      if (existing) {
        return reply.code(409).send({
          error: {
            code: 'RESPONSE_EXISTS',
            message: 'A response already exists for this review. Only one response per review is allowed.',
          },
        });
      }

      const response = await createReviewResponse({
        reviewId,
        userId,
        body: responseBody,
      });

      request.log.info(
        { userId, reviewId, responseId: response.response_id },
        'Review response posted',
      );

      return reply.code(201).send(response);
    },
  );

  // 24. GET /api/v1/trust/reviews (ENHANCED) -- Search reviews with filters
  // NOTE: This replaces the existing GET /api/v1/trust/reviews by using a
  // different handler when enhanced query params are present. We register
  // this as a separate route path to avoid conflict with the existing one.
  server.get(
    '/api/v1/trust/reviews/search',
    { preValidation: [validateQuery(enhancedListReviewsQuerySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const {
        entityId, travelerType, season, ratingMin, ratingMax,
        lang, sort, limit, offset,
      } = request.query as z.infer<typeof enhancedListReviewsQuerySchema>;

      const { data, total } = await searchReviews({
        entityId,
        travelerType,
        season,
        ratingMin,
        ratingMax,
        lang,
        sort,
        limit,
        offset,
      });

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
}
