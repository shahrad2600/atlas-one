import { getPool, query, transaction } from '@atlas/database';
import type { Pool, PoolClient } from '@atlas/database';

const pool: Pool = getPool();

// ═══════════════════════════════════════════════════════════════════════
// LISTING QUERIES
// ═══════════════════════════════════════════════════════════════════════

export async function claimListing(data: {
  entity_id: string;
  entity_type: string;
  owner_user_id: string;
  business_name: string;
  contact_email?: string;
  contact_phone?: string;
  website_url?: string;
}) {
  const result = await query(
    pool,
    `INSERT INTO biz.biz_listing
       (entity_id, entity_type, owner_user_id, business_name,
        contact_email, contact_phone, website_url, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
     RETURNING *`,
    [
      data.entity_id,
      data.entity_type,
      data.owner_user_id,
      data.business_name,
      data.contact_email ?? null,
      data.contact_phone ?? null,
      data.website_url ?? null,
    ],
  );
  // Also insert owner as team member with 'owner' role
  if (result.rows[0]) {
    await query(
      pool,
      `INSERT INTO biz.biz_team_member (listing_id, user_id, role, accepted_at)
       VALUES ($1, $2, 'owner', NOW())`,
      [result.rows[0].listing_id, data.owner_user_id],
    );
  }
  return result.rows[0];
}

export async function findListingsByOwner(userId: string) {
  const result = await query(
    pool,
    `SELECT l.* FROM biz.biz_listing l
     JOIN biz.biz_team_member tm ON tm.listing_id = l.listing_id
     WHERE tm.user_id = $1 AND l.status != 'suspended'
     ORDER BY l.created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function findListingById(listingId: string) {
  const result = await query(
    pool,
    `SELECT * FROM biz.biz_listing WHERE listing_id = $1`,
    [listingId],
  );
  return result.rows[0] ?? null;
}

export async function updateListing(
  listingId: string,
  data: {
    business_name?: string;
    contact_email?: string;
    contact_phone?: string;
    website_url?: string;
    metadata?: Record<string, unknown>;
  },
) {
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (data.business_name !== undefined) {
    setClauses.push(`business_name = $${paramIdx}`);
    params.push(data.business_name);
    paramIdx++;
  }
  if (data.contact_email !== undefined) {
    setClauses.push(`contact_email = $${paramIdx}`);
    params.push(data.contact_email);
    paramIdx++;
  }
  if (data.contact_phone !== undefined) {
    setClauses.push(`contact_phone = $${paramIdx}`);
    params.push(data.contact_phone);
    paramIdx++;
  }
  if (data.website_url !== undefined) {
    setClauses.push(`website_url = $${paramIdx}`);
    params.push(data.website_url);
    paramIdx++;
  }
  if (data.metadata !== undefined) {
    setClauses.push(`metadata = $${paramIdx}`);
    params.push(JSON.stringify(data.metadata));
    paramIdx++;
  }

  if (setClauses.length === 0) return findListingById(listingId);

  params.push(listingId);
  const result = await query(
    pool,
    `UPDATE biz.biz_listing SET ${setClauses.join(', ')} WHERE listing_id = $${paramIdx} RETURNING *`,
    params,
  );
  return result.rows[0] ?? null;
}

export async function verifyListing(
  listingId: string,
  verificationMethod: string,
) {
  const result = await query(
    pool,
    `UPDATE biz.biz_listing
     SET status = 'verified', verification_method = $2, verified_at = NOW()
     WHERE listing_id = $1
     RETURNING *`,
    [listingId, verificationMethod],
  );
  return result.rows[0] ?? null;
}

// ═══════════════════════════════════════════════════════════════════════
// TEAM QUERIES
// ═══════════════════════════════════════════════════════════════════════

export async function findTeamMembers(listingId: string) {
  const result = await query(
    pool,
    `SELECT * FROM biz.biz_team_member
     WHERE listing_id = $1
     ORDER BY created_at ASC`,
    [listingId],
  );
  return result.rows;
}

export async function addTeamMember(data: {
  listing_id: string;
  user_id: string;
  role: string;
  invited_by: string;
}) {
  const result = await query(
    pool,
    `INSERT INTO biz.biz_team_member (listing_id, user_id, role, invited_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.listing_id, data.user_id, data.role, data.invited_by],
  );
  return result.rows[0];
}

export async function updateTeamMemberRole(memberId: string, role: string) {
  const result = await query(
    pool,
    `UPDATE biz.biz_team_member SET role = $2 WHERE member_id = $1 RETURNING *`,
    [memberId, role],
  );
  return result.rows[0] ?? null;
}

export async function removeTeamMember(memberId: string) {
  const result = await query(
    pool,
    `DELETE FROM biz.biz_team_member WHERE member_id = $1 RETURNING *`,
    [memberId],
  );
  return result.rows[0] ?? null;
}

export async function findTeamMemberByUserAndListing(userId: string, listingId: string) {
  const result = await query(
    pool,
    `SELECT * FROM biz.biz_team_member WHERE user_id = $1 AND listing_id = $2`,
    [userId, listingId],
  );
  return result.rows[0] ?? null;
}

export async function findTeamMemberById(memberId: string) {
  const result = await query(
    pool,
    `SELECT * FROM biz.biz_team_member WHERE member_id = $1`,
    [memberId],
  );
  return result.rows[0] ?? null;
}

// ═══════════════════════════════════════════════════════════════════════
// ANALYTICS QUERIES
// ═══════════════════════════════════════════════════════════════════════

export async function getAnalyticsSummary(
  listingId: string,
  startDate: string,
  endDate: string,
) {
  const result = await query(
    pool,
    `SELECT
       COALESCE(SUM(page_views), 0)::int AS total_page_views,
       COALESCE(SUM(unique_visitors), 0)::int AS total_unique_visitors,
       COALESCE(SUM(search_impressions), 0)::int AS total_search_impressions,
       COALESCE(SUM(clicks), 0)::int AS total_clicks,
       COALESCE(SUM(bookings), 0)::int AS total_bookings,
       COALESCE(SUM(reviews), 0)::int AS total_reviews,
       COALESCE(SUM(photo_views), 0)::int AS total_photo_views,
       COALESCE(SUM(phone_clicks), 0)::int AS total_phone_clicks,
       COALESCE(SUM(website_clicks), 0)::int AS total_website_clicks,
       COALESCE(SUM(direction_clicks), 0)::int AS total_direction_clicks,
       COALESCE(SUM(revenue_cents), 0)::int AS total_revenue_cents
     FROM biz.biz_analytics_daily
     WHERE listing_id = $1 AND event_date >= $2::date AND event_date <= $3::date`,
    [listingId, startDate, endDate],
  );
  return result.rows[0];
}

export async function getAnalyticsDaily(
  listingId: string,
  startDate: string,
  endDate: string,
) {
  const result = await query(
    pool,
    `SELECT *
     FROM biz.biz_analytics_daily
     WHERE listing_id = $1 AND event_date >= $2::date AND event_date <= $3::date
     ORDER BY event_date ASC`,
    [listingId, startDate, endDate],
  );
  return result.rows;
}

export async function getAnalyticsTrends(
  listingId: string,
  startDate: string,
  endDate: string,
) {
  // Compare current period vs previous period of same length
  const result = await query(
    pool,
    `WITH current_period AS (
       SELECT
         COALESCE(SUM(page_views), 0)::int AS page_views,
         COALESCE(SUM(unique_visitors), 0)::int AS unique_visitors,
         COALESCE(SUM(search_impressions), 0)::int AS search_impressions,
         COALESCE(SUM(clicks), 0)::int AS clicks,
         COALESCE(SUM(bookings), 0)::int AS bookings,
         COALESCE(SUM(reviews), 0)::int AS reviews,
         COALESCE(SUM(revenue_cents), 0)::int AS revenue_cents
       FROM biz.biz_analytics_daily
       WHERE listing_id = $1 AND event_date >= $2::date AND event_date <= $3::date
     ),
     prev_period AS (
       SELECT
         COALESCE(SUM(page_views), 0)::int AS page_views,
         COALESCE(SUM(unique_visitors), 0)::int AS unique_visitors,
         COALESCE(SUM(search_impressions), 0)::int AS search_impressions,
         COALESCE(SUM(clicks), 0)::int AS clicks,
         COALESCE(SUM(bookings), 0)::int AS bookings,
         COALESCE(SUM(reviews), 0)::int AS reviews,
         COALESCE(SUM(revenue_cents), 0)::int AS revenue_cents
       FROM biz.biz_analytics_daily
       WHERE listing_id = $1
         AND event_date >= ($2::date - ($3::date - $2::date + 1))
         AND event_date < $2::date
     )
     SELECT
       cp.page_views AS current_page_views,
       pp.page_views AS previous_page_views,
       cp.unique_visitors AS current_unique_visitors,
       pp.unique_visitors AS previous_unique_visitors,
       cp.search_impressions AS current_search_impressions,
       pp.search_impressions AS previous_search_impressions,
       cp.clicks AS current_clicks,
       pp.clicks AS previous_clicks,
       cp.bookings AS current_bookings,
       pp.bookings AS previous_bookings,
       cp.reviews AS current_reviews,
       pp.reviews AS previous_reviews,
       cp.revenue_cents AS current_revenue_cents,
       pp.revenue_cents AS previous_revenue_cents
     FROM current_period cp, prev_period pp`,
    [listingId, startDate, endDate],
  );
  const row = result.rows[0];
  if (!row) return null;

  const calcChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return {
    page_views: {
      current: row.current_page_views,
      previous: row.previous_page_views,
      change_percent: calcChange(row.current_page_views, row.previous_page_views),
    },
    unique_visitors: {
      current: row.current_unique_visitors,
      previous: row.previous_unique_visitors,
      change_percent: calcChange(row.current_unique_visitors, row.previous_unique_visitors),
    },
    search_impressions: {
      current: row.current_search_impressions,
      previous: row.previous_search_impressions,
      change_percent: calcChange(row.current_search_impressions, row.previous_search_impressions),
    },
    clicks: {
      current: row.current_clicks,
      previous: row.previous_clicks,
      change_percent: calcChange(row.current_clicks, row.previous_clicks),
    },
    bookings: {
      current: row.current_bookings,
      previous: row.previous_bookings,
      change_percent: calcChange(row.current_bookings, row.previous_bookings),
    },
    reviews: {
      current: row.current_reviews,
      previous: row.previous_reviews,
      change_percent: calcChange(row.current_reviews, row.previous_reviews),
    },
    revenue_cents: {
      current: row.current_revenue_cents,
      previous: row.previous_revenue_cents,
      change_percent: calcChange(row.current_revenue_cents, row.previous_revenue_cents),
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// COMPETITOR QUERIES
// ═══════════════════════════════════════════════════════════════════════

export async function findCompetitors(listingId: string) {
  const result = await query(
    pool,
    `SELECT * FROM biz.biz_competitor
     WHERE listing_id = $1
     ORDER BY created_at ASC`,
    [listingId],
  );
  return result.rows;
}

export async function addCompetitor(data: {
  listing_id: string;
  competitor_entity_id: string;
  added_by: string;
}) {
  const result = await query(
    pool,
    `INSERT INTO biz.biz_competitor (listing_id, competitor_entity_id, added_by)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [data.listing_id, data.competitor_entity_id, data.added_by],
  );
  return result.rows[0];
}

export async function removeCompetitor(competitorId: string) {
  const result = await query(
    pool,
    `DELETE FROM biz.biz_competitor WHERE competitor_id = $1 RETURNING *`,
    [competitorId],
  );
  return result.rows[0] ?? null;
}

export async function findCompetitorById(competitorId: string) {
  const result = await query(
    pool,
    `SELECT * FROM biz.biz_competitor WHERE competitor_id = $1`,
    [competitorId],
  );
  return result.rows[0] ?? null;
}

export async function compareCompetitorMetrics(
  listingId: string,
  startDate: string,
  endDate: string,
) {
  // Get our metrics + competitor metrics side by side
  const result = await query(
    pool,
    `WITH my_metrics AS (
       SELECT
         $1::uuid AS listing_id,
         COALESCE(SUM(page_views), 0)::int AS page_views,
         COALESCE(SUM(search_impressions), 0)::int AS search_impressions,
         COALESCE(SUM(clicks), 0)::int AS clicks,
         COALESCE(SUM(bookings), 0)::int AS bookings,
         COALESCE(SUM(reviews), 0)::int AS reviews,
         COALESCE(SUM(revenue_cents), 0)::int AS revenue_cents
       FROM biz.biz_analytics_daily
       WHERE listing_id = $1 AND event_date >= $2::date AND event_date <= $3::date
     ),
     competitor_listings AS (
       SELECT competitor_entity_id
       FROM biz.biz_competitor
       WHERE listing_id = $1
     ),
     competitor_metrics AS (
       SELECT
         cl.competitor_entity_id,
         COALESCE(SUM(ad.page_views), 0)::int AS page_views,
         COALESCE(SUM(ad.search_impressions), 0)::int AS search_impressions,
         COALESCE(SUM(ad.clicks), 0)::int AS clicks,
         COALESCE(SUM(ad.bookings), 0)::int AS bookings,
         COALESCE(SUM(ad.reviews), 0)::int AS reviews,
         COALESCE(SUM(ad.revenue_cents), 0)::int AS revenue_cents
       FROM competitor_listings cl
       LEFT JOIN biz.biz_listing bl ON bl.entity_id = cl.competitor_entity_id AND bl.status = 'verified'
       LEFT JOIN biz.biz_analytics_daily ad ON ad.listing_id = bl.listing_id
         AND ad.event_date >= $2::date AND ad.event_date <= $3::date
       GROUP BY cl.competitor_entity_id
     )
     SELECT
       'mine' AS source,
       mm.listing_id::text AS entity_id,
       mm.page_views, mm.search_impressions, mm.clicks,
       mm.bookings, mm.reviews, mm.revenue_cents
     FROM my_metrics mm
     UNION ALL
     SELECT
       'competitor' AS source,
       cm.competitor_entity_id::text AS entity_id,
       cm.page_views, cm.search_impressions, cm.clicks,
       cm.bookings, cm.reviews, cm.revenue_cents
     FROM competitor_metrics cm`,
    [listingId, startDate, endDate],
  );
  return result.rows;
}

// ═══════════════════════════════════════════════════════════════════════
// REVIEW CAMPAIGN QUERIES
// ═══════════════════════════════════════════════════════════════════════

export async function createCampaign(data: {
  listing_id: string;
  name: string;
  template_subject?: string;
  template_body?: string;
  scheduled_at?: string;
}) {
  const status = data.scheduled_at ? 'scheduled' : 'draft';
  const result = await query(
    pool,
    `INSERT INTO biz.biz_review_campaign
       (listing_id, name, template_subject, template_body, status, scheduled_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.listing_id,
      data.name,
      data.template_subject ?? null,
      data.template_body ?? null,
      status,
      data.scheduled_at ?? null,
    ],
  );
  return result.rows[0];
}

export async function findCampaignsByListing(listingId: string) {
  const result = await query(
    pool,
    `SELECT * FROM biz.biz_review_campaign
     WHERE listing_id = $1
     ORDER BY created_at DESC`,
    [listingId],
  );
  return result.rows;
}

export async function findCampaignById(campaignId: string) {
  const result = await query(
    pool,
    `SELECT * FROM biz.biz_review_campaign WHERE campaign_id = $1`,
    [campaignId],
  );
  return result.rows[0] ?? null;
}

export async function addCampaignRecipients(
  campaignId: string,
  recipients: Array<{ email: string; name?: string }>,
) {
  if (recipients.length === 0) return [];

  // Build multi-row INSERT
  const values: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  for (const r of recipients) {
    values.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2})`);
    params.push(campaignId, r.email, r.name ?? null);
    paramIdx += 3;
  }

  const result = await query(
    pool,
    `INSERT INTO biz.biz_campaign_recipient (campaign_id, email, name)
     VALUES ${values.join(', ')}
     RETURNING *`,
    params,
  );

  // Update total_recipients count
  await query(
    pool,
    `UPDATE biz.biz_review_campaign
     SET total_recipients = (
       SELECT COUNT(*) FROM biz.biz_campaign_recipient WHERE campaign_id = $1
     )
     WHERE campaign_id = $1`,
    [campaignId],
  );

  return result.rows;
}

export async function sendCampaign(campaignId: string) {
  // Mark campaign as sending, then update recipients to sent
  const p = getPool();
  return transaction(p, async (client) => {
    await client.query(
      `UPDATE biz.biz_review_campaign
       SET status = 'sending', sent_at = NOW()
       WHERE campaign_id = $1`,
      [campaignId],
    );

    // Mark all pending recipients as sent
    const recipResult = await client.query(
      `UPDATE biz.biz_campaign_recipient
       SET status = 'sent', sent_at = NOW()
       WHERE campaign_id = $1 AND status = 'pending'
       RETURNING *`,
      [campaignId],
    );

    // Update sent_count
    await client.query(
      `UPDATE biz.biz_review_campaign
       SET status = 'completed',
           sent_count = $2
       WHERE campaign_id = $1`,
      [campaignId, recipResult.rowCount],
    );

    return findCampaignById(campaignId);
  });
}

export async function getCampaignStats(campaignId: string) {
  const result = await query(
    pool,
    `SELECT
       COUNT(*)::int AS total_recipients,
       COUNT(*) FILTER (WHERE status IN ('sent', 'opened', 'clicked', 'reviewed'))::int AS sent_count,
       COUNT(*) FILTER (WHERE status IN ('opened', 'clicked', 'reviewed'))::int AS opened_count,
       COUNT(*) FILTER (WHERE status IN ('clicked', 'reviewed'))::int AS clicked_count,
       COUNT(*) FILTER (WHERE status = 'reviewed')::int AS reviewed_count,
       COUNT(*) FILTER (WHERE status = 'bounced')::int AS bounced_count
     FROM biz.biz_campaign_recipient
     WHERE campaign_id = $1`,
    [campaignId],
  );
  const row = result.rows[0];
  const total = row.total_recipients || 1; // avoid divide by zero
  return {
    total_recipients: row.total_recipients,
    sent_count: row.sent_count,
    opened_count: row.opened_count,
    clicked_count: row.clicked_count,
    reviewed_count: row.reviewed_count,
    bounced_count: row.bounced_count,
    open_rate: Math.round((row.opened_count / total) * 10000) / 100,
    click_rate: Math.round((row.clicked_count / total) * 10000) / 100,
    review_rate: Math.round((row.reviewed_count / total) * 10000) / 100,
    bounce_rate: Math.round((row.bounced_count / total) * 10000) / 100,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// AD CAMPAIGN QUERIES
// ═══════════════════════════════════════════════════════════════════════

export async function createAdCampaign(data: {
  listing_id: string;
  name: string;
  campaign_type: string;
  budget_cents: number;
  daily_budget_cents?: number;
  bid_type: string;
  bid_amount_cents: number;
  targeting?: Record<string, unknown>;
  starts_at?: string;
  ends_at?: string;
}) {
  const result = await query(
    pool,
    `INSERT INTO biz.biz_ad_campaign
       (listing_id, name, campaign_type, budget_cents, daily_budget_cents,
        bid_type, bid_amount_cents, targeting, starts_at, ends_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      data.listing_id,
      data.name,
      data.campaign_type,
      data.budget_cents,
      data.daily_budget_cents ?? null,
      data.bid_type,
      data.bid_amount_cents,
      JSON.stringify(data.targeting ?? {}),
      data.starts_at ?? null,
      data.ends_at ?? null,
    ],
  );
  return result.rows[0];
}

export async function findAdCampaignsByListing(listingId: string) {
  const result = await query(
    pool,
    `SELECT * FROM biz.biz_ad_campaign
     WHERE listing_id = $1
     ORDER BY created_at DESC`,
    [listingId],
  );
  return result.rows;
}

export async function findAdCampaignById(adId: string) {
  const result = await query(
    pool,
    `SELECT * FROM biz.biz_ad_campaign WHERE ad_campaign_id = $1`,
    [adId],
  );
  return result.rows[0] ?? null;
}

export async function updateAdCampaign(
  adId: string,
  data: {
    status?: string;
    budget_cents?: number;
    daily_budget_cents?: number;
    bid_amount_cents?: number;
    targeting?: Record<string, unknown>;
    starts_at?: string;
    ends_at?: string;
  },
) {
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (data.status !== undefined) {
    setClauses.push(`status = $${paramIdx}`);
    params.push(data.status);
    paramIdx++;
  }
  if (data.budget_cents !== undefined) {
    setClauses.push(`budget_cents = $${paramIdx}`);
    params.push(data.budget_cents);
    paramIdx++;
  }
  if (data.daily_budget_cents !== undefined) {
    setClauses.push(`daily_budget_cents = $${paramIdx}`);
    params.push(data.daily_budget_cents);
    paramIdx++;
  }
  if (data.bid_amount_cents !== undefined) {
    setClauses.push(`bid_amount_cents = $${paramIdx}`);
    params.push(data.bid_amount_cents);
    paramIdx++;
  }
  if (data.targeting !== undefined) {
    setClauses.push(`targeting = $${paramIdx}`);
    params.push(JSON.stringify(data.targeting));
    paramIdx++;
  }
  if (data.starts_at !== undefined) {
    setClauses.push(`starts_at = $${paramIdx}`);
    params.push(data.starts_at);
    paramIdx++;
  }
  if (data.ends_at !== undefined) {
    setClauses.push(`ends_at = $${paramIdx}`);
    params.push(data.ends_at);
    paramIdx++;
  }

  if (setClauses.length === 0) return findAdCampaignById(adId);

  params.push(adId);
  const result = await query(
    pool,
    `UPDATE biz.biz_ad_campaign SET ${setClauses.join(', ')} WHERE ad_campaign_id = $${paramIdx} RETURNING *`,
    params,
  );
  return result.rows[0] ?? null;
}

export async function getAdPerformance(adId: string) {
  const result = await query(
    pool,
    `SELECT
       COUNT(*) FILTER (WHERE event_type = 'impression')::int AS impressions,
       COUNT(*) FILTER (WHERE event_type = 'click')::int AS clicks,
       COUNT(*) FILTER (WHERE event_type = 'conversion')::int AS conversions,
       COALESCE(SUM(cost_cents) FILTER (WHERE event_type = 'impression'), 0)::int AS impression_cost_cents,
       COALESCE(SUM(cost_cents) FILTER (WHERE event_type = 'click'), 0)::int AS click_cost_cents,
       COALESCE(SUM(cost_cents), 0)::int AS total_cost_cents
     FROM biz.biz_ad_event
     WHERE ad_campaign_id = $1`,
    [adId],
  );
  const row = result.rows[0];
  const impressions = row.impressions || 0;
  const clicks = row.clicks || 0;
  const conversions = row.conversions || 0;

  return {
    impressions,
    clicks,
    conversions,
    total_cost_cents: row.total_cost_cents,
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
    conversion_rate: clicks > 0 ? Math.round((conversions / clicks) * 10000) / 100 : 0,
    cpc_cents: clicks > 0 ? Math.round(row.click_cost_cents / clicks) : 0,
    roas: row.total_cost_cents > 0
      ? Math.round((conversions * 10000) / row.total_cost_cents) / 100
      : 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// SPECIAL OFFER QUERIES
// ═══════════════════════════════════════════════════════════════════════

export async function createOffer(data: {
  listing_id: string;
  title: string;
  description?: string;
  offer_type: string;
  discount_percent?: number;
  discount_amount_cents?: number;
  conditions?: string;
  valid_from: string;
  valid_until: string;
  max_redemptions?: number;
}) {
  const result = await query(
    pool,
    `INSERT INTO biz.biz_special_offer
       (listing_id, title, description, offer_type, discount_percent,
        discount_amount_cents, conditions, valid_from, valid_until, max_redemptions)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      data.listing_id,
      data.title,
      data.description ?? null,
      data.offer_type,
      data.discount_percent ?? null,
      data.discount_amount_cents ?? null,
      data.conditions ?? null,
      data.valid_from,
      data.valid_until,
      data.max_redemptions ?? null,
    ],
  );
  return result.rows[0];
}

export async function findOffersByListing(listingId: string) {
  const result = await query(
    pool,
    `SELECT * FROM biz.biz_special_offer
     WHERE listing_id = $1
     ORDER BY created_at DESC`,
    [listingId],
  );
  return result.rows;
}

export async function findOfferById(offerId: string) {
  const result = await query(
    pool,
    `SELECT * FROM biz.biz_special_offer WHERE offer_id = $1`,
    [offerId],
  );
  return result.rows[0] ?? null;
}

export async function updateOffer(
  offerId: string,
  data: {
    title?: string;
    description?: string;
    discount_percent?: number;
    discount_amount_cents?: number;
    conditions?: string;
    valid_from?: string;
    valid_until?: string;
    is_active?: boolean;
    max_redemptions?: number;
  },
) {
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (data.title !== undefined) {
    setClauses.push(`title = $${paramIdx}`);
    params.push(data.title);
    paramIdx++;
  }
  if (data.description !== undefined) {
    setClauses.push(`description = $${paramIdx}`);
    params.push(data.description);
    paramIdx++;
  }
  if (data.discount_percent !== undefined) {
    setClauses.push(`discount_percent = $${paramIdx}`);
    params.push(data.discount_percent);
    paramIdx++;
  }
  if (data.discount_amount_cents !== undefined) {
    setClauses.push(`discount_amount_cents = $${paramIdx}`);
    params.push(data.discount_amount_cents);
    paramIdx++;
  }
  if (data.conditions !== undefined) {
    setClauses.push(`conditions = $${paramIdx}`);
    params.push(data.conditions);
    paramIdx++;
  }
  if (data.valid_from !== undefined) {
    setClauses.push(`valid_from = $${paramIdx}`);
    params.push(data.valid_from);
    paramIdx++;
  }
  if (data.valid_until !== undefined) {
    setClauses.push(`valid_until = $${paramIdx}`);
    params.push(data.valid_until);
    paramIdx++;
  }
  if (data.is_active !== undefined) {
    setClauses.push(`is_active = $${paramIdx}`);
    params.push(data.is_active);
    paramIdx++;
  }
  if (data.max_redemptions !== undefined) {
    setClauses.push(`max_redemptions = $${paramIdx}`);
    params.push(data.max_redemptions);
    paramIdx++;
  }

  if (setClauses.length === 0) return findOfferById(offerId);

  params.push(offerId);
  const result = await query(
    pool,
    `UPDATE biz.biz_special_offer SET ${setClauses.join(', ')} WHERE offer_id = $${paramIdx} RETURNING *`,
    params,
  );
  return result.rows[0] ?? null;
}

export async function deactivateOffer(offerId: string) {
  const result = await query(
    pool,
    `UPDATE biz.biz_special_offer SET is_active = FALSE WHERE offer_id = $1 RETURNING *`,
    [offerId],
  );
  return result.rows[0] ?? null;
}

// ═══════════════════════════════════════════════════════════════════════
// STORYBOARD & FAVORITE PHOTOS QUERIES
// ═══════════════════════════════════════════════════════════════════════

export async function upsertStoryboard(data: {
  listing_id: string;
  title?: string;
  media_ids: string[];
  is_active?: boolean;
  sort_order?: number;
}) {
  // Upsert: if a storyboard exists for this listing, update it; otherwise create new
  const existing = await query(
    pool,
    `SELECT * FROM biz.biz_storyboard WHERE listing_id = $1 ORDER BY sort_order ASC LIMIT 1`,
    [data.listing_id],
  );

  if (existing.rows[0]) {
    const result = await query(
      pool,
      `UPDATE biz.biz_storyboard
       SET title = COALESCE($2, title),
           media_ids = $3,
           is_active = COALESCE($4, is_active),
           sort_order = COALESCE($5, sort_order)
       WHERE storyboard_id = $6
       RETURNING *`,
      [
        data.listing_id,
        data.title ?? null,
        data.media_ids,
        data.is_active ?? null,
        data.sort_order ?? null,
        existing.rows[0].storyboard_id,
      ],
    );
    return result.rows[0];
  }

  const result = await query(
    pool,
    `INSERT INTO biz.biz_storyboard (listing_id, title, media_ids, is_active, sort_order)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.listing_id,
      data.title ?? null,
      data.media_ids,
      data.is_active ?? true,
      data.sort_order ?? 0,
    ],
  );
  return result.rows[0];
}

export async function findStoryboard(listingId: string) {
  const result = await query(
    pool,
    `SELECT * FROM biz.biz_storyboard
     WHERE listing_id = $1
     ORDER BY sort_order ASC`,
    [listingId],
  );
  return result.rows;
}

export async function setFavoritePhotos(
  listingId: string,
  photos: Array<{ media_id: string; sort_order: number }>,
) {
  const p = getPool();
  return transaction(p, async (client) => {
    // Remove existing favorites for this listing
    await client.query(
      `DELETE FROM biz.biz_favorite_photo WHERE listing_id = $1`,
      [listingId],
    );

    if (photos.length === 0) return [];

    // Build multi-row INSERT
    const values: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    for (const photo of photos) {
      values.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2})`);
      params.push(listingId, photo.media_id, photo.sort_order);
      paramIdx += 3;
    }

    const result = await client.query(
      `INSERT INTO biz.biz_favorite_photo (listing_id, media_id, sort_order)
       VALUES ${values.join(', ')}
       RETURNING *`,
      params,
    );
    return result.rows;
  });
}

export async function findFavoritePhotos(listingId: string) {
  const result = await query(
    pool,
    `SELECT * FROM biz.biz_favorite_photo
     WHERE listing_id = $1
     ORDER BY sort_order ASC`,
    [listingId],
  );
  return result.rows;
}

// ═══════════════════════════════════════════════════════════════════════
// DASHBOARD OVERVIEW QUERY
// ═══════════════════════════════════════════════════════════════════════

export async function getDashboardOverview(userId: string) {
  // Get all listings for user with summary stats from last 30 days
  const result = await query(
    pool,
    `SELECT
       l.listing_id,
       l.business_name,
       l.entity_type,
       l.status,
       l.subscription_tier,
       COALESCE(SUM(ad.page_views), 0)::int AS page_views_30d,
       COALESCE(SUM(ad.unique_visitors), 0)::int AS unique_visitors_30d,
       COALESCE(SUM(ad.bookings), 0)::int AS bookings_30d,
       COALESCE(SUM(ad.reviews), 0)::int AS reviews_30d,
       COALESCE(SUM(ad.revenue_cents), 0)::int AS revenue_cents_30d,
       (SELECT COUNT(*)::int FROM biz.biz_review_campaign rc
        WHERE rc.listing_id = l.listing_id AND rc.status = 'completed') AS campaigns_completed,
       (SELECT COUNT(*)::int FROM biz.biz_ad_campaign ac
        WHERE ac.listing_id = l.listing_id AND ac.status = 'active') AS active_ads,
       (SELECT COUNT(*)::int FROM biz.biz_special_offer so
        WHERE so.listing_id = l.listing_id AND so.is_active = TRUE
          AND so.valid_until > NOW()) AS active_offers
     FROM biz.biz_listing l
     JOIN biz.biz_team_member tm ON tm.listing_id = l.listing_id
     LEFT JOIN biz.biz_analytics_daily ad ON ad.listing_id = l.listing_id
       AND ad.event_date >= CURRENT_DATE - INTERVAL '30 days'
     WHERE tm.user_id = $1 AND l.status != 'suspended'
     GROUP BY l.listing_id, l.business_name, l.entity_type, l.status, l.subscription_tier
     ORDER BY l.created_at DESC`,
    [userId],
  );
  return result.rows;
}

// Re-export transaction helper and pool for routes
export { transaction, getPool };
