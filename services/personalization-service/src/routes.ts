/**
 * Atlas One -- Personalization Service Routes
 *
 * API routes for traveler profile management, taste learning, and
 * personal rankings. All routes require authentication except health checks.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getProfile, updateProfile, addCelebrationDate, removeCelebrationDate, getUpcomingCelebrations, getProfileConfidenceBreakdown } from './traveler-profile.js';
import { processUserAction, type UserAction, type ActionType } from './taste-learning.js';
import { getPersonalRanking, getPropertyFit, type RankingScope, type GeographyFilter } from './personal-ranking.js';

// ---------------------------------------------------------------------------
// Route Registration
// ---------------------------------------------------------------------------

export async function registerRoutes(server: FastifyInstance): Promise<void> {
  // ── Profile Routes ──────────────────────────────────────────────

  /**
   * GET /api/v1/personalization/profile/:userId
   *
   * Retrieve a traveler's complete preference profile.
   */
  server.get(
    '/api/v1/personalization/profile/:userId',
    async (
      request: FastifyRequest<{ Params: { userId: string } }>,
      reply: FastifyReply,
    ) => {
      const { userId } = request.params;

      try {
        const profile = await getProfile(userId);
        const confidenceBreakdown = await getProfileConfidenceBreakdown(userId);
        const upcomingCelebrations = await getUpcomingCelebrations(userId, 90);

        return reply.code(200).send({
          profile,
          confidenceBreakdown,
          upcomingCelebrations,
        });
      } catch (err) {
        request.log.error({ err }, 'Failed to get profile');
        return reply.code(500).send({
          error: { code: 'PROFILE_FETCH_ERROR', message: 'Failed to retrieve profile' },
        });
      }
    },
  );

  /**
   * PUT /api/v1/personalization/profile/:userId
   *
   * Update a traveler's preference profile. Supports partial updates;
   * only the provided fields will be modified.
   */
  server.put(
    '/api/v1/personalization/profile/:userId',
    async (
      request: FastifyRequest<{
        Params: { userId: string };
        Body: Record<string, unknown>;
      }>,
      reply: FastifyReply,
    ) => {
      const { userId } = request.params;
      const body = request.body;

      if (!body || typeof body !== 'object') {
        return reply.code(400).send({
          error: { code: 'INVALID_BODY', message: 'Request body must be a JSON object' },
        });
      }

      try {
        const updated = await updateProfile(userId, body);
        return reply.code(200).send({ profile: updated });
      } catch (err) {
        request.log.error({ err }, 'Failed to update profile');
        return reply.code(500).send({
          error: { code: 'PROFILE_UPDATE_ERROR', message: 'Failed to update profile' },
        });
      }
    },
  );

  /**
   * POST /api/v1/personalization/profile/:userId/celebrations
   *
   * Add a celebration date to the profile.
   */
  server.post(
    '/api/v1/personalization/profile/:userId/celebrations',
    async (
      request: FastifyRequest<{
        Params: { userId: string };
        Body: {
          type: string;
          label: string;
          date: string;
          recurring: boolean;
          personName?: string;
          notes?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const { userId } = request.params;
      const body = request.body;

      if (!body.type || !body.label || !body.date) {
        return reply.code(400).send({
          error: { code: 'INVALID_BODY', message: 'type, label, and date are required' },
        });
      }

      try {
        const celebration = await addCelebrationDate(userId, {
          type: body.type as 'anniversary' | 'birthday' | 'graduation' | 'retirement' | 'honeymoon' | 'custom',
          label: body.label,
          date: body.date,
          recurring: body.recurring ?? true,
          personName: body.personName,
          notes: body.notes,
        });
        return reply.code(201).send({ celebration });
      } catch (err) {
        request.log.error({ err }, 'Failed to add celebration date');
        return reply.code(500).send({
          error: { code: 'CELEBRATION_ADD_ERROR', message: 'Failed to add celebration date' },
        });
      }
    },
  );

  /**
   * DELETE /api/v1/personalization/profile/:userId/celebrations/:dateId
   *
   * Remove a celebration date from the profile.
   */
  server.delete(
    '/api/v1/personalization/profile/:userId/celebrations/:dateId',
    async (
      request: FastifyRequest<{
        Params: { userId: string; dateId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { userId, dateId } = request.params;

      try {
        const removed = await removeCelebrationDate(userId, dateId);
        if (!removed) {
          return reply.code(404).send({
            error: { code: 'NOT_FOUND', message: 'Celebration date not found' },
          });
        }
        return reply.code(200).send({ removed: true });
      } catch (err) {
        request.log.error({ err }, 'Failed to remove celebration date');
        return reply.code(500).send({
          error: { code: 'CELEBRATION_REMOVE_ERROR', message: 'Failed to remove celebration date' },
        });
      }
    },
  );

  // ── Taste Learning Routes ─────────────────────────────────────

  /**
   * POST /api/v1/personalization/profile/:userId/learn
   *
   * Process a user action and update the profile via taste learning.
   * Action types: save, book, review, cancel, view, share, wishlist
   */
  server.post(
    '/api/v1/personalization/profile/:userId/learn',
    async (
      request: FastifyRequest<{
        Params: { userId: string };
        Body: {
          actionType: ActionType;
          entityType: 'property' | 'restaurant' | 'experience' | 'destination' | 'flight';
          entityId: string;
          entityMetadata: Record<string, unknown>;
          reviewData?: Record<string, unknown>;
          bookingData?: Record<string, unknown>;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const { userId } = request.params;
      const body = request.body;

      if (!body.actionType || !body.entityType || !body.entityId || !body.entityMetadata) {
        return reply.code(400).send({
          error: {
            code: 'INVALID_BODY',
            message: 'actionType, entityType, entityId, and entityMetadata are required',
          },
        });
      }

      const validActions: ActionType[] = ['save', 'book', 'review', 'cancel', 'view', 'share', 'wishlist'];
      if (!validActions.includes(body.actionType)) {
        return reply.code(400).send({
          error: {
            code: 'INVALID_ACTION',
            message: `actionType must be one of: ${validActions.join(', ')}`,
          },
        });
      }

      try {
        const action: UserAction = {
          userId,
          actionType: body.actionType,
          entityType: body.entityType,
          entityId: body.entityId,
          entityMetadata: body.entityMetadata as UserAction['entityMetadata'],
          reviewData: body.reviewData as UserAction['reviewData'],
          bookingData: body.bookingData as UserAction['bookingData'],
          timestamp: new Date().toISOString(),
        };

        const result = await processUserAction(action);
        return reply.code(200).send({ learningResult: result });
      } catch (err) {
        request.log.error({ err }, 'Failed to process learning action');
        return reply.code(500).send({
          error: { code: 'LEARNING_ERROR', message: 'Failed to process learning action' },
        });
      }
    },
  );

  // ── Personal Ranking Routes ───────────────────────────────────

  /**
   * GET /api/v1/personalization/rankings/personal/:userId/:scope/:geography
   *
   * Get personalized luxury rankings for a user.
   * Scope: all | hotels | resorts | villas | boutique | lodges
   * Geography: worldwide | europe | asia | africa | pacific | etc.
   */
  server.get(
    '/api/v1/personalization/rankings/personal/:userId/:scope/:geography',
    async (
      request: FastifyRequest<{
        Params: { userId: string; scope: string; geography: string };
        Querystring: { limit?: string; offset?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { userId, scope, geography } = request.params;
      const limit = parseInt(request.query.limit ?? '50', 10);
      const offset = parseInt(request.query.offset ?? '0', 10);

      const validScopes: RankingScope[] = ['all', 'hotels', 'resorts', 'villas', 'boutique', 'lodges'];
      if (!validScopes.includes(scope as RankingScope)) {
        return reply.code(400).send({
          error: {
            code: 'INVALID_SCOPE',
            message: `scope must be one of: ${validScopes.join(', ')}`,
          },
        });
      }

      try {
        const rankings = await getPersonalRanking(
          userId,
          scope as RankingScope,
          geography as GeographyFilter,
        );

        const paginated = rankings.slice(offset, offset + limit);

        return reply.code(200).send({
          rankings: paginated,
          total: rankings.length,
          limit,
          offset,
          userId,
          scope,
          geography,
        });
      } catch (err) {
        request.log.error({ err }, 'Failed to get personal rankings');
        return reply.code(500).send({
          error: { code: 'RANKING_ERROR', message: 'Failed to generate personal rankings' },
        });
      }
    },
  );

  /**
   * GET /api/v1/personalization/fit/:userId/:canonicalId
   *
   * Get the personal fit score for a specific property for a specific user.
   */
  server.get(
    '/api/v1/personalization/fit/:userId/:canonicalId',
    async (
      request: FastifyRequest<{
        Params: { userId: string; canonicalId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { userId, canonicalId } = request.params;

      try {
        const fit = await getPropertyFit(userId, canonicalId);

        if (!fit) {
          return reply.code(404).send({
            error: { code: 'PROPERTY_NOT_FOUND', message: 'Property not found in rankings' },
          });
        }

        return reply.code(200).send({ fit });
      } catch (err) {
        request.log.error({ err }, 'Failed to get property fit');
        return reply.code(500).send({
          error: { code: 'FIT_ERROR', message: 'Failed to compute property fit score' },
        });
      }
    },
  );

  // ── Profile Confidence Route ──────────────────────────────────

  /**
   * GET /api/v1/personalization/profile/:userId/confidence
   *
   * Get a breakdown of profile confidence by section.
   * Useful for prompting users to fill in missing preferences.
   */
  server.get(
    '/api/v1/personalization/profile/:userId/confidence',
    async (
      request: FastifyRequest<{ Params: { userId: string } }>,
      reply: FastifyReply,
    ) => {
      const { userId } = request.params;

      try {
        const breakdown = await getProfileConfidenceBreakdown(userId);
        const profile = await getProfile(userId);

        // Generate suggestions for improving profile
        const suggestions: string[] = [];
        if (breakdown['designTaste'] === 0) suggestions.push('Save or book a few properties to help us learn your design taste.');
        if (breakdown['dietaryProfile'] === 0) suggestions.push('Add your dietary restrictions and cuisine preferences.');
        if (breakdown['celebrationDates'] === 0) suggestions.push('Add important dates (anniversaries, birthdays) for personalized trip ideas.');
        if (breakdown['budgetTier'] === 0) suggestions.push('Book or browse properties to help us understand your budget range.');
        if (breakdown['wellnessPreferences'] === 0) suggestions.push('Tell us about your wellness preferences (spa, fitness, outdoor activities).');

        return reply.code(200).send({
          confidence: breakdown,
          dataPoints: profile.dataPointCount,
          suggestions,
        });
      } catch (err) {
        request.log.error({ err }, 'Failed to get profile confidence');
        return reply.code(500).send({
          error: { code: 'CONFIDENCE_ERROR', message: 'Failed to compute profile confidence' },
        });
      }
    },
  );
}
