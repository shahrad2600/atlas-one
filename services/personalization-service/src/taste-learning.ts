/**
 * Atlas One -- Taste Learning Engine
 *
 * Learns traveler preferences from behavioral signals: saves, bookings,
 * reviews, and cancellations. Each action type produces different inference
 * strengths. A booking is a strong signal; a save is a weak signal; a
 * cancellation may indicate a negative preference.
 *
 * The engine updates the traveler profile incrementally -- it never
 * overwrites explicit user preferences, only inferred ones.
 */

import {
  getProfile,
  updateProfile,
  type TravelerProfile,
  type DesignTaste,
} from './traveler-profile.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The kinds of user actions the learning engine can process. */
export type ActionType = 'save' | 'book' | 'review' | 'cancel' | 'view' | 'share' | 'wishlist';

/** Signal strength by action type (0-1). */
const ACTION_WEIGHTS: Record<ActionType, number> = {
  book: 1.0,
  review: 0.8,
  cancel: -0.6, // negative signal
  save: 0.4,
  wishlist: 0.35,
  share: 0.3,
  view: 0.1,
};

/** A user action event to be processed by the learning engine. */
export interface UserAction {
  userId: string;
  actionType: ActionType;
  entityType: 'property' | 'restaurant' | 'experience' | 'destination' | 'flight';
  entityId: string;
  /** Metadata about the entity involved in the action. */
  entityMetadata: EntityMetadata;
  /** Optional review data for review actions. */
  reviewData?: ReviewData;
  /** Optional booking data for booking/cancellation actions. */
  bookingData?: BookingData;
  /** Timestamp of the action. */
  timestamp: string;
}

/** Metadata about the entity involved in a user action. */
export interface EntityMetadata {
  name: string;
  category?: string;
  subcategory?: string;
  location?: { city: string; country: string; lat?: number; lng?: number };
  priceLevel?: number; // 1-5
  /** Design/style tags from the property listing. */
  styleTags?: string[];
  /** Amenity tags. */
  amenityTags?: string[];
  /** Cuisine type (for restaurants). */
  cuisineType?: string;
  /** Star rating. */
  rating?: number;
  /** Room count (for properties). */
  roomCount?: number;
  /** Property type (e.g., "villa", "boutique_hotel", "resort"). */
  propertyType?: string;
}

/** Review data attached to a review action. */
export interface ReviewData {
  overallRating: number; // 1-5
  subRatings?: {
    service?: number;
    cleanliness?: number;
    location?: number;
    value?: number;
    ambiance?: number;
    food?: number;
    privacy?: number;
    design?: number;
  };
  /** Free-text review content for NLP extraction. */
  reviewText?: string;
  /** Tags the user applied to the review. */
  tags?: string[];
}

/** Booking data attached to book/cancel actions. */
export interface BookingData {
  checkIn?: string;
  checkOut?: string;
  nightlyRate?: number;
  totalCost?: number;
  currency?: string;
  roomType?: string;
  guestCount?: number;
  /** Reason for cancellation (cancel actions only). */
  cancellationReason?: string;
}

/** The result of processing a user action. */
export interface LearningResult {
  userId: string;
  actionType: ActionType;
  inferences: Inference[];
  profileUpdated: boolean;
  newConfidence: number;
  tasteVectorUpdated: boolean;
}

/** A single inference drawn from a user action. */
export interface Inference {
  dimension: string;
  value: string | number;
  confidence: number;
  source: ActionType;
  reasoning: string;
}

// ---------------------------------------------------------------------------
// Design Style Mappings
// ---------------------------------------------------------------------------

/** Maps style tags to design taste categories. */
const STYLE_TO_TASTE: Record<string, string> = {
  'minimalist': 'minimalist',
  'modern': 'minimalist',
  'clean-lines': 'minimalist',
  'scandinavian': 'minimalist',
  'japandi': 'minimalist',
  'maximalist': 'maximalist',
  'eclectic': 'maximalist',
  'bold': 'maximalist',
  'bohemian': 'maximalist',
  'rustic': 'rustic',
  'farmhouse': 'rustic',
  'country': 'rustic',
  'cottage': 'rustic',
  'art-deco': 'art-deco',
  'glamorous': 'art-deco',
  'vintage': 'art-deco',
  'retro': 'art-deco',
  'industrial': 'industrial',
  'loft': 'industrial',
  'raw': 'industrial',
  'tropical': 'tropical',
  'coastal': 'tropical',
  'beach': 'tropical',
  'island': 'tropical',
  'mediterranean': 'mediterranean',
  'tuscan': 'mediterranean',
  'provencal': 'mediterranean',
  'traditional': 'classical',
  'classical': 'classical',
  'colonial': 'classical',
  'heritage': 'classical',
  'contemporary': 'contemporary',
  'designer': 'contemporary',
  'architectural': 'contemporary',
};

/** Maps style tags to color palette preferences. */
const STYLE_TO_PALETTE: Record<string, 'warm' | 'cool' | 'neutral' | 'bold' | 'earthy'> = {
  'minimalist': 'neutral',
  'scandinavian': 'cool',
  'japandi': 'neutral',
  'tropical': 'warm',
  'mediterranean': 'earthy',
  'industrial': 'cool',
  'rustic': 'earthy',
  'art-deco': 'bold',
  'maximalist': 'bold',
  'classical': 'warm',
  'contemporary': 'neutral',
};

// ---------------------------------------------------------------------------
// Learning Engine
// ---------------------------------------------------------------------------

/**
 * Process a user action and update the traveler profile with inferred preferences.
 *
 * This is the main entry point for the taste learning engine. Each action
 * generates inferences which are then merged into the profile.
 */
export async function processUserAction(action: UserAction): Promise<LearningResult> {
  const profile = await getProfile(action.userId);
  const weight = ACTION_WEIGHTS[action.actionType];
  const inferences: Inference[] = [];

  // ── Infer design taste from property style tags ──────────────
  if (action.entityMetadata.styleTags && action.entityMetadata.styleTags.length > 0) {
    const designInferences = inferDesignTaste(action, weight);
    inferences.push(...designInferences);
  }

  // ── Infer budget tier from pricing data ──────────────────────
  if (action.bookingData?.nightlyRate || action.entityMetadata.priceLevel) {
    const budgetInferences = inferBudgetPreferences(action, weight);
    inferences.push(...budgetInferences);
  }

  // ── Infer dining preferences from restaurant actions ─────────
  if (action.entityType === 'restaurant' && action.entityMetadata.cuisineType) {
    const diningInferences = inferDiningPreferences(action, weight);
    inferences.push(...diningInferences);
  }

  // ── Infer privacy/pace from review content ───────────────────
  if (action.actionType === 'review' && action.reviewData) {
    const reviewInferences = inferFromReview(action, weight);
    inferences.push(...reviewInferences);
  }

  // ── Infer from cancellation reasons ──────────────────────────
  if (action.actionType === 'cancel' && action.bookingData?.cancellationReason) {
    const cancelInferences = inferFromCancellation(action);
    inferences.push(...cancelInferences);
  }

  // ── Apply inferences to profile ──────────────────────────────
  const profileUpdated = inferences.length > 0;
  let tasteVectorUpdated = false;

  if (profileUpdated) {
    const updates = buildProfileUpdates(profile, inferences);
    await updateProfile(action.userId, {
      ...updates,
      dataPointCount: profile.dataPointCount + 1,
      profileConfidence: Math.min(1, profile.profileConfidence + 0.02 * Math.abs(weight)),
    });

    // Update taste vector if design-related inferences were made
    if (inferences.some((i) => i.dimension.startsWith('design'))) {
      await updateTasteVector(action.userId);
      tasteVectorUpdated = true;
    }
  } else {
    // Still increment data point count even if no inferences
    await updateProfile(action.userId, {
      dataPointCount: profile.dataPointCount + 1,
    });
  }

  const updatedProfile = await getProfile(action.userId);

  return {
    userId: action.userId,
    actionType: action.actionType,
    inferences,
    profileUpdated,
    newConfidence: updatedProfile.profileConfidence,
    tasteVectorUpdated,
  };
}

// ---------------------------------------------------------------------------
// Inference Functions
// ---------------------------------------------------------------------------

/** Infer design taste from property style tags. */
function inferDesignTaste(action: UserAction, weight: number): Inference[] {
  const inferences: Inference[] = [];
  const tags = action.entityMetadata.styleTags ?? [];

  for (const tag of tags) {
    const normalizedTag = tag.toLowerCase().trim();
    const tasteCategory = STYLE_TO_TASTE[normalizedTag];
    if (tasteCategory) {
      inferences.push({
        dimension: 'design.primary',
        value: tasteCategory,
        confidence: Math.abs(weight) * 0.7,
        source: action.actionType,
        reasoning: `User ${action.actionType === 'cancel' ? 'cancelled' : action.actionType + 'ed'} a ${normalizedTag}-style ${action.entityType}, ${weight > 0 ? 'suggesting affinity' : 'suggesting aversion'} for ${tasteCategory} design.`,
      });
    }

    const palette = STYLE_TO_PALETTE[normalizedTag];
    if (palette && weight > 0) {
      inferences.push({
        dimension: 'design.colorPalette',
        value: palette,
        confidence: Math.abs(weight) * 0.5,
        source: action.actionType,
        reasoning: `${normalizedTag} style typically features ${palette} color palettes.`,
      });
    }
  }

  return inferences;
}

/** Infer budget preferences from pricing data. */
function inferBudgetPreferences(action: UserAction, weight: number): Inference[] {
  const inferences: Inference[] = [];

  if (action.bookingData?.nightlyRate && weight > 0) {
    const rate = action.bookingData.nightlyRate;
    let tier: string;
    if (rate >= 2000) tier = 'ultra_luxury';
    else if (rate >= 800) tier = 'luxury';
    else if (rate >= 400) tier = 'premium';
    else if (rate >= 150) tier = 'moderate';
    else tier = 'budget_conscious';

    inferences.push({
      dimension: 'budget.tier',
      value: tier,
      confidence: weight * 0.8,
      source: action.actionType,
      reasoning: `Booked at ${action.bookingData.currency ?? 'USD'} ${rate}/night, indicating ${tier} budget tier.`,
    });
  }

  if (action.entityMetadata.priceLevel && weight > 0) {
    inferences.push({
      dimension: 'budget.priceLevel',
      value: action.entityMetadata.priceLevel,
      confidence: Math.abs(weight) * 0.5,
      source: action.actionType,
      reasoning: `Engaged with a price level ${action.entityMetadata.priceLevel}/5 ${action.entityType}.`,
    });
  }

  return inferences;
}

/** Infer dining preferences from restaurant interactions. */
function inferDiningPreferences(action: UserAction, weight: number): Inference[] {
  const inferences: Inference[] = [];
  const cuisine = action.entityMetadata.cuisineType!;

  if (weight > 0) {
    inferences.push({
      dimension: 'dietary.cuisineAffinity',
      value: cuisine,
      confidence: Math.abs(weight) * 0.7,
      source: action.actionType,
      reasoning: `User ${action.actionType}ed a ${cuisine} restaurant, suggesting cuisine affinity.`,
    });
  } else {
    inferences.push({
      dimension: 'dietary.cuisineAversion',
      value: cuisine,
      confidence: Math.abs(weight) * 0.4,
      source: action.actionType,
      reasoning: `User cancelled a ${cuisine} restaurant booking, which may indicate cuisine aversion (though cancellation reasons vary).`,
    });
  }

  return inferences;
}

/** Infer privacy and pace preferences from review content. */
function inferFromReview(action: UserAction, weight: number): Inference[] {
  const inferences: Inference[] = [];
  const review = action.reviewData!;
  const text = (review.reviewText ?? '').toLowerCase();

  // Privacy inference from review text
  const privacyPositive = ['private', 'secluded', 'peaceful', 'quiet', 'intimate', 'exclusive', 'tranquil'];
  const privacySentiment = privacyPositive.filter((word) => text.includes(word));
  if (privacySentiment.length > 0 && review.overallRating >= 4) {
    inferences.push({
      dimension: 'privacyPace.privacyLevel',
      value: privacySentiment.length >= 3 ? 'ultra_private' : 'private',
      confidence: weight * 0.6,
      source: action.actionType,
      reasoning: `Positive review mentions: ${privacySentiment.join(', ')}. High rating suggests these are valued attributes.`,
    });
  }

  const socialPositive = ['lively', 'vibrant', 'social', 'bustling', 'energetic', 'fun crowd'];
  const socialSentiment = socialPositive.filter((word) => text.includes(word));
  if (socialSentiment.length > 0 && review.overallRating >= 4) {
    inferences.push({
      dimension: 'privacyPace.privacyLevel',
      value: 'social',
      confidence: weight * 0.5,
      source: action.actionType,
      reasoning: `Positive review mentions social/lively attributes: ${socialSentiment.join(', ')}.`,
    });
  }

  // Pace inference from review text
  const activeWords = ['adventure', 'hiking', 'diving', 'surfing', 'exploring', 'excursion', 'trekking'];
  const activeSentiment = activeWords.filter((word) => text.includes(word));
  if (activeSentiment.length > 0 && review.overallRating >= 4) {
    inferences.push({
      dimension: 'privacyPace.pacePreference',
      value: activeSentiment.length >= 2 ? 'adventure' : 'active',
      confidence: weight * 0.6,
      source: action.actionType,
      reasoning: `Review mentions active/adventure keywords: ${activeSentiment.join(', ')}.`,
    });
  }

  const relaxedWords = ['relaxing', 'peaceful', 'lounging', 'lazy', 'unwind', 'spa', 'rejuvenate'];
  const relaxedSentiment = relaxedWords.filter((word) => text.includes(word));
  if (relaxedSentiment.length > 0 && review.overallRating >= 4) {
    inferences.push({
      dimension: 'privacyPace.pacePreference',
      value: 'relaxed',
      confidence: weight * 0.6,
      source: action.actionType,
      reasoning: `Review mentions relaxation keywords: ${relaxedSentiment.join(', ')}.`,
    });
  }

  // Design sub-ratings
  if (review.subRatings?.design && review.subRatings.design >= 4) {
    inferences.push({
      dimension: 'design.importance',
      value: 'high',
      confidence: weight * 0.7,
      source: action.actionType,
      reasoning: `User rated design ${review.subRatings.design}/5, showing design awareness.`,
    });
  }

  // Wellness inference
  if (review.subRatings?.food && review.subRatings.food >= 4) {
    inferences.push({
      dimension: 'dietary.mealImportance',
      value: 'essential',
      confidence: weight * 0.5,
      source: action.actionType,
      reasoning: `High food sub-rating (${review.subRatings.food}/5) indicates meals are important.`,
    });
  }

  return inferences;
}

/** Infer from cancellation reasons. */
function inferFromCancellation(action: UserAction): Inference[] {
  const inferences: Inference[] = [];
  const reason = (action.bookingData?.cancellationReason ?? '').toLowerCase();

  if (reason.includes('noise') || reason.includes('loud') || reason.includes('party')) {
    inferences.push({
      dimension: 'roomPreferences.noiseLevel',
      value: 'silent',
      confidence: 0.7,
      source: 'cancel',
      reasoning: `Cancellation due to noise concerns indicates preference for quiet environments.`,
    });
    inferences.push({
      dimension: 'privacyPace.crowdTolerance',
      value: 'low',
      confidence: 0.6,
      source: 'cancel',
      reasoning: `Noise-related cancellation suggests low crowd tolerance.`,
    });
  }

  if (reason.includes('expensive') || reason.includes('price') || reason.includes('cost') || reason.includes('overpriced')) {
    inferences.push({
      dimension: 'budget.priceSensitivity',
      value: 'high',
      confidence: 0.6,
      source: 'cancel',
      reasoning: `Price-related cancellation suggests higher price sensitivity.`,
    });
  }

  if (reason.includes('family') || reason.includes('children') || reason.includes('kid')) {
    inferences.push({
      dimension: 'familyStage.important',
      value: 'family_facilities',
      confidence: 0.7,
      source: 'cancel',
      reasoning: `Family-related cancellation indicates family-friendliness is a key criterion.`,
    });
  }

  if (reason.includes('accessibility') || reason.includes('wheelchair') || reason.includes('mobility')) {
    inferences.push({
      dimension: 'roomPreferences.accessibility',
      value: 'required',
      confidence: 0.9,
      source: 'cancel',
      reasoning: `Accessibility-related cancellation. This is a hard requirement, not a preference.`,
    });
  }

  return inferences;
}

// ---------------------------------------------------------------------------
// Profile Update Builder
// ---------------------------------------------------------------------------

/** Build profile updates from inferences, respecting existing explicit preferences. */
function buildProfileUpdates(
  profile: TravelerProfile,
  inferences: Inference[],
): Partial<TravelerProfile> {
  const updates: Partial<TravelerProfile> = {};

  // Group inferences by dimension
  const byDimension = new Map<string, Inference[]>();
  for (const inf of inferences) {
    const existing = byDimension.get(inf.dimension) ?? [];
    existing.push(inf);
    byDimension.set(inf.dimension, existing);
  }

  // Process design taste inferences
  const designPrimary = byDimension.get('design.primary');
  if (designPrimary && designPrimary.length > 0) {
    const best = designPrimary.reduce((a, b) => (a.confidence > b.confidence ? a : b));
    if (best.confidence > 0.5 && profile.designTaste.primary === 'no_preference') {
      updates.designTaste = {
        ...profile.designTaste,
        primary: best.value as string,
        updatedAt: new Date().toISOString(),
      };
    } else if (best.confidence > 0.3) {
      // Add as secondary if not already primary
      const existing = profile.designTaste.secondary.find((s) => s.style === best.value);
      const secondaries = [...profile.designTaste.secondary];
      if (existing) {
        existing.confidence = Math.min(1, existing.confidence + best.confidence * 0.3);
      } else {
        secondaries.push({ style: best.value as string, confidence: best.confidence });
      }
      updates.designTaste = {
        ...profile.designTaste,
        ...(updates.designTaste ?? {}),
        secondary: secondaries,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  const colorPalettes = byDimension.get('design.colorPalette');
  if (colorPalettes && colorPalettes.length > 0) {
    const palette = colorPalettes[0].value as 'warm' | 'cool' | 'neutral' | 'bold' | 'earthy';
    if (!profile.designTaste.colorPalette.includes(palette)) {
      updates.designTaste = {
        ...profile.designTaste,
        ...(updates.designTaste ?? {}),
        colorPalette: [...profile.designTaste.colorPalette, palette],
        updatedAt: new Date().toISOString(),
      };
    }
  }

  // Process privacy/pace inferences
  const privacyLevel = byDimension.get('privacyPace.privacyLevel');
  if (privacyLevel && privacyLevel.length > 0) {
    const best = privacyLevel.reduce((a, b) => (a.confidence > b.confidence ? a : b));
    if (best.confidence > 0.4) {
      updates.privacyPace = {
        ...profile.privacyPace,
        privacyLevel: best.value as TravelerProfile['privacyPace']['privacyLevel'],
      };
    }
  }

  const pacePreference = byDimension.get('privacyPace.pacePreference');
  if (pacePreference && pacePreference.length > 0) {
    const best = pacePreference.reduce((a, b) => (a.confidence > b.confidence ? a : b));
    if (best.confidence > 0.4) {
      updates.privacyPace = {
        ...(updates.privacyPace ?? profile.privacyPace),
        pacePreference: best.value as TravelerProfile['privacyPace']['pacePreference'],
      };
    }
  }

  // Process dining inferences
  const cuisineAffinity = byDimension.get('dietary.cuisineAffinity');
  if (cuisineAffinity && cuisineAffinity.length > 0) {
    const cuisine = cuisineAffinity[0].value as string;
    const existingAffinities = [...profile.dietaryProfile.cuisineAffinities];
    const existing = existingAffinities.find((a) => a.cuisine === cuisine);
    if (existing) {
      existing.score = Math.min(1, existing.score + cuisineAffinity[0].confidence * 0.2);
    } else {
      existingAffinities.push({ cuisine, score: cuisineAffinity[0].confidence * 0.5 });
    }
    updates.dietaryProfile = {
      ...profile.dietaryProfile,
      cuisineAffinities: existingAffinities,
    };
  }

  const cuisineAversion = byDimension.get('dietary.cuisineAversion');
  if (cuisineAversion && cuisineAversion.length > 0) {
    const cuisine = cuisineAversion[0].value as string;
    if (!profile.dietaryProfile.cuisineAversions.includes(cuisine)) {
      updates.dietaryProfile = {
        ...(updates.dietaryProfile ?? profile.dietaryProfile),
        cuisineAversions: [...profile.dietaryProfile.cuisineAversions, cuisine],
      };
    }
  }

  // Process budget inferences
  const budgetTier = byDimension.get('budget.tier');
  if (budgetTier && budgetTier.length > 0) {
    const best = budgetTier.reduce((a, b) => (a.confidence > b.confidence ? a : b));
    if (best.confidence > 0.5) {
      updates.budgetTier = {
        ...profile.budgetTier,
        tier: best.value as TravelerProfile['budgetTier']['tier'],
      };
    }
  }

  const priceSensitivity = byDimension.get('budget.priceSensitivity');
  if (priceSensitivity && priceSensitivity.length > 0) {
    const best = priceSensitivity.reduce((a, b) => (a.confidence > b.confidence ? a : b));
    updates.budgetTier = {
      ...(updates.budgetTier ?? profile.budgetTier),
      priceSensitivity: best.value as TravelerProfile['budgetTier']['priceSensitivity'],
    };
  }

  // Process noise/crowd inferences
  const noiseLevel = byDimension.get('roomPreferences.noiseLevel');
  if (noiseLevel && noiseLevel.length > 0) {
    updates.roomPreferences = {
      ...profile.roomPreferences,
      noiseLevel: noiseLevel[0].value as TravelerProfile['roomPreferences']['noiseLevel'],
    };
  }

  const crowdTolerance = byDimension.get('privacyPace.crowdTolerance');
  if (crowdTolerance && crowdTolerance.length > 0) {
    updates.privacyPace = {
      ...(updates.privacyPace ?? profile.privacyPace),
      crowdTolerance: crowdTolerance[0].value as TravelerProfile['privacyPace']['crowdTolerance'],
    };
  }

  return updates;
}

// ---------------------------------------------------------------------------
// Taste Vector
// ---------------------------------------------------------------------------

/**
 * Taste vector dimensions (32-dimensional embedding):
 *  0-4:  Design taste (minimalist, maximalist, rustic, art-deco, tropical)
 *  5-9:  Color palette (warm, cool, neutral, bold, earthy)
 * 10-14: Privacy/pace (private, social, relaxed, active, adventure)
 * 15-19: Budget (ultra_luxury, luxury, premium, moderate, budget)
 * 20-24: Dining (fine_dining, casual, local, international, dietary_conscious)
 * 25-29: Wellness (spa, fitness, outdoor, yoga, none)
 * 30-31: Family (family_oriented, adult_oriented)
 */
const VECTOR_DIMENSIONS = 32;

const DESIGN_MAP: Record<string, number> = { minimalist: 0, maximalist: 1, rustic: 2, 'art-deco': 3, tropical: 4, classical: 0, contemporary: 1, mediterranean: 2, industrial: 3 };
const PALETTE_MAP: Record<string, number> = { warm: 5, cool: 6, neutral: 7, bold: 8, earthy: 9 };
const PRIVACY_MAP: Record<string, number> = { ultra_private: 10, private: 10, social: 11, communal: 11 };
const PACE_MAP: Record<string, number> = { relaxed: 12, moderate: 12, active: 13, adventure: 14 };
const BUDGET_MAP: Record<string, number> = { ultra_luxury: 15, luxury: 16, premium: 17, moderate: 18, budget_conscious: 19 };
const FAMILY_MAP: Record<string, number> = { young_family: 30, school_age_family: 30, teen_family: 30, multi_generational: 30, solo: 31, couple: 31, empty_nest: 31, friends_group: 31 };

/**
 * Recompute the taste vector from the current profile state.
 * The vector is a 32-dimensional float array normalized to [0, 1].
 */
export async function updateTasteVector(userId: string): Promise<number[]> {
  const profile = await getProfile(userId);
  const vector = new Array<number>(VECTOR_DIMENSIONS).fill(0);

  // Design taste
  const primaryIdx = DESIGN_MAP[profile.designTaste.primary];
  if (primaryIdx !== undefined) {
    vector[primaryIdx] = 1.0;
  }
  for (const sec of profile.designTaste.secondary) {
    const idx = DESIGN_MAP[sec.style];
    if (idx !== undefined) {
      vector[idx] = Math.max(vector[idx], sec.confidence);
    }
  }

  // Color palette
  for (const palette of profile.designTaste.colorPalette) {
    const idx = PALETTE_MAP[palette];
    if (idx !== undefined) {
      vector[idx] = 1.0;
    }
  }

  // Privacy
  const privIdx = PRIVACY_MAP[profile.privacyPace.privacyLevel];
  if (privIdx !== undefined) {
    vector[privIdx] = 1.0;
  }

  // Pace
  const paceIdx = PACE_MAP[profile.privacyPace.pacePreference];
  if (paceIdx !== undefined) {
    vector[paceIdx] = 1.0;
  }

  // Budget
  const budgetIdx = BUDGET_MAP[profile.budgetTier.tier];
  if (budgetIdx !== undefined) {
    vector[budgetIdx] = 1.0;
  }

  // Wellness
  if (profile.wellnessPreferences.spaImportance === 'essential') vector[25] = 1.0;
  else if (profile.wellnessPreferences.spaImportance === 'nice_to_have') vector[25] = 0.5;
  if (profile.wellnessPreferences.fitnessRoutine === 'daily') vector[26] = 1.0;
  else if (profile.wellnessPreferences.fitnessRoutine === 'regular') vector[26] = 0.7;
  if (profile.wellnessPreferences.outdoorAffinity === 'high') vector[27] = 1.0;
  else if (profile.wellnessPreferences.outdoorAffinity === 'medium') vector[27] = 0.5;
  if (profile.wellnessPreferences.yogaMeditation) vector[28] = 1.0;

  // Family
  const famIdx = FAMILY_MAP[profile.familyStage.stage];
  if (famIdx !== undefined) {
    vector[famIdx] = 1.0;
  }

  // Normalize the vector
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  const normalized = magnitude > 0 ? vector.map((v) => v / magnitude) : vector;

  await updateProfile(userId, { tasteVector: normalized });
  return normalized;
}

/**
 * Compute cosine similarity between two taste vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denominator = Math.sqrt(magA) * Math.sqrt(magB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}
