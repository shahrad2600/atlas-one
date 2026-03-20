/**
 * Atlas One -- Traveler Profile Manager
 *
 * CRUD operations for traveler preference profiles. Stores deeply personal
 * travel DNA: taste, family stage, budget tier, room preferences, dietary
 * restrictions, sleep preferences, and celebration dates.
 *
 * This module owns the canonical traveler preference state. Other services
 * read from it; only the personalization service writes to it.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Design taste profile inferred from bookings and saves. */
export interface DesignTaste {
  /** Primary design affinity (e.g., "minimalist", "maximalist", "rustic", "art-deco"). */
  primary: string;
  /** Secondary affinities with confidence scores. */
  secondary: Array<{ style: string; confidence: number }>;
  /** Color palette preferences inferred from booked properties. */
  colorPalette: ('warm' | 'cool' | 'neutral' | 'bold' | 'earthy')[];
  /** Material preferences (e.g., "natural wood", "marble", "concrete"). */
  materials: string[];
  /** Updated timestamp. */
  updatedAt: string;
}

/** Room and accommodation preferences. */
export interface RoomPreferences {
  bedType: 'king' | 'queen' | 'twin' | 'double' | 'no_preference';
  floorPreference: 'high' | 'low' | 'mid' | 'no_preference';
  viewPreference: ('ocean' | 'garden' | 'city' | 'mountain' | 'pool' | 'no_preference')[];
  pillow: 'firm' | 'soft' | 'hypoallergenic' | 'no_preference';
  minibarStocked: boolean;
  roomTemperature: 'cool' | 'warm' | 'no_preference';
  bathroomPreference: 'bathtub' | 'walk_in_shower' | 'both' | 'no_preference';
  noiseLevel: 'silent' | 'ambient' | 'no_preference';
  smokingRoom: boolean;
  connectingRoom: boolean;
  accessibilityFeatures: string[];
}

/** Sleep preferences for jet-lag and room environment. */
export interface SleepPreferences {
  typicalBedtime: string; // HH:mm format
  typicalWakeTime: string;
  lightSensitivity: 'high' | 'medium' | 'low';
  needsBlackoutCurtains: boolean;
  whitenoisePref: 'none' | 'fan' | 'nature' | 'white_noise_machine';
  jetLagStrategy: 'pre_adjust' | 'local_immediate' | 'gradual' | 'none';
  napPreference: boolean;
}

/** Dietary profile for dining and in-room amenities. */
export interface DietaryProfile {
  restrictions: string[]; // e.g., ["gluten-free", "nut-free"]
  preferences: string[]; // e.g., ["organic", "farm-to-table"]
  allergies: string[]; // severe allergies, distinct from preferences
  cuisineAffinities: Array<{ cuisine: string; score: number }>;
  cuisineAversions: string[];
  alcoholPreference: 'none' | 'wine' | 'cocktails' | 'beer' | 'spirits' | 'all';
  mealImportance: {
    breakfast: 'essential' | 'nice_to_have' | 'skip';
    lunch: 'essential' | 'nice_to_have' | 'skip';
    dinner: 'essential' | 'nice_to_have' | 'skip';
  };
}

/** Celebration and important dates for proactive suggestions. */
export interface CelebrationDate {
  id: string;
  type: 'anniversary' | 'birthday' | 'graduation' | 'retirement' | 'honeymoon' | 'custom';
  label: string;
  date: string; // MM-DD or YYYY-MM-DD for one-time events
  recurring: boolean;
  personName?: string;
  notes?: string;
}

/** Privacy and pace preferences for trip style. */
export interface PrivacyPacePreferences {
  privacyLevel: 'ultra_private' | 'private' | 'social' | 'communal';
  pacePreference: 'relaxed' | 'moderate' | 'active' | 'adventure';
  crowdTolerance: 'low' | 'medium' | 'high';
  plannedVsSpontaneous: number; // 0 = fully spontaneous, 100 = fully planned
  morningPerson: boolean;
  poolsideType: 'serene' | 'social' | 'active' | 'skip';
}

/** Budget tier and spending patterns. */
export interface BudgetTier {
  tier: 'ultra_luxury' | 'luxury' | 'premium' | 'moderate' | 'budget_conscious';
  /** Average nightly rate comfort zone in USD. */
  avgNightlyRate: { min: number; max: number };
  /** Willingness to splurge on specific categories. */
  splurgeCategories: ('dining' | 'spa' | 'experiences' | 'flights' | 'accommodation')[];
  /** Price sensitivity: how much does price factor into decisions. */
  priceSensitivity: 'low' | 'medium' | 'high';
  /** Preferred payment structure. */
  preferredPayment: 'all_inclusive' | 'pay_as_you_go' | 'package_deal';
}

/** Family stage and travel companions context. */
export interface FamilyStage {
  stage: 'solo' | 'couple' | 'young_family' | 'school_age_family' | 'teen_family' | 'empty_nest' | 'multi_generational' | 'friends_group';
  childrenAges?: number[];
  travelingWithPets: boolean;
  elderlyCompanions: boolean;
  accessibilityNeeds: string[];
  typicalGroupSize: number;
}

/** Wellness and activity preferences. */
export interface WellnessPreferences {
  spaImportance: 'essential' | 'nice_to_have' | 'indifferent';
  fitnessRoutine: 'daily' | 'regular' | 'occasional' | 'none';
  yogaMeditation: boolean;
  preferredActivities: string[];
  outdoorAffinity: 'high' | 'medium' | 'low';
}

/** The complete traveler preference profile. */
export interface TravelerProfile {
  userId: string;
  designTaste: DesignTaste;
  roomPreferences: RoomPreferences;
  sleepPreferences: SleepPreferences;
  dietaryProfile: DietaryProfile;
  celebrationDates: CelebrationDate[];
  privacyPace: PrivacyPacePreferences;
  budgetTier: BudgetTier;
  familyStage: FamilyStage;
  wellnessPreferences: WellnessPreferences;
  /** Embedding vector for taste similarity matching. */
  tasteVector: number[];
  /** ISO timestamp of last profile update. */
  updatedAt: string;
  /** ISO timestamp of profile creation. */
  createdAt: string;
  /** Number of data points (bookings, reviews, saves) that have informed this profile. */
  dataPointCount: number;
  /** Confidence in the profile accuracy (0-1). */
  profileConfidence: number;
}

// ---------------------------------------------------------------------------
// Default Profile Factory
// ---------------------------------------------------------------------------

/** Create a blank profile for a new user. */
export function createDefaultProfile(userId: string): TravelerProfile {
  const now = new Date().toISOString();
  return {
    userId,
    designTaste: {
      primary: 'no_preference',
      secondary: [],
      colorPalette: [],
      materials: [],
      updatedAt: now,
    },
    roomPreferences: {
      bedType: 'no_preference',
      floorPreference: 'no_preference',
      viewPreference: ['no_preference'],
      pillow: 'no_preference',
      minibarStocked: false,
      roomTemperature: 'no_preference',
      bathroomPreference: 'no_preference',
      noiseLevel: 'no_preference',
      smokingRoom: false,
      connectingRoom: false,
      accessibilityFeatures: [],
    },
    sleepPreferences: {
      typicalBedtime: '23:00',
      typicalWakeTime: '07:00',
      lightSensitivity: 'medium',
      needsBlackoutCurtains: false,
      whitenoisePref: 'none',
      jetLagStrategy: 'none',
      napPreference: false,
    },
    dietaryProfile: {
      restrictions: [],
      preferences: [],
      allergies: [],
      cuisineAffinities: [],
      cuisineAversions: [],
      alcoholPreference: 'all',
      mealImportance: {
        breakfast: 'nice_to_have',
        lunch: 'nice_to_have',
        dinner: 'essential',
      },
    },
    celebrationDates: [],
    privacyPace: {
      privacyLevel: 'private',
      pacePreference: 'moderate',
      crowdTolerance: 'medium',
      plannedVsSpontaneous: 50,
      morningPerson: false,
      poolsideType: 'serene',
    },
    budgetTier: {
      tier: 'luxury',
      avgNightlyRate: { min: 300, max: 1200 },
      splurgeCategories: [],
      priceSensitivity: 'medium',
      preferredPayment: 'pay_as_you_go',
    },
    familyStage: {
      stage: 'couple',
      travelingWithPets: false,
      elderlyCompanions: false,
      accessibilityNeeds: [],
      typicalGroupSize: 2,
    },
    wellnessPreferences: {
      spaImportance: 'nice_to_have',
      fitnessRoutine: 'occasional',
      yogaMeditation: false,
      preferredActivities: [],
      outdoorAffinity: 'medium',
    },
    tasteVector: [],
    updatedAt: now,
    createdAt: now,
    dataPointCount: 0,
    profileConfidence: 0,
  };
}

// ---------------------------------------------------------------------------
// Profile Store (In-Memory for now, backed by PostgreSQL in production)
// ---------------------------------------------------------------------------

const profileStore = new Map<string, TravelerProfile>();

/**
 * Get a traveler's preference profile. Creates a default if none exists.
 */
export async function getProfile(userId: string): Promise<TravelerProfile> {
  let profile = profileStore.get(userId);
  if (!profile) {
    profile = createDefaultProfile(userId);
    profileStore.set(userId, profile);
  }
  return profile;
}

/**
 * Update a traveler's preference profile with a partial update.
 * Merges the update into the existing profile, preserving unmodified fields.
 */
export async function updateProfile(
  userId: string,
  update: Partial<Omit<TravelerProfile, 'userId' | 'createdAt'>>,
): Promise<TravelerProfile> {
  const existing = await getProfile(userId);
  const now = new Date().toISOString();

  const updated: TravelerProfile = {
    ...existing,
    ...update,
    userId: existing.userId,
    createdAt: existing.createdAt,
    updatedAt: now,
  };

  // Deep merge nested objects rather than replacing them wholesale
  if (update.designTaste) {
    updated.designTaste = { ...existing.designTaste, ...update.designTaste, updatedAt: now };
  }
  if (update.roomPreferences) {
    updated.roomPreferences = { ...existing.roomPreferences, ...update.roomPreferences };
  }
  if (update.sleepPreferences) {
    updated.sleepPreferences = { ...existing.sleepPreferences, ...update.sleepPreferences };
  }
  if (update.dietaryProfile) {
    updated.dietaryProfile = { ...existing.dietaryProfile, ...update.dietaryProfile };
  }
  if (update.privacyPace) {
    updated.privacyPace = { ...existing.privacyPace, ...update.privacyPace };
  }
  if (update.budgetTier) {
    updated.budgetTier = { ...existing.budgetTier, ...update.budgetTier };
  }
  if (update.familyStage) {
    updated.familyStage = { ...existing.familyStage, ...update.familyStage };
  }
  if (update.wellnessPreferences) {
    updated.wellnessPreferences = { ...existing.wellnessPreferences, ...update.wellnessPreferences };
  }

  // Celebration dates: if provided, replace the entire array
  if (update.celebrationDates) {
    updated.celebrationDates = update.celebrationDates;
  }

  profileStore.set(userId, updated);
  return updated;
}

/**
 * Add a celebration date to the profile.
 */
export async function addCelebrationDate(
  userId: string,
  date: Omit<CelebrationDate, 'id'>,
): Promise<CelebrationDate> {
  const profile = await getProfile(userId);
  const celebrationDate: CelebrationDate = {
    ...date,
    id: `cel_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
  };
  profile.celebrationDates.push(celebrationDate);
  profile.updatedAt = new Date().toISOString();
  profileStore.set(userId, profile);
  return celebrationDate;
}

/**
 * Remove a celebration date from the profile.
 */
export async function removeCelebrationDate(userId: string, dateId: string): Promise<boolean> {
  const profile = await getProfile(userId);
  const index = profile.celebrationDates.findIndex((d) => d.id === dateId);
  if (index === -1) return false;
  profile.celebrationDates.splice(index, 1);
  profile.updatedAt = new Date().toISOString();
  profileStore.set(userId, profile);
  return true;
}

/**
 * Get upcoming celebration dates within the next N days.
 */
export async function getUpcomingCelebrations(
  userId: string,
  withinDays: number = 90,
): Promise<CelebrationDate[]> {
  const profile = await getProfile(userId);
  const now = new Date();
  const cutoff = new Date(now.getTime() + withinDays * 86400000);

  return profile.celebrationDates.filter((cd) => {
    if (!cd.recurring) {
      const eventDate = new Date(cd.date);
      return eventDate >= now && eventDate <= cutoff;
    }
    // For recurring dates (MM-DD), check if the date falls within the range this year
    const [month, day] = cd.date.split('-').map(Number);
    const thisYear = new Date(now.getFullYear(), month - 1, day);
    const nextYear = new Date(now.getFullYear() + 1, month - 1, day);
    return (thisYear >= now && thisYear <= cutoff) || (nextYear >= now && nextYear <= cutoff);
  });
}

/**
 * Get profile confidence breakdown by section.
 */
export async function getProfileConfidenceBreakdown(
  userId: string,
): Promise<Record<string, number>> {
  const profile = await getProfile(userId);

  const hasDesignTaste = profile.designTaste.primary !== 'no_preference' ? 1 : 0;
  const hasRoomPrefs = profile.roomPreferences.bedType !== 'no_preference' ? 1 : 0;
  const hasDietary = profile.dietaryProfile.restrictions.length > 0 || profile.dietaryProfile.cuisineAffinities.length > 0 ? 1 : 0;
  const hasCelebrations = profile.celebrationDates.length > 0 ? 1 : 0;
  const hasBudget = profile.budgetTier.splurgeCategories.length > 0 ? 1 : 0;
  const hasWellness = profile.wellnessPreferences.preferredActivities.length > 0 ? 1 : 0;
  const hasTasteVector = profile.tasteVector.length > 0 ? 1 : 0;

  return {
    designTaste: hasDesignTaste,
    roomPreferences: hasRoomPrefs,
    dietaryProfile: hasDietary,
    celebrationDates: hasCelebrations,
    budgetTier: hasBudget,
    wellnessPreferences: hasWellness,
    tasteVector: hasTasteVector,
    overall: profile.profileConfidence,
    dataPoints: profile.dataPointCount,
  };
}
