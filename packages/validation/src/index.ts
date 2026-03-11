/**
 * Atlas One — Shared Validation Schemas (Zod)
 *
 * Centralized validation schemas used across all services.
 * Provides request validation, query parameter parsing, and
 * domain object validation.
 */

export { z } from 'zod';

// ── Common Schemas ──────────────────────────────────────────────

import { z } from 'zod';

/** UUID v4 format */
export const uuidSchema = z.string().uuid();

/** ISO 8601 date string */
export const isoDateSchema = z.string().datetime({ offset: true }).or(z.string().date());

/** Positive integer */
export const positiveInt = z.number().int().positive();

/** Non-negative integer */
export const nonNegativeInt = z.number().int().nonnegative();

/** Email address */
export const emailSchema = z.string().email().max(255);

/** Pagination query params */
export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Sort order */
export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

/** Money amount (in minor units / cents) */
export const moneySchema = z.object({
  amount: z.number().int().nonnegative(),
  currency: z.string().length(3).toUpperCase(),
});

/** Date range */
export const dateRangeSchema = z.object({
  start: isoDateSchema,
  end: isoDateSchema,
}).refine((data) => new Date(data.start) < new Date(data.end), {
  message: 'start date must be before end date',
});

/** Geo point (lat/lng) */
export const geoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Address */
export const addressSchema = z.object({
  line1: z.string().min(1).max(255),
  line2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().length(2).toUpperCase(),
});

// ── Identity Schemas ────────────────────────────────────────────

export const createUserSchema = z.object({
  email: emailSchema,
  display_name: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
  locale: z.string().max(10).default('en'),
});

export const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional(),
  phone: z.string().max(20).optional(),
  locale: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
});

// ── Trip Schemas ────────────────────────────────────────────────

export const createTripSchema = z.object({
  title: z.string().min(1).max(200),
  destination: z.string().min(1).max(200),
  start_date: isoDateSchema,
  end_date: isoDateSchema,
  traveler_count: positiveInt.max(50).default(1),
  budget_total: nonNegativeInt.optional(),
  budget_currency: z.string().length(3).toUpperCase().default('USD'),
  pace: z.enum(['relaxed', 'moderate', 'packed']).default('moderate'),
});

export const addItineraryItemSchema = z.object({
  trip_id: uuidSchema,
  item_type: z.enum(['place', 'venue', 'reservation', 'note', 'transport', 'buffer']),
  entity_id: uuidSchema.optional(),
  reservation_id: uuidSchema.optional(),
  day_number: positiveInt,
  position: nonNegativeInt,
  start_at: isoDateSchema.optional(),
  end_at: isoDateSchema.optional(),
  notes: z.string().max(1000).optional(),
});

// ── Dining Schemas ──────────────────────────────────────────────

export const searchAvailabilitySchema = z.object({
  restaurant_id: uuidSchema,
  date: isoDateSchema,
  party_size: z.coerce.number().int().min(1).max(20),
  time_preference: z.string().optional(),
});

export const createDiningReservationSchema = z.object({
  restaurant_id: uuidSchema,
  slot_id: uuidSchema,
  party_size: z.coerce.number().int().min(1).max(20),
  special_requests: z.string().max(500).optional(),
});

export const createNotifyRequestSchema = z.object({
  restaurant_id: uuidSchema,
  target_date: isoDateSchema,
  party_size: z.coerce.number().int().min(1).max(20),
  time_start: z.string().optional(),
  time_end: z.string().optional(),
});

// ── Stay Schemas ────────────────────────────────────────────────

export const searchStaySchema = z.object({
  place_id: uuidSchema.optional(),
  check_in: isoDateSchema,
  check_out: isoDateSchema,
  guests: z.coerce.number().int().min(1).max(30).default(2),
  rooms: z.coerce.number().int().min(1).max(10).default(1),
  min_price: nonNegativeInt.optional(),
  max_price: positiveInt.optional(),
  property_type: z.enum(['hotel', 'resort', 'apartment', 'villa', 'hostel', 'bnb']).optional(),
});

// ── Flight Schemas ──────────────────────────────────────────────

export const searchFlightSchema = z.object({
  origin: z.string().length(3).toUpperCase(),
  destination: z.string().length(3).toUpperCase(),
  departure_date: isoDateSchema,
  return_date: isoDateSchema.optional(),
  passengers: z.coerce.number().int().min(1).max(9).default(1),
  cabin_class: z.enum(['economy', 'premium_economy', 'business', 'first']).default('economy'),
});

// ── Commerce Schemas ────────────────────────────────────────────

export const addToCartSchema = z.object({
  product_id: uuidSchema,
  quantity: positiveInt.default(1),
  variant_id: uuidSchema.optional(),
  price_amount: nonNegativeInt,
  currency: z.string().length(3).toUpperCase(),
});

export const createOrderSchema = z.object({
  cart_id: uuidSchema,
  payment_method_id: z.string().min(1),
  billing_address: addressSchema.optional(),
});

// ── Insurance Schemas ───────────────────────────────────────────

export const requestQuoteSchema = z.object({
  trip_id: uuidSchema,
  coverage_types: z.array(z.enum([
    'trip_cancellation', 'cfar', 'ifar', 'emergency_medical',
    'evacuation', 'trip_delay', 'baggage', 'rental_damage',
    'adventure_sports', 'cruise_specific',
  ])).min(1),
  traveler_count: positiveInt,
  trip_cost: nonNegativeInt,
  currency: z.string().length(3).toUpperCase().default('USD'),
});

export const fileClaimSchema = z.object({
  policy_id: uuidSchema,
  claim_type: z.string().min(1).max(50),
  description: z.string().min(10).max(2000),
  amount: nonNegativeInt,
  currency: z.string().length(3).toUpperCase(),
  incident_date: isoDateSchema,
  supporting_documents: z.array(z.string().url()).max(10).optional(),
});

// ── Finance Schemas ─────────────────────────────────────────────

export const createPriceFreezeSchema = z.object({
  product_id: uuidSchema,
  product_type: z.enum(['flight', 'stay', 'experience']),
  locked_price: nonNegativeInt,
  currency: z.string().length(3).toUpperCase(),
  freeze_duration_hours: z.number().int().min(1).max(168),
});

// ── UGC Schemas ───────────────────────────────────────────────

/** Media type for photos / videos */
export const mediaTypeSchema = z.enum(['image', 'video']);

/** Moderation status for user content */
export const moderationStatusSchema = z.enum(['pending', 'approved', 'rejected']);

/** Review sub-rating categories */
export const subRatingCategorySchema = z.enum([
  'cleanliness', 'service', 'value', 'location',
  'food', 'atmosphere', 'rooms', 'sleep_quality',
]);

/** Single sub-rating entry */
export const subRatingEntrySchema = z.object({
  category: subRatingCategorySchema,
  rating: z.number().min(1).max(5).multipleOf(0.5),
});

/** Forum category types */
export const forumCategorySchema = z.enum(['destination', 'theme', 'general']);

/** Forum topic sort options */
export const forumTopicSortSchema = z.enum(['recent', 'popular', 'unanswered']);

/** Review vote type */
export const reviewVoteTypeSchema = z.enum(['helpful', 'not_helpful']);

/** Review sort options */
export const reviewSortSchema = z.enum(['recent', 'helpful', 'highest', 'lowest']);

/** Season filter for reviews */
export const seasonSchema = z.enum(['spring', 'summer', 'fall', 'winter']);

// ── Fastify Integration ─────────────────────────────────────────

import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Creates a Fastify preValidation hook that validates the request body
 * against a Zod schema. Returns 400 with structured errors on failure.
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request body validation failed',
          details: result.error.flatten(),
        },
      });
    } else {
      request.body = result.data;
    }
  };
}

/**
 * Creates a Fastify preValidation hook that validates query parameters.
 */
export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = schema.safeParse(request.query);
    if (!result.success) {
      reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Query parameter validation failed',
          details: result.error.flatten(),
        },
      });
    } else {
      (request as FastifyRequest & { query: z.infer<T> }).query = result.data;
    }
  };
}

/**
 * Creates a Fastify preValidation hook that validates URL parameters.
 */
export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = schema.safeParse(request.params);
    if (!result.success) {
      reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Path parameter validation failed',
          details: result.error.flatten(),
        },
      });
    } else {
      (request as FastifyRequest & { params: z.infer<T> }).params = result.data;
    }
  };
}
