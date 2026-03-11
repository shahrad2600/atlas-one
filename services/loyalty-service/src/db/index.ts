import { getPool, query, transaction } from '@atlas/database';
import type { Pool, PoolClient } from '@atlas/database';

const pool: Pool = getPool();

// ════════════════════════════════════════════════════════════════════════════
//  WALLET / TRIP CASH
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get or create a loyalty wallet for a user. Uses ON CONFLICT for idempotency.
 */
export async function getOrCreateWallet(userId: string) {
  const result = await query(
    pool,
    `INSERT INTO loyalty.loyalty_wallet (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [userId],
  );
  return result.rows[0];
}

/**
 * Get the current wallet balance for a user.
 */
export async function getWalletBalance(userId: string) {
  const result = await query(
    pool,
    `SELECT wallet_id, user_id, balance_cents, lifetime_earned_cents, lifetime_redeemed_cents,
            created_at, updated_at
     FROM loyalty.loyalty_wallet
     WHERE user_id = $1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

/**
 * Get transaction history for a wallet, optionally filtered by type.
 */
export async function getTransactionHistory(
  walletId: string,
  type: string | undefined,
  limit: number,
  offset: number,
) {
  if (type) {
    const result = await query(
      pool,
      `SELECT * FROM loyalty.loyalty_transaction
       WHERE wallet_id = $1 AND type = $2
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [walletId, type, limit, offset],
    );
    return result.rows;
  }

  const result = await query(
    pool,
    `SELECT * FROM loyalty.loyalty_transaction
     WHERE wallet_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [walletId, limit, offset],
  );
  return result.rows;
}

/**
 * Earn Trip Cash. Atomically creates a transaction and updates wallet balances.
 */
export async function earnTripCash(params: {
  walletId: string;
  amountCents: number;
  source: string;
  referenceId?: string;
  description?: string;
  expiresAt?: string;
}) {
  return transaction(pool, async (client: PoolClient) => {
    // Create the transaction record
    const txResult = await client.query(
      `INSERT INTO loyalty.loyalty_transaction
         (wallet_id, type, amount_cents, source, reference_id, description, expires_at)
       VALUES ($1, 'earn', $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        params.walletId,
        params.amountCents,
        params.source,
        params.referenceId ?? null,
        params.description ?? null,
        params.expiresAt ?? null,
      ],
    );

    // Update wallet balance
    await client.query(
      `UPDATE loyalty.loyalty_wallet
       SET balance_cents = balance_cents + $1,
           lifetime_earned_cents = lifetime_earned_cents + $1,
           updated_at = NOW()
       WHERE wallet_id = $2`,
      [params.amountCents, params.walletId],
    );

    return txResult.rows[0];
  });
}

/**
 * Redeem Trip Cash. Validates sufficient balance before deducting.
 * Returns the transaction record or null if insufficient balance.
 */
export async function redeemTripCash(params: {
  walletId: string;
  amountCents: number;
  referenceId?: string;
  description?: string;
}) {
  return transaction(pool, async (client: PoolClient) => {
    // Check current balance with a row lock
    const walletResult = await client.query(
      `SELECT balance_cents FROM loyalty.loyalty_wallet
       WHERE wallet_id = $1
       FOR UPDATE`,
      [params.walletId],
    );

    const wallet = walletResult.rows[0];
    if (!wallet || wallet.balance_cents < params.amountCents) {
      return null; // Insufficient balance
    }

    // Create the transaction record (negative amount for redemption)
    const txResult = await client.query(
      `INSERT INTO loyalty.loyalty_transaction
         (wallet_id, type, amount_cents, source, reference_id, description)
       VALUES ($1, 'redeem', $2, 'redemption', $3, $4)
       RETURNING *`,
      [
        params.walletId,
        -params.amountCents,
        params.referenceId ?? null,
        params.description ?? null,
      ],
    );

    // Update wallet balance
    await client.query(
      `UPDATE loyalty.loyalty_wallet
       SET balance_cents = balance_cents - $1,
           lifetime_redeemed_cents = lifetime_redeemed_cents + $1,
           updated_at = NOW()
       WHERE wallet_id = $2`,
      [params.amountCents, params.walletId],
    );

    return txResult.rows[0];
  });
}

/**
 * Batch expire old Trip Cash. Finds all un-expired transactions that are past
 * their expiration date, marks them expired, and deducts from wallet balances.
 * Returns the number of expired transactions.
 */
export async function expireOldTripCash(): Promise<number> {
  return transaction(pool, async (client: PoolClient) => {
    // Find all expired, un-processed earn transactions
    const expiredResult = await client.query(
      `SELECT transaction_id, wallet_id, amount_cents
       FROM loyalty.loyalty_transaction
       WHERE type = 'earn'
         AND is_expired = FALSE
         AND expires_at IS NOT NULL
         AND expires_at < NOW()`,
    );

    if (expiredResult.rows.length === 0) return 0;

    // Mark them as expired
    const txIds = expiredResult.rows.map((r: Record<string, unknown>) => r.transaction_id);
    await client.query(
      `UPDATE loyalty.loyalty_transaction
       SET is_expired = TRUE
       WHERE transaction_id = ANY($1::uuid[])`,
      [txIds],
    );

    // Group by wallet and deduct balances
    const walletDeductions = new Map<string, number>();
    for (const row of expiredResult.rows) {
      const current = walletDeductions.get(row.wallet_id as string) ?? 0;
      walletDeductions.set(row.wallet_id as string, current + (row.amount_cents as number));
    }

    for (const [walletId, totalDeduction] of walletDeductions) {
      // Create an expire transaction
      await client.query(
        `INSERT INTO loyalty.loyalty_transaction
           (wallet_id, type, amount_cents, source, description)
         VALUES ($1, 'expire', $2, 'expiration', 'Trip Cash expired')`,
        [walletId, -totalDeduction],
      );

      // Deduct from wallet (never go below zero)
      await client.query(
        `UPDATE loyalty.loyalty_wallet
         SET balance_cents = GREATEST(balance_cents - $1, 0),
             updated_at = NOW()
         WHERE wallet_id = $2`,
        [totalDeduction, walletId],
      );
    }

    return expiredResult.rows.length;
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  CONTRIBUTOR LEVEL
// ════════════════════════════════════════════════════════════════════════════

/**
 * Level thresholds based on review count:
 * 1=First-timer (0), 2=Reviewer (3), 3=Senior (10), 4=Expert (25), 5=Master (50), 6=Superstar (100)
 */
const LEVEL_THRESHOLDS = [
  { level: 6, reviews: 100 },
  { level: 5, reviews: 50 },
  { level: 4, reviews: 25 },
  { level: 3, reviews: 10 },
  { level: 2, reviews: 3 },
  { level: 1, reviews: 0 },
];

/**
 * Get or create contributor level for a user.
 */
export async function getContributorLevel(userId: string) {
  const result = await query(
    pool,
    `INSERT INTO loyalty.loyalty_contributor_level (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );

  const levelResult = await query(
    pool,
    `SELECT * FROM loyalty.loyalty_contributor_level WHERE user_id = $1`,
    [userId],
  );
  return levelResult.rows[0] ?? null;
}

/**
 * Update a contributor stat field and recalculate total points.
 * Valid fields: review_count, photo_count, helpful_vote_count, forum_post_count, qa_answer_count
 */
export async function updateContributorStats(
  userId: string,
  field: string,
  increment: number,
) {
  // Validate field name to prevent SQL injection
  const validFields = [
    'review_count', 'photo_count', 'helpful_vote_count',
    'forum_post_count', 'qa_answer_count',
  ];
  if (!validFields.includes(field)) {
    throw new Error(`Invalid contributor stat field: ${field}`);
  }

  return transaction(pool, async (client: PoolClient) => {
    // Ensure the level row exists
    await client.query(
      `INSERT INTO loyalty.loyalty_contributor_level (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );

    // Update the specific field
    await client.query(
      `UPDATE loyalty.loyalty_contributor_level
       SET ${field} = ${field} + $1
       WHERE user_id = $2`,
      [increment, userId],
    );

    // Recalculate total contribution points
    // Points formula: reviews=10, photos=5, helpful_votes=3, forum_posts=5, qa_answers=8
    await client.query(
      `UPDATE loyalty.loyalty_contributor_level
       SET total_contribution_points = (
         review_count * 10 +
         photo_count * 5 +
         helpful_vote_count * 3 +
         forum_post_count * 5 +
         qa_answer_count * 8
       )
       WHERE user_id = $1`,
      [userId],
    );

    // Fetch updated row
    const result = await client.query(
      `SELECT * FROM loyalty.loyalty_contributor_level WHERE user_id = $1`,
      [userId],
    );
    return result.rows[0];
  });
}

/**
 * Recalculate the contributor level based on review count thresholds.
 */
export async function recalculateLevel(userId: string) {
  return transaction(pool, async (client: PoolClient) => {
    const result = await client.query(
      `SELECT * FROM loyalty.loyalty_contributor_level WHERE user_id = $1 FOR UPDATE`,
      [userId],
    );

    const row = result.rows[0];
    if (!row) return null;

    const reviewCount = row.review_count as number;
    let newLevel = 1;
    for (const threshold of LEVEL_THRESHOLDS) {
      if (reviewCount >= threshold.reviews) {
        newLevel = threshold.level;
        break;
      }
    }

    if (newLevel !== row.level) {
      await client.query(
        `UPDATE loyalty.loyalty_contributor_level
         SET level = $1, level_updated_at = NOW()
         WHERE user_id = $2`,
        [newLevel, userId],
      );
    }

    const updated = await client.query(
      `SELECT * FROM loyalty.loyalty_contributor_level WHERE user_id = $1`,
      [userId],
    );
    return updated.rows[0];
  });
}

/**
 * Get the top contributors leaderboard.
 */
export async function getLeaderboard(limit: number) {
  const result = await query(
    pool,
    `SELECT cl.*, p.display_name, p.avatar_url
     FROM loyalty.loyalty_contributor_level cl
     LEFT JOIN social.social_profile p ON p.user_id = cl.user_id
     ORDER BY cl.total_contribution_points DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows;
}

// ════════════════════════════════════════════════════════════════════════════
//  CATEGORY EXPERTISE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get all category expertise entries for a user.
 */
export async function getCategoryExpertise(userId: string) {
  const result = await query(
    pool,
    `SELECT * FROM loyalty.loyalty_category_expertise
     WHERE user_id = $1
     ORDER BY expertise_level DESC, review_count DESC`,
    [userId],
  );
  return result.rows;
}

/**
 * Update category expertise for a user. Recalculates expertise level based on review count:
 * 0=none (0-2), 1=beginner (3-9), 2=intermediate (10-19), 3=expert (20-49), 4=top_contributor (50+)
 */
export async function updateCategoryExpertise(
  userId: string,
  category: string,
  reviewCount: number,
) {
  let expertiseLevel = 0;
  if (reviewCount >= 50) expertiseLevel = 4;
  else if (reviewCount >= 20) expertiseLevel = 3;
  else if (reviewCount >= 10) expertiseLevel = 2;
  else if (reviewCount >= 3) expertiseLevel = 1;

  const result = await query(
    pool,
    `INSERT INTO loyalty.loyalty_category_expertise
       (user_id, category, review_count, expertise_level, last_reviewed_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id, category) DO UPDATE SET
       review_count = $3,
       expertise_level = $4,
       last_reviewed_at = NOW()
     RETURNING *`,
    [userId, category, reviewCount, expertiseLevel],
  );
  return result.rows[0];
}

// ════════════════════════════════════════════════════════════════════════════
//  BADGES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get all available badge definitions.
 */
export async function getAllBadges() {
  const result = await query(
    pool,
    `SELECT * FROM loyalty.loyalty_badge_definition
     WHERE is_active = TRUE
     ORDER BY sort_order ASC`,
    [],
  );
  return result.rows;
}

/**
 * Get all badges earned by a user.
 */
export async function getUserBadges(userId: string) {
  const result = await query(
    pool,
    `SELECT ub.*, bd.slug, bd.name, bd.description, bd.icon_url,
            bd.category, bd.tier, bd.requirement_type, bd.requirement_value
     FROM loyalty.loyalty_user_badge ub
     INNER JOIN loyalty.loyalty_badge_definition bd ON bd.badge_id = ub.badge_id
     WHERE ub.user_id = $1
     ORDER BY ub.earned_at DESC`,
    [userId],
  );
  return result.rows;
}

/**
 * Get badge progress for a user (in-progress badges not yet earned).
 */
export async function getBadgeProgress(userId: string) {
  const result = await query(
    pool,
    `SELECT bp.*, bd.slug, bd.name, bd.description, bd.icon_url,
            bd.category, bd.tier, bd.requirement_type, bd.requirement_value
     FROM loyalty.loyalty_badge_progress bp
     INNER JOIN loyalty.loyalty_badge_definition bd ON bd.badge_id = bp.badge_id
     WHERE bp.user_id = $1
       AND bp.percentage < 100
     ORDER BY bp.percentage DESC`,
    [userId],
  );
  return result.rows;
}

/**
 * Award a badge to a user. Uses ON CONFLICT for idempotency.
 */
export async function awardBadge(userId: string, badgeId: string) {
  const result = await query(
    pool,
    `INSERT INTO loyalty.loyalty_user_badge (user_id, badge_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, badge_id) DO NOTHING
     RETURNING *`,
    [userId, badgeId],
  );
  return result.rows[0] ?? null;
}

/**
 * Update badge progress for a user. Calculates percentage automatically.
 */
export async function updateBadgeProgress(
  userId: string,
  badgeId: string,
  currentValue: number,
  targetValue: number,
) {
  const percentage = Math.min((currentValue / targetValue) * 100, 100);

  const result = await query(
    pool,
    `INSERT INTO loyalty.loyalty_badge_progress
       (user_id, badge_id, current_value, target_value, percentage)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, badge_id) DO UPDATE SET
       current_value = $3,
       target_value = $4,
       percentage = $5,
       updated_at = NOW()
     RETURNING *`,
    [userId, badgeId, currentValue, targetValue, percentage],
  );
  return result.rows[0];
}

/**
 * Set featured badges for a user. Enforces a max of 5.
 */
export async function setFeaturedBadges(userId: string, badgeIds: string[]) {
  if (badgeIds.length > 5) {
    throw new Error('Maximum 5 featured badges allowed');
  }

  return transaction(pool, async (client: PoolClient) => {
    // Unfeatured all current badges
    await client.query(
      `UPDATE loyalty.loyalty_user_badge
       SET is_featured = FALSE
       WHERE user_id = $1`,
      [userId],
    );

    // Feature the selected badges
    if (badgeIds.length > 0) {
      await client.query(
        `UPDATE loyalty.loyalty_user_badge
         SET is_featured = TRUE
         WHERE user_id = $1 AND badge_id = ANY($2::uuid[])`,
        [userId, badgeIds],
      );
    }

    // Return updated badges
    const result = await client.query(
      `SELECT ub.*, bd.slug, bd.name, bd.description, bd.icon_url,
              bd.category, bd.tier
       FROM loyalty.loyalty_user_badge ub
       INNER JOIN loyalty.loyalty_badge_definition bd ON bd.badge_id = ub.badge_id
       WHERE ub.user_id = $1 AND ub.is_featured = TRUE
       ORDER BY ub.earned_at ASC`,
      [userId],
    );
    return result.rows;
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  ACHIEVEMENTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get all achievement definitions.
 */
export async function getAllAchievements() {
  const result = await query(
    pool,
    `SELECT * FROM loyalty.loyalty_achievement
     WHERE is_active = TRUE
     ORDER BY sort_order ASC`,
    [],
  );
  return result.rows;
}

/**
 * Get achievements unlocked by a user.
 */
export async function getUserAchievements(userId: string) {
  const result = await query(
    pool,
    `SELECT ua.*, a.slug, a.name, a.description, a.icon_url,
            a.category, a.points, a.trip_cash_cents
     FROM loyalty.loyalty_user_achievement ua
     INNER JOIN loyalty.loyalty_achievement a ON a.achievement_id = ua.achievement_id
     WHERE ua.user_id = $1
     ORDER BY ua.unlocked_at DESC`,
    [userId],
  );
  return result.rows;
}

/**
 * Unlock an achievement for a user. Uses ON CONFLICT for idempotency.
 * Returns the achievement row or null if already unlocked.
 */
export async function unlockAchievement(userId: string, achievementId: string) {
  const result = await query(
    pool,
    `INSERT INTO loyalty.loyalty_user_achievement (user_id, achievement_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, achievement_id) DO NOTHING
     RETURNING *`,
    [userId, achievementId],
  );
  return result.rows[0] ?? null;
}

/**
 * Get achievement progress for a user by checking each achievement's requirement
 * against the user's contributor stats.
 */
export async function getAchievementProgress(userId: string) {
  // Get all achievements and the user's current stats
  const [achievements, level, userAchievements] = await Promise.all([
    getAllAchievements(),
    getContributorLevel(userId),
    getUserAchievements(userId),
  ]);

  const unlockedIds = new Set(
    userAchievements.map((ua: Record<string, unknown>) => ua.achievement_id),
  );

  return achievements.map((a: Record<string, unknown>) => {
    const requirement = a.requirement as { type: string; value: number };
    let currentValue = 0;

    if (level) {
      switch (requirement.type) {
        case 'total_contributions':
          currentValue = (level.total_contribution_points as number) ?? 0;
          break;
        case 'review_count':
          currentValue = (level.review_count as number) ?? 0;
          break;
        case 'photo_count':
          currentValue = (level.photo_count as number) ?? 0;
          break;
        default:
          currentValue = 0;
      }
    }

    return {
      ...a,
      unlocked: unlockedIds.has(a.achievement_id),
      current_value: currentValue,
      target_value: requirement.value,
      percentage: Math.min((currentValue / requirement.value) * 100, 100),
    };
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  CHALLENGES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get all active challenges (within date range and active flag).
 */
export async function getActiveChallenges() {
  const result = await query(
    pool,
    `SELECT * FROM loyalty.loyalty_challenge
     WHERE is_active = TRUE
       AND starts_at <= NOW()
       AND ends_at > NOW()
     ORDER BY ends_at ASC`,
    [],
  );
  return result.rows;
}

/**
 * Get challenges for a user, optionally filtered by status.
 */
export async function getUserChallenges(userId: string, status?: string) {
  if (status) {
    const result = await query(
      pool,
      `SELECT uc.*, c.name, c.description, c.icon_url, c.challenge_type,
              c.reward_trip_cash_cents, c.reward_points, c.starts_at, c.ends_at
       FROM loyalty.loyalty_user_challenge uc
       INNER JOIN loyalty.loyalty_challenge c ON c.challenge_id = uc.challenge_id
       WHERE uc.user_id = $1 AND uc.status = $2
       ORDER BY uc.joined_at DESC`,
      [userId, status],
    );
    return result.rows;
  }

  const result = await query(
    pool,
    `SELECT uc.*, c.name, c.description, c.icon_url, c.challenge_type,
            c.reward_trip_cash_cents, c.reward_points, c.starts_at, c.ends_at
     FROM loyalty.loyalty_user_challenge uc
     INNER JOIN loyalty.loyalty_challenge c ON c.challenge_id = uc.challenge_id
     WHERE uc.user_id = $1
     ORDER BY uc.joined_at DESC`,
    [userId],
  );
  return result.rows;
}

/**
 * Join a challenge. Validates the challenge is active and has capacity.
 */
export async function joinChallenge(userId: string, challengeId: string) {
  return transaction(pool, async (client: PoolClient) => {
    // Lock the challenge row and check capacity
    const challengeResult = await client.query(
      `SELECT * FROM loyalty.loyalty_challenge
       WHERE challenge_id = $1
         AND is_active = TRUE
         AND starts_at <= NOW()
         AND ends_at > NOW()
       FOR UPDATE`,
      [challengeId],
    );

    const challenge = challengeResult.rows[0];
    if (!challenge) return null;

    // Check max participants
    if (
      challenge.max_participants !== null &&
      (challenge.current_participants as number) >= (challenge.max_participants as number)
    ) {
      return null; // Challenge is full
    }

    // Get the target value from the challenge requirement
    const requirement = challenge.requirement as { value: number };
    const targetValue = requirement.value ?? 1;

    // Join the challenge
    const result = await client.query(
      `INSERT INTO loyalty.loyalty_user_challenge
         (user_id, challenge_id, target_value)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, challenge_id) DO NOTHING
       RETURNING *`,
      [userId, challengeId, targetValue],
    );

    // Increment participant count if a new row was inserted
    if (result.rowCount && result.rowCount > 0) {
      await client.query(
        `UPDATE loyalty.loyalty_challenge
         SET current_participants = current_participants + 1
         WHERE challenge_id = $1`,
        [challengeId],
      );
    }

    return result.rows[0] ?? null;
  });
}

/**
 * Update challenge progress for a user.
 */
export async function updateChallengeProgress(
  userId: string,
  challengeId: string,
  progressValue: number,
) {
  return transaction(pool, async (client: PoolClient) => {
    const result = await client.query(
      `UPDATE loyalty.loyalty_user_challenge
       SET progress_value = $3
       WHERE user_id = $1 AND challenge_id = $2 AND status = 'active'
       RETURNING *`,
      [userId, challengeId, progressValue],
    );

    const row = result.rows[0];
    if (!row) return null;

    // Auto-complete if progress meets target
    if (progressValue >= (row.target_value as number)) {
      await client.query(
        `UPDATE loyalty.loyalty_user_challenge
         SET status = 'completed', completed_at = NOW()
         WHERE user_challenge_id = $1`,
        [row.user_challenge_id],
      );
      row.status = 'completed';
      row.completed_at = new Date().toISOString();
    }

    return row;
  });
}

/**
 * Complete a challenge (mark as completed).
 */
export async function completeChallenge(userId: string, challengeId: string) {
  const result = await query(
    pool,
    `UPDATE loyalty.loyalty_user_challenge
     SET status = 'completed', completed_at = NOW()
     WHERE user_id = $1 AND challenge_id = $2 AND status = 'active'
     RETURNING *`,
    [userId, challengeId],
  );
  return result.rows[0] ?? null;
}

/**
 * Claim the reward for a completed challenge. Awards Trip Cash and/or points.
 */
export async function claimChallengeReward(userId: string, challengeId: string) {
  return transaction(pool, async (client: PoolClient) => {
    // Get the user challenge and verify it's completed and unclaimed
    const ucResult = await client.query(
      `SELECT uc.*, c.reward_trip_cash_cents, c.reward_badge_id, c.reward_points
       FROM loyalty.loyalty_user_challenge uc
       INNER JOIN loyalty.loyalty_challenge c ON c.challenge_id = uc.challenge_id
       WHERE uc.user_id = $1 AND uc.challenge_id = $2
         AND uc.status = 'completed'
         AND uc.reward_claimed = FALSE
       FOR UPDATE`,
      [userId, challengeId],
    );

    const uc = ucResult.rows[0];
    if (!uc) return null;

    // Mark as claimed
    await client.query(
      `UPDATE loyalty.loyalty_user_challenge
       SET reward_claimed = TRUE
       WHERE user_challenge_id = $1`,
      [uc.user_challenge_id],
    );

    // Award Trip Cash if any
    if (uc.reward_trip_cash_cents && (uc.reward_trip_cash_cents as number) > 0) {
      // Get or create wallet
      const walletResult = await client.query(
        `INSERT INTO loyalty.loyalty_wallet (user_id)
         VALUES ($1)
         ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
         RETURNING wallet_id`,
        [userId],
      );
      const walletId = walletResult.rows[0].wallet_id;

      await client.query(
        `INSERT INTO loyalty.loyalty_transaction
           (wallet_id, type, amount_cents, source, reference_id, description)
         VALUES ($1, 'bonus', $2, 'challenge', $3, 'Challenge reward')`,
        [walletId, uc.reward_trip_cash_cents, challengeId],
      );

      await client.query(
        `UPDATE loyalty.loyalty_wallet
         SET balance_cents = balance_cents + $1,
             lifetime_earned_cents = lifetime_earned_cents + $1,
             updated_at = NOW()
         WHERE wallet_id = $2`,
        [uc.reward_trip_cash_cents, walletId],
      );
    }

    // Award badge if any
    if (uc.reward_badge_id) {
      await client.query(
        `INSERT INTO loyalty.loyalty_user_badge (user_id, badge_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, badge_id) DO NOTHING`,
        [userId, uc.reward_badge_id],
      );
    }

    // Award contribution points if any
    if (uc.reward_points && (uc.reward_points as number) > 0) {
      await client.query(
        `INSERT INTO loyalty.loyalty_contributor_level (user_id, total_contribution_points)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET
           total_contribution_points = loyalty.loyalty_contributor_level.total_contribution_points + $2`,
        [userId, uc.reward_points],
      );
    }

    return {
      claimed: true,
      trip_cash_cents: uc.reward_trip_cash_cents ?? 0,
      badge_id: uc.reward_badge_id ?? null,
      points: uc.reward_points ?? 0,
    };
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  REFERRALS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Generate a unique referral code for a user (8-char alphanumeric).
 */
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create or get the referral code for a user.
 * If the user already has referrals, return their existing code.
 */
export async function createReferralCode(userId: string) {
  // Check if user already has a referral code
  const existing = await query(
    pool,
    `SELECT referral_code FROM loyalty.loyalty_referral
     WHERE referrer_id = $1
     LIMIT 1`,
    [userId],
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].referral_code as string;
  }

  // Generate a new unique code
  let code = generateReferralCode();
  let attempts = 0;
  while (attempts < 10) {
    const conflict = await query(
      pool,
      `SELECT 1 FROM loyalty.loyalty_referral WHERE referral_code = $1`,
      [code],
    );
    if ((conflict.rowCount ?? 0) === 0) break;
    code = generateReferralCode();
    attempts++;
  }

  return code;
}

/**
 * Get referral stats for a user (how many they've referred, rewards earned, etc.).
 */
export async function getReferralStats(userId: string) {
  const result = await query(
    pool,
    `SELECT
       COUNT(*) AS total_referrals,
       COUNT(*) FILTER (WHERE status = 'qualified') AS qualified,
       COUNT(*) FILTER (WHERE status = 'rewarded') AS rewarded,
       COUNT(*) FILTER (WHERE status = 'pending') AS pending,
       COALESCE(SUM(referrer_reward_cents) FILTER (WHERE status = 'rewarded'), 0) AS total_earned_cents
     FROM loyalty.loyalty_referral
     WHERE referrer_id = $1`,
    [userId],
  );

  // Also get or create the referral code
  const code = await createReferralCode(userId);

  return {
    referral_code: code,
    ...(result.rows[0] ?? {
      total_referrals: 0,
      qualified: 0,
      rewarded: 0,
      pending: 0,
      total_earned_cents: 0,
    }),
  };
}

/**
 * Apply a referral code for a new user. Validates the code exists
 * and the referred user hasn't already been referred.
 */
export async function applyReferralCode(referredId: string, code: string) {
  // Find the referrer by code
  const referrerResult = await query(
    pool,
    `SELECT referrer_id FROM loyalty.loyalty_referral
     WHERE referral_code = $1
     LIMIT 1`,
    [code],
  );

  let referrerId: string;
  if (referrerResult.rows.length > 0) {
    referrerId = referrerResult.rows[0].referrer_id as string;
  } else {
    // This might be a brand new code that hasn't been used yet.
    // We need to find who generated this code. Since codes are created
    // on-the-fly, we store the first usage.
    return null; // Invalid code
  }

  // Cannot refer yourself
  if (referrerId === referredId) {
    return null;
  }

  // Create the referral record
  const result = await query(
    pool,
    `INSERT INTO loyalty.loyalty_referral
       (referrer_id, referred_id, referral_code, referrer_reward_cents, referred_reward_cents)
     VALUES ($1, $2, $3, 1000, 500)
     ON CONFLICT (referred_id) DO NOTHING
     RETURNING *`,
    [referrerId, referredId, code],
  );

  return result.rows[0] ?? null;
}

/**
 * Mark a referral as qualified (e.g., after the referred user makes their first booking).
 */
export async function qualifyReferral(referralId: string) {
  const result = await query(
    pool,
    `UPDATE loyalty.loyalty_referral
     SET status = 'qualified', qualified_at = NOW()
     WHERE referral_id = $1 AND status = 'pending'
     RETURNING *`,
    [referralId],
  );
  return result.rows[0] ?? null;
}

// Re-export pool for direct access if needed
export { pool };
