/**
 * Atlas One — Shared Validation Schemas (Zod)
 *
 * Centralized validation schemas used across all services.
 * Provides request validation, query parameter parsing, and
 * domain object validation.
 */
export { z } from 'zod';
import { z } from 'zod';
/** UUID v4 format */
export declare const uuidSchema: z.ZodString;
/** ISO 8601 date string */
export declare const isoDateSchema: z.ZodUnion<[z.ZodString, z.ZodString]>;
/** Positive integer */
export declare const positiveInt: z.ZodNumber;
/** Non-negative integer */
export declare const nonNegativeInt: z.ZodNumber;
/** Email address */
export declare const emailSchema: z.ZodString;
/** Pagination query params */
export declare const paginationSchema: z.ZodObject<{
    cursor: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    cursor?: string | undefined;
}, {
    limit?: number | undefined;
    cursor?: string | undefined;
}>;
/** Sort order */
export declare const sortOrderSchema: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
/** Money amount (in minor units / cents) */
export declare const moneySchema: z.ZodObject<{
    amount: z.ZodNumber;
    currency: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currency: string;
    amount: number;
}, {
    currency: string;
    amount: number;
}>;
/** Date range */
export declare const dateRangeSchema: z.ZodEffects<z.ZodObject<{
    start: z.ZodUnion<[z.ZodString, z.ZodString]>;
    end: z.ZodUnion<[z.ZodString, z.ZodString]>;
}, "strip", z.ZodTypeAny, {
    start: string;
    end: string;
}, {
    start: string;
    end: string;
}>, {
    start: string;
    end: string;
}, {
    start: string;
    end: string;
}>;
/** Geo point (lat/lng) */
export declare const geoPointSchema: z.ZodObject<{
    lat: z.ZodNumber;
    lng: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    lat: number;
    lng: number;
}, {
    lat: number;
    lng: number;
}>;
/** Address */
export declare const addressSchema: z.ZodObject<{
    line1: z.ZodString;
    line2: z.ZodOptional<z.ZodString>;
    city: z.ZodString;
    state: z.ZodOptional<z.ZodString>;
    postalCode: z.ZodOptional<z.ZodString>;
    country: z.ZodString;
}, "strip", z.ZodTypeAny, {
    city: string;
    country: string;
    line1: string;
    state?: string | undefined;
    line2?: string | undefined;
    postalCode?: string | undefined;
}, {
    city: string;
    country: string;
    line1: string;
    state?: string | undefined;
    line2?: string | undefined;
    postalCode?: string | undefined;
}>;
export declare const createUserSchema: z.ZodObject<{
    email: z.ZodString;
    display_name: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    locale: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    display_name: string;
    locale: string;
    phone?: string | undefined;
}, {
    email: string;
    display_name: string;
    phone?: string | undefined;
    locale?: string | undefined;
}>;
export declare const updateProfileSchema: z.ZodObject<{
    display_name: z.ZodOptional<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    avatar_url: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    locale: z.ZodOptional<z.ZodString>;
    timezone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    display_name?: string | undefined;
    phone?: string | undefined;
    locale?: string | undefined;
    bio?: string | undefined;
    avatar_url?: string | undefined;
    timezone?: string | undefined;
}, {
    display_name?: string | undefined;
    phone?: string | undefined;
    locale?: string | undefined;
    bio?: string | undefined;
    avatar_url?: string | undefined;
    timezone?: string | undefined;
}>;
export declare const createTripSchema: z.ZodObject<{
    title: z.ZodString;
    destination: z.ZodString;
    start_date: z.ZodUnion<[z.ZodString, z.ZodString]>;
    end_date: z.ZodUnion<[z.ZodString, z.ZodString]>;
    traveler_count: z.ZodDefault<z.ZodNumber>;
    budget_total: z.ZodOptional<z.ZodNumber>;
    budget_currency: z.ZodDefault<z.ZodString>;
    pace: z.ZodDefault<z.ZodEnum<["relaxed", "moderate", "packed"]>>;
}, "strip", z.ZodTypeAny, {
    start_date: string;
    end_date: string;
    destination: string;
    title: string;
    traveler_count: number;
    budget_currency: string;
    pace: "moderate" | "relaxed" | "packed";
    budget_total?: number | undefined;
}, {
    start_date: string;
    end_date: string;
    destination: string;
    title: string;
    traveler_count?: number | undefined;
    budget_total?: number | undefined;
    budget_currency?: string | undefined;
    pace?: "moderate" | "relaxed" | "packed" | undefined;
}>;
export declare const addItineraryItemSchema: z.ZodObject<{
    trip_id: z.ZodString;
    item_type: z.ZodEnum<["place", "venue", "reservation", "note", "transport", "buffer"]>;
    entity_id: z.ZodOptional<z.ZodString>;
    reservation_id: z.ZodOptional<z.ZodString>;
    day_number: z.ZodNumber;
    position: z.ZodNumber;
    start_at: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    end_at: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    trip_id: string;
    item_type: "venue" | "place" | "transport" | "reservation" | "note" | "buffer";
    day_number: number;
    position: number;
    entity_id?: string | undefined;
    reservation_id?: string | undefined;
    start_at?: string | undefined;
    end_at?: string | undefined;
    notes?: string | undefined;
}, {
    trip_id: string;
    item_type: "venue" | "place" | "transport" | "reservation" | "note" | "buffer";
    day_number: number;
    position: number;
    entity_id?: string | undefined;
    reservation_id?: string | undefined;
    start_at?: string | undefined;
    end_at?: string | undefined;
    notes?: string | undefined;
}>;
export declare const searchAvailabilitySchema: z.ZodObject<{
    restaurant_id: z.ZodString;
    date: z.ZodUnion<[z.ZodString, z.ZodString]>;
    party_size: z.ZodNumber;
    time_preference: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    date: string;
    restaurant_id: string;
    party_size: number;
    time_preference?: string | undefined;
}, {
    date: string;
    restaurant_id: string;
    party_size: number;
    time_preference?: string | undefined;
}>;
export declare const createDiningReservationSchema: z.ZodObject<{
    restaurant_id: z.ZodString;
    slot_id: z.ZodString;
    party_size: z.ZodNumber;
    special_requests: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    restaurant_id: string;
    party_size: number;
    slot_id: string;
    special_requests?: string | undefined;
}, {
    restaurant_id: string;
    party_size: number;
    slot_id: string;
    special_requests?: string | undefined;
}>;
export declare const createNotifyRequestSchema: z.ZodObject<{
    restaurant_id: z.ZodString;
    target_date: z.ZodUnion<[z.ZodString, z.ZodString]>;
    party_size: z.ZodNumber;
    time_start: z.ZodOptional<z.ZodString>;
    time_end: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    restaurant_id: string;
    party_size: number;
    target_date: string;
    time_start?: string | undefined;
    time_end?: string | undefined;
}, {
    restaurant_id: string;
    party_size: number;
    target_date: string;
    time_start?: string | undefined;
    time_end?: string | undefined;
}>;
export declare const searchStaySchema: z.ZodObject<{
    place_id: z.ZodOptional<z.ZodString>;
    check_in: z.ZodUnion<[z.ZodString, z.ZodString]>;
    check_out: z.ZodUnion<[z.ZodString, z.ZodString]>;
    guests: z.ZodDefault<z.ZodNumber>;
    rooms: z.ZodDefault<z.ZodNumber>;
    min_price: z.ZodOptional<z.ZodNumber>;
    max_price: z.ZodOptional<z.ZodNumber>;
    property_type: z.ZodOptional<z.ZodEnum<["hotel", "resort", "apartment", "villa", "hostel", "bnb"]>>;
}, "strip", z.ZodTypeAny, {
    check_in: string;
    check_out: string;
    guests: number;
    rooms: number;
    place_id?: string | undefined;
    min_price?: number | undefined;
    max_price?: number | undefined;
    property_type?: "hotel" | "resort" | "apartment" | "villa" | "hostel" | "bnb" | undefined;
}, {
    check_in: string;
    check_out: string;
    place_id?: string | undefined;
    guests?: number | undefined;
    rooms?: number | undefined;
    min_price?: number | undefined;
    max_price?: number | undefined;
    property_type?: "hotel" | "resort" | "apartment" | "villa" | "hostel" | "bnb" | undefined;
}>;
export declare const searchFlightSchema: z.ZodObject<{
    origin: z.ZodString;
    destination: z.ZodString;
    departure_date: z.ZodUnion<[z.ZodString, z.ZodString]>;
    return_date: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    passengers: z.ZodDefault<z.ZodNumber>;
    cabin_class: z.ZodDefault<z.ZodEnum<["economy", "premium_economy", "business", "first"]>>;
}, "strip", z.ZodTypeAny, {
    destination: string;
    origin: string;
    departure_date: string;
    passengers: number;
    cabin_class: "economy" | "premium_economy" | "business" | "first";
    return_date?: string | undefined;
}, {
    destination: string;
    origin: string;
    departure_date: string;
    return_date?: string | undefined;
    passengers?: number | undefined;
    cabin_class?: "economy" | "premium_economy" | "business" | "first" | undefined;
}>;
export declare const addToCartSchema: z.ZodObject<{
    product_id: z.ZodString;
    quantity: z.ZodDefault<z.ZodNumber>;
    variant_id: z.ZodOptional<z.ZodString>;
    price_amount: z.ZodNumber;
    currency: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currency: string;
    product_id: string;
    quantity: number;
    price_amount: number;
    variant_id?: string | undefined;
}, {
    currency: string;
    product_id: string;
    price_amount: number;
    quantity?: number | undefined;
    variant_id?: string | undefined;
}>;
export declare const createOrderSchema: z.ZodObject<{
    cart_id: z.ZodString;
    payment_method_id: z.ZodString;
    billing_address: z.ZodOptional<z.ZodObject<{
        line1: z.ZodString;
        line2: z.ZodOptional<z.ZodString>;
        city: z.ZodString;
        state: z.ZodOptional<z.ZodString>;
        postalCode: z.ZodOptional<z.ZodString>;
        country: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        city: string;
        country: string;
        line1: string;
        state?: string | undefined;
        line2?: string | undefined;
        postalCode?: string | undefined;
    }, {
        city: string;
        country: string;
        line1: string;
        state?: string | undefined;
        line2?: string | undefined;
        postalCode?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    cart_id: string;
    payment_method_id: string;
    billing_address?: {
        city: string;
        country: string;
        line1: string;
        state?: string | undefined;
        line2?: string | undefined;
        postalCode?: string | undefined;
    } | undefined;
}, {
    cart_id: string;
    payment_method_id: string;
    billing_address?: {
        city: string;
        country: string;
        line1: string;
        state?: string | undefined;
        line2?: string | undefined;
        postalCode?: string | undefined;
    } | undefined;
}>;
export declare const requestQuoteSchema: z.ZodObject<{
    trip_id: z.ZodString;
    coverage_types: z.ZodArray<z.ZodEnum<["trip_cancellation", "cfar", "ifar", "emergency_medical", "evacuation", "trip_delay", "baggage", "rental_damage", "adventure_sports", "cruise_specific"]>, "many">;
    traveler_count: z.ZodNumber;
    trip_cost: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    currency: string;
    traveler_count: number;
    trip_id: string;
    coverage_types: ("trip_cancellation" | "cfar" | "ifar" | "emergency_medical" | "evacuation" | "trip_delay" | "baggage" | "rental_damage" | "adventure_sports" | "cruise_specific")[];
    trip_cost: number;
}, {
    traveler_count: number;
    trip_id: string;
    coverage_types: ("trip_cancellation" | "cfar" | "ifar" | "emergency_medical" | "evacuation" | "trip_delay" | "baggage" | "rental_damage" | "adventure_sports" | "cruise_specific")[];
    trip_cost: number;
    currency?: string | undefined;
}>;
export declare const fileClaimSchema: z.ZodObject<{
    policy_id: z.ZodString;
    claim_type: z.ZodString;
    description: z.ZodString;
    amount: z.ZodNumber;
    currency: z.ZodString;
    incident_date: z.ZodUnion<[z.ZodString, z.ZodString]>;
    supporting_documents: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    currency: string;
    description: string;
    amount: number;
    policy_id: string;
    claim_type: string;
    incident_date: string;
    supporting_documents?: string[] | undefined;
}, {
    currency: string;
    description: string;
    amount: number;
    policy_id: string;
    claim_type: string;
    incident_date: string;
    supporting_documents?: string[] | undefined;
}>;
export declare const createPriceFreezeSchema: z.ZodObject<{
    product_id: z.ZodString;
    product_type: z.ZodEnum<["flight", "stay", "experience"]>;
    locked_price: z.ZodNumber;
    currency: z.ZodString;
    freeze_duration_hours: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    product_type: "flight" | "experience" | "stay";
    currency: string;
    product_id: string;
    locked_price: number;
    freeze_duration_hours: number;
}, {
    product_type: "flight" | "experience" | "stay";
    currency: string;
    product_id: string;
    locked_price: number;
    freeze_duration_hours: number;
}>;
/** Media type for photos / videos */
export declare const mediaTypeSchema: z.ZodEnum<["image", "video"]>;
/** Moderation status for user content */
export declare const moderationStatusSchema: z.ZodEnum<["pending", "approved", "rejected"]>;
/** Review sub-rating categories */
export declare const subRatingCategorySchema: z.ZodEnum<["cleanliness", "service", "value", "location", "food", "atmosphere", "rooms", "sleep_quality"]>;
/** Single sub-rating entry */
export declare const subRatingEntrySchema: z.ZodObject<{
    category: z.ZodEnum<["cleanliness", "service", "value", "location", "food", "atmosphere", "rooms", "sleep_quality"]>;
    rating: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    category: "location" | "value" | "service" | "rooms" | "cleanliness" | "food" | "atmosphere" | "sleep_quality";
    rating: number;
}, {
    category: "location" | "value" | "service" | "rooms" | "cleanliness" | "food" | "atmosphere" | "sleep_quality";
    rating: number;
}>;
/** Forum category types */
export declare const forumCategorySchema: z.ZodEnum<["destination", "theme", "general"]>;
/** Forum topic sort options */
export declare const forumTopicSortSchema: z.ZodEnum<["recent", "popular", "unanswered"]>;
/** Review vote type */
export declare const reviewVoteTypeSchema: z.ZodEnum<["helpful", "not_helpful"]>;
/** Review sort options */
export declare const reviewSortSchema: z.ZodEnum<["recent", "helpful", "highest", "lowest"]>;
/** Season filter for reviews */
export declare const seasonSchema: z.ZodEnum<["spring", "summer", "fall", "winter"]>;
import type { FastifyRequest, FastifyReply } from 'fastify';
/**
 * Creates a Fastify preValidation hook that validates the request body
 * against a Zod schema. Returns 400 with structured errors on failure.
 */
export declare function validateBody<T extends z.ZodTypeAny>(schema: T): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Creates a Fastify preValidation hook that validates query parameters.
 */
export declare function validateQuery<T extends z.ZodTypeAny>(schema: T): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Creates a Fastify preValidation hook that validates URL parameters.
 */
export declare function validateParams<T extends z.ZodTypeAny>(schema: T): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
//# sourceMappingURL=index.d.ts.map