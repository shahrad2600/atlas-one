import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z, validateBody, validateParams, validateQuery, uuidSchema } from '@atlas/validation';
import {
  // Wallet
  getOrCreateWallet,
  getWalletBalance,
  getTransactionHistory,
  earnTripCash,
  redeemTripCash,
  // Contributor Level
  getContributorLevel,
  recalculateLevel,
  getLeaderboard,
  // Category Expertise
  getCategoryExpertise,
  // Badges
  getAllBadges,
  getUserBadges,
  getBadgeProgress,
  setFeaturedBadges,
  // Achievements
  getAllAchievements,
  getUserAchievements,
  getAchievementProgress,
  // Challenges
  getActiveChallenges,
  getUserChallenges,
  joinChallenge,
  claimChallengeReward,
  // Referrals
  getReferralStats,
  applyReferralCode,
} from '../db/index.js';

// ── Validation Schemas ────────────────────────────────────────────────────

const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const transactionQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  type: z.enum(['earn', 'redeem', 'expire', 'bonus', 'adjustment']).optional(),
});

const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const categoryParamsSchema = z.object({
  category: z.string().min(1).max(50),
});

const challengeIdParamsSchema = z.object({
  challengeId: uuidSchema,
});

const challengeQuerySchema = z.object({
  status: z.enum(['active', 'completed', 'expired']).optional(),
});

const earnBodySchema = z.object({
  amount_cents: z.number().int().positive(),
  source: z.enum(['booking', 'review', 'photo', 'trip_plan', 'referral', 'challenge', 'promo']),
  reference_id: uuidSchema.optional(),
  description: z.string().max(500).optional(),
  expires_at: z.string().datetime({ offset: true }).optional(),
});

const redeemBodySchema = z.object({
  amount_cents: z.number().int().positive(),
  reference_id: uuidSchema.optional(),
  description: z.string().max(500).optional(),
});

const featuredBadgesBodySchema = z.object({
  badge_ids: z.array(uuidSchema).max(5),
});

const applyReferralBodySchema = z.object({
  referral_code: z.string().min(4).max(20),
});

// ── Route Registration ────────────────────────────────────────────────────

export async function registerRoutes(server: FastifyInstance): Promise<void> {

  // ── Status endpoint ──────────────────────────────────────────────
  server.get('/api/v1/loyalty/status', async () => ({
    service: 'loyalty-service',
    routes: [
      'wallet', 'transactions', 'earn', 'redeem',
      'level', 'leaderboard', 'expertise',
      'badges', 'achievements', 'challenges',
      'referral', 'overview',
    ],
  }));

  // ════════════════════════════════════════════════════════════════
  //  WALLET / TRIP CASH
  // ════════════════════════════════════════════════════════════════

  // ── 1. GET /api/v1/loyalty/wallet — Get wallet balance ──────────
  server.get(
    '/api/v1/loyalty/wallet',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      // Get or create the wallet
      const wallet = await getOrCreateWallet(user.sub);
      return reply.code(200).send({ wallet });
    },
  );

  // ── 2. GET /api/v1/loyalty/wallet/transactions — Transaction history ──
  server.get(
    '/api/v1/loyalty/wallet/transactions',
    { preValidation: [validateQuery(transactionQuerySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const qry = request.query as z.infer<typeof transactionQuerySchema>;

      // First get the wallet
      const wallet = await getWalletBalance(user.sub);
      if (!wallet) {
        return reply.code(200).send({ transactions: [], count: 0 });
      }

      const transactions = await getTransactionHistory(
        wallet.wallet_id as string,
        qry.type,
        qry.limit,
        qry.offset,
      );
      return reply.code(200).send({ transactions, count: transactions.length });
    },
  );

  // ── 3. POST /api/v1/loyalty/wallet/earn — Earn Trip Cash ────────
  server.post(
    '/api/v1/loyalty/wallet/earn',
    { preValidation: [validateBody(earnBodySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const body = request.body as z.infer<typeof earnBodySchema>;

      // Get or create the wallet
      const wallet = await getOrCreateWallet(user.sub);

      const tx = await earnTripCash({
        walletId: wallet.wallet_id as string,
        amountCents: body.amount_cents,
        source: body.source,
        referenceId: body.reference_id,
        description: body.description,
        expiresAt: body.expires_at,
      });

      request.log.info(
        { userId: user.sub, amountCents: body.amount_cents, source: body.source },
        'Trip Cash earned',
      );
      return reply.code(201).send({ transaction: tx });
    },
  );

  // ── 4. POST /api/v1/loyalty/wallet/redeem — Redeem Trip Cash ────
  server.post(
    '/api/v1/loyalty/wallet/redeem',
    { preValidation: [validateBody(redeemBodySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const body = request.body as z.infer<typeof redeemBodySchema>;

      // Get wallet
      const wallet = await getWalletBalance(user.sub);
      if (!wallet) {
        return reply.code(400).send({
          error: { code: 'NO_WALLET', message: 'No wallet found. Earn Trip Cash first.' },
        });
      }

      const tx = await redeemTripCash({
        walletId: wallet.wallet_id as string,
        amountCents: body.amount_cents,
        referenceId: body.reference_id,
        description: body.description,
      });

      if (!tx) {
        return reply.code(400).send({
          error: {
            code: 'INSUFFICIENT_BALANCE',
            message: `Insufficient Trip Cash balance. Current: ${String(wallet.balance_cents)} cents, requested: ${String(body.amount_cents)} cents`,
          },
        });
      }

      request.log.info(
        { userId: user.sub, amountCents: body.amount_cents },
        'Trip Cash redeemed',
      );
      return reply.code(200).send({ transaction: tx });
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  CONTRIBUTOR LEVEL
  // ════════════════════════════════════════════════════════════════

  // ── 5. GET /api/v1/loyalty/level — Get contributor level + stats ──
  server.get(
    '/api/v1/loyalty/level',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const level = await getContributorLevel(user.sub);

      // Also recalculate level to ensure it's accurate
      const recalculated = await recalculateLevel(user.sub);

      const levelNames: Record<number, string> = {
        1: 'First-timer',
        2: 'Reviewer',
        3: 'Senior Reviewer',
        4: 'Expert',
        5: 'Master',
        6: 'Superstar',
      };

      const data = recalculated ?? level;
      return reply.code(200).send({
        level: data,
        level_name: levelNames[(data?.level as number) ?? 1] ?? 'First-timer',
        next_level_reviews: getNextLevelThreshold((data?.level as number) ?? 1),
      });
    },
  );

  // ── 6. GET /api/v1/loyalty/leaderboard — Top contributors ──────
  server.get(
    '/api/v1/loyalty/leaderboard',
    { preValidation: [validateQuery(leaderboardQuerySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const qry = request.query as z.infer<typeof leaderboardQuerySchema>;
      const leaderboard = await getLeaderboard(qry.limit);
      return reply.code(200).send({ leaderboard, count: leaderboard.length });
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  CATEGORY EXPERTISE
  // ════════════════════════════════════════════════════════════════

  // ── 7. GET /api/v1/loyalty/expertise — Get all category expertise ──
  server.get(
    '/api/v1/loyalty/expertise',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const expertise = await getCategoryExpertise(user.sub);

      const expertiseLevelNames: Record<number, string> = {
        0: 'None',
        1: 'Beginner',
        2: 'Intermediate',
        3: 'Expert',
        4: 'Top Contributor',
      };

      const enriched = expertise.map((e: Record<string, unknown>) => ({
        ...e,
        expertise_level_name: expertiseLevelNames[(e.expertise_level as number) ?? 0] ?? 'None',
      }));

      return reply.code(200).send({ expertise: enriched, count: enriched.length });
    },
  );

  // ── 8. GET /api/v1/loyalty/expertise/:category — Specific category ──
  server.get(
    '/api/v1/loyalty/expertise/:category',
    { preValidation: [validateParams(categoryParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const params = request.params as z.infer<typeof categoryParamsSchema>;
      const expertise = await getCategoryExpertise(user.sub);
      const found = expertise.find(
        (e: Record<string, unknown>) => e.category === params.category,
      );

      if (!found) {
        return reply.code(200).send({
          expertise: null,
          category: params.category,
          message: 'No expertise in this category yet',
        });
      }

      const expertiseLevelNames: Record<number, string> = {
        0: 'None',
        1: 'Beginner',
        2: 'Intermediate',
        3: 'Expert',
        4: 'Top Contributor',
      };

      return reply.code(200).send({
        expertise: {
          ...found,
          expertise_level_name: expertiseLevelNames[(found.expertise_level as number) ?? 0] ?? 'None',
        },
      });
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  BADGES
  // ════════════════════════════════════════════════════════════════

  // ── 9. GET /api/v1/loyalty/badges — All available badges ────────
  server.get(
    '/api/v1/loyalty/badges',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const badges = await getAllBadges();
      return reply.code(200).send({ badges, count: badges.length });
    },
  );

  // ── 10. GET /api/v1/loyalty/badges/earned — User's earned badges ──
  server.get(
    '/api/v1/loyalty/badges/earned',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const badges = await getUserBadges(user.sub);
      const featured = badges.filter((b: Record<string, unknown>) => b.is_featured);
      return reply.code(200).send({
        badges,
        count: badges.length,
        featured,
        featured_count: featured.length,
      });
    },
  );

  // ── 11. GET /api/v1/loyalty/badges/progress — Badge progress ────
  server.get(
    '/api/v1/loyalty/badges/progress',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const progress = await getBadgeProgress(user.sub);
      return reply.code(200).send({ progress, count: progress.length });
    },
  );

  // ── 12. PATCH /api/v1/loyalty/badges/featured — Set featured badges ──
  server.patch(
    '/api/v1/loyalty/badges/featured',
    { preValidation: [validateBody(featuredBadgesBodySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const body = request.body as z.infer<typeof featuredBadgesBodySchema>;

      if (body.badge_ids.length > 5) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Maximum 5 featured badges allowed',
          },
        });
      }

      const featured = await setFeaturedBadges(user.sub, body.badge_ids);
      request.log.info(
        { userId: user.sub, badgeCount: body.badge_ids.length },
        'Featured badges updated',
      );
      return reply.code(200).send({ featured, count: featured.length });
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  ACHIEVEMENTS
  // ════════════════════════════════════════════════════════════════

  // ── 13. GET /api/v1/loyalty/achievements — All achievements (with unlock status) ──
  server.get(
    '/api/v1/loyalty/achievements',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        // For unauthenticated users, just show all achievements without progress
        const achievements = await getAllAchievements();
        return reply.code(200).send({ achievements, count: achievements.length });
      }

      // For authenticated users, include progress
      const progress = await getAchievementProgress(user.sub);
      return reply.code(200).send({ achievements: progress, count: progress.length });
    },
  );

  // ── 14. GET /api/v1/loyalty/achievements/earned — User's unlocked achievements ──
  server.get(
    '/api/v1/loyalty/achievements/earned',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const achievements = await getUserAchievements(user.sub);
      return reply.code(200).send({ achievements, count: achievements.length });
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  CHALLENGES
  // ════════════════════════════════════════════════════════════════

  // ── 15. GET /api/v1/loyalty/challenges — Active challenges ──────
  server.get(
    '/api/v1/loyalty/challenges',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const challenges = await getActiveChallenges();
      return reply.code(200).send({ challenges, count: challenges.length });
    },
  );

  // ── 16. GET /api/v1/loyalty/challenges/mine — User's challenges ──
  server.get(
    '/api/v1/loyalty/challenges/mine',
    { preValidation: [validateQuery(challengeQuerySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const qry = request.query as z.infer<typeof challengeQuerySchema>;
      const challenges = await getUserChallenges(user.sub, qry.status);
      return reply.code(200).send({ challenges, count: challenges.length });
    },
  );

  // ── 17. POST /api/v1/loyalty/challenges/:challengeId/join — Join ──
  server.post(
    '/api/v1/loyalty/challenges/:challengeId/join',
    { preValidation: [validateParams(challengeIdParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const params = request.params as z.infer<typeof challengeIdParamsSchema>;
      const result = await joinChallenge(user.sub, params.challengeId);

      if (!result) {
        return reply.code(400).send({
          error: {
            code: 'JOIN_FAILED',
            message: 'Unable to join challenge. It may be full, expired, or you have already joined.',
          },
        });
      }

      request.log.info(
        { userId: user.sub, challengeId: params.challengeId },
        'Challenge joined',
      );
      return reply.code(201).send({ challenge: result });
    },
  );

  // ── 18. POST /api/v1/loyalty/challenges/:challengeId/claim — Claim reward ──
  server.post(
    '/api/v1/loyalty/challenges/:challengeId/claim',
    { preValidation: [validateParams(challengeIdParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const params = request.params as z.infer<typeof challengeIdParamsSchema>;
      const result = await claimChallengeReward(user.sub, params.challengeId);

      if (!result) {
        return reply.code(400).send({
          error: {
            code: 'CLAIM_FAILED',
            message: 'Unable to claim reward. Challenge may not be completed or already claimed.',
          },
        });
      }

      request.log.info(
        { userId: user.sub, challengeId: params.challengeId, reward: result },
        'Challenge reward claimed',
      );
      return reply.code(200).send({ reward: result });
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  REFERRALS
  // ════════════════════════════════════════════════════════════════

  // ── 19. GET /api/v1/loyalty/referral — Get referral code + stats ──
  server.get(
    '/api/v1/loyalty/referral',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const stats = await getReferralStats(user.sub);
      return reply.code(200).send({ referral: stats });
    },
  );

  // ── 20. POST /api/v1/loyalty/referral/apply — Apply referral code ──
  server.post(
    '/api/v1/loyalty/referral/apply',
    { preValidation: [validateBody(applyReferralBodySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const body = request.body as z.infer<typeof applyReferralBodySchema>;
      const result = await applyReferralCode(user.sub, body.referral_code);

      if (!result) {
        return reply.code(400).send({
          error: {
            code: 'REFERRAL_FAILED',
            message: 'Invalid referral code, already referred, or cannot refer yourself.',
          },
        });
      }

      request.log.info(
        { userId: user.sub, referralCode: body.referral_code },
        'Referral code applied',
      );
      return reply.code(201).send({ referral: result });
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  OVERVIEW
  // ════════════════════════════════════════════════════════════════

  // ── 21. GET /api/v1/loyalty/overview — Full loyalty summary ─────
  server.get(
    '/api/v1/loyalty/overview',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      // Fetch all loyalty data in parallel for performance
      const [wallet, level, badges, achievements, activeChallenges, userChallenges] =
        await Promise.all([
          getOrCreateWallet(user.sub),
          getContributorLevel(user.sub),
          getUserBadges(user.sub),
          getUserAchievements(user.sub),
          getActiveChallenges(),
          getUserChallenges(user.sub, 'active'),
        ]);

      // Recalculate level
      const recalculated = await recalculateLevel(user.sub);
      const levelData = recalculated ?? level;

      const levelNames: Record<number, string> = {
        1: 'First-timer',
        2: 'Reviewer',
        3: 'Senior Reviewer',
        4: 'Expert',
        5: 'Master',
        6: 'Superstar',
      };

      const featuredBadges = badges.filter((b: Record<string, unknown>) => b.is_featured);

      return reply.code(200).send({
        wallet: {
          balance_cents: wallet.balance_cents,
          lifetime_earned_cents: wallet.lifetime_earned_cents,
          lifetime_redeemed_cents: wallet.lifetime_redeemed_cents,
        },
        level: {
          current_level: levelData?.level ?? 1,
          level_name: levelNames[(levelData?.level as number) ?? 1] ?? 'First-timer',
          total_contribution_points: levelData?.total_contribution_points ?? 0,
          review_count: levelData?.review_count ?? 0,
          photo_count: levelData?.photo_count ?? 0,
          next_level_reviews: getNextLevelThreshold((levelData?.level as number) ?? 1),
        },
        badges: {
          total_earned: badges.length,
          featured: featuredBadges,
          recent: badges.slice(0, 5),
        },
        achievements: {
          total_unlocked: achievements.length,
          recent: achievements.slice(0, 5),
        },
        challenges: {
          available: activeChallenges.length,
          active: userChallenges.length,
          active_challenges: userChallenges.slice(0, 5),
        },
      });
    },
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Get the review count needed for the next level.
 * Returns null if already at max level.
 */
function getNextLevelThreshold(currentLevel: number): number | null {
  const thresholds: Record<number, number> = {
    1: 3,   // Need 3 reviews for level 2
    2: 10,  // Need 10 reviews for level 3
    3: 25,  // Need 25 reviews for level 4
    4: 50,  // Need 50 reviews for level 5
    5: 100, // Need 100 reviews for level 6
    6: null as unknown as number, // Already at max
  };
  return thresholds[currentLevel] ?? null;
}
