/**
 * Atlas One -- Personal Ranking Engine
 *
 * Re-ranks the official LuxuryRankScore for each user based on their
 * traveler profile. The public leaderboard is never corrupted -- personal
 * rankings exist as a separate layer that only the authenticated user sees.
 *
 * Fit dimensions:
 *   privacy_fit   -- Does the property match the user's privacy level?
 *   design_fit    -- Does the property aesthetic match the user's taste?
 *   family_fit    -- Is the property right for the user's family stage?
 *   romance_fit   -- Does the property support romantic experiences?
 *   dining_fit    -- How well does the dining scene match preferences?
 *   wellness_fit  -- Does the property cater to the user's wellness needs?
 *
 * The PersonalRankScore is: officialScore * weightedFitAverage
 * fit_reasons explain why the personal rank differs from the public rank.
 */

import { getProfile, type TravelerProfile } from './traveler-profile.js';
import { cosineSimilarity } from './taste-learning.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A property from the official luxury rankings. */
export interface RankedProperty {
  canonicalId: string;
  name: string;
  /** Official LuxuryRankScore (0-100). */
  officialScore: number;
  /** Official rank position (1-based). */
  officialRank: number;
  location: {
    city: string;
    country: string;
    region: string;
    lat: number;
    lng: number;
  };
  /** Property attributes used for fit scoring. */
  attributes: PropertyAttributes;
  /** Taste vector for this property (same 32-dim space as traveler profiles). */
  tasteVector: number[];
}

/** Attributes of a property used for personalized fit scoring. */
export interface PropertyAttributes {
  propertyType: 'hotel' | 'resort' | 'villa' | 'boutique' | 'lodge' | 'ryokan' | 'palazzo' | 'chalet' | 'treehouse' | 'yacht';
  roomCount: number;
  privacyLevel: 'ultra_private' | 'private' | 'social' | 'communal';
  designStyle: string[];
  familyFriendly: boolean;
  childrenProgram: boolean;
  adultsOnly: boolean;
  romanticFeatures: string[];
  diningOptions: {
    onSiteFineIining: boolean;
    cuisineTypes: string[];
    dietaryAccommodations: string[];
    michelinStarred: boolean;
    numberOfRestaurants: number;
  };
  wellnessFeatures: {
    spa: boolean;
    spaSignatureTreatments: string[];
    gym: boolean;
    yoga: boolean;
    meditation: boolean;
    outdoorActivities: string[];
    pool: boolean;
    beachAccess: boolean;
  };
  serviceLevel: 'exceptional' | 'excellent' | 'good' | 'standard';
  priceCategory: 'ultra_luxury' | 'luxury' | 'premium' | 'moderate';
  paceVibe: 'serene' | 'relaxed' | 'moderate' | 'active' | 'vibrant';
  bestForOccasions: string[];
  notIdealFor: string[];
}

/** Personal fit score for a single dimension. */
export interface FitDimension {
  dimension: string;
  score: number; // 0-1
  weight: number; // how important this dimension is for this user
  reasoning: string;
}

/** A personally ranked property with fit explanation. */
export interface PersonallyRankedProperty {
  canonicalId: string;
  name: string;
  /** Official LuxuryRankScore (0-100). */
  officialScore: number;
  /** Official rank position. */
  officialRank: number;
  /** Personal score adjusted by fit (0-100). */
  personalScore: number;
  /** Personal rank position (1-based). */
  personalRank: number;
  /** Individual fit dimension scores. */
  fitDimensions: FitDimension[];
  /** Overall fit score (0-1). */
  overallFit: number;
  /** Human-readable reasons why the personal rank differs from official. */
  fitReasons: string[];
  /** Tags summarizing the fit. */
  fitTags: string[];
  /** Rank change from official (positive = moved up, negative = moved down). */
  rankChange: number;
}

/** Scope for ranking queries. */
export type RankingScope = 'all' | 'hotels' | 'resorts' | 'villas' | 'boutique' | 'lodges';

/** Geography filter for ranking queries. */
export type GeographyFilter = string; // e.g., "worldwide", "europe", "caribbean", "asia", "US:california"

// ---------------------------------------------------------------------------
// Mock Property Data (In production, fetched from ranking-service)
// ---------------------------------------------------------------------------

const MOCK_PROPERTIES: RankedProperty[] = [
  {
    canonicalId: 'prop_aman_tokyo',
    name: 'Aman Tokyo',
    officialScore: 96.2,
    officialRank: 1,
    location: { city: 'Tokyo', country: 'Japan', region: 'asia', lat: 35.6892, lng: 139.6945 },
    attributes: {
      propertyType: 'hotel',
      roomCount: 84,
      privacyLevel: 'ultra_private',
      designStyle: ['minimalist', 'japandi', 'contemporary'],
      familyFriendly: false,
      childrenProgram: false,
      adultsOnly: false,
      romanticFeatures: ['private_onsen', 'couples_spa', 'city_views'],
      diningOptions: { onSiteFineIining: true, cuisineTypes: ['Japanese', 'Italian'], dietaryAccommodations: ['gluten-free', 'vegan'], michelinStarred: false, numberOfRestaurants: 3 },
      wellnessFeatures: { spa: true, spaSignatureTreatments: ['Japanese_onsen', 'shiatsu'], gym: true, yoga: true, meditation: true, outdoorActivities: [], pool: true, beachAccess: false },
      serviceLevel: 'exceptional',
      priceCategory: 'ultra_luxury',
      paceVibe: 'serene',
      bestForOccasions: ['honeymoon', 'anniversary', 'solo_retreat', 'design_lovers'],
      notIdealFor: ['families_with_young_children', 'party_seekers'],
    },
    tasteVector: [1,0,0,0,0, 0,1,1,0,0, 1,0,1,0,0, 1,0,0,0,0, 1,0,0,1,0, 1,1,0,1,0, 0,1],
  },
  {
    canonicalId: 'prop_four_seasons_bora_bora',
    name: 'Four Seasons Bora Bora',
    officialScore: 94.8,
    officialRank: 2,
    location: { city: 'Bora Bora', country: 'French Polynesia', region: 'pacific', lat: -16.5004, lng: -151.7415 },
    attributes: {
      propertyType: 'resort',
      roomCount: 100,
      privacyLevel: 'private',
      designStyle: ['tropical', 'contemporary'],
      familyFriendly: true,
      childrenProgram: true,
      adultsOnly: false,
      romanticFeatures: ['overwater_bungalow', 'private_beach', 'sunset_cruise', 'stargazing'],
      diningOptions: { onSiteFineIining: true, cuisineTypes: ['French', 'Polynesian', 'International'], dietaryAccommodations: ['gluten-free', 'vegan', 'halal'], michelinStarred: false, numberOfRestaurants: 4 },
      wellnessFeatures: { spa: true, spaSignatureTreatments: ['Polynesian_massage', 'lagoon_treatment'], gym: true, yoga: true, meditation: false, outdoorActivities: ['snorkeling', 'diving', 'kayaking', 'jet_skiing'], pool: true, beachAccess: true },
      serviceLevel: 'exceptional',
      priceCategory: 'ultra_luxury',
      paceVibe: 'relaxed',
      bestForOccasions: ['honeymoon', 'anniversary', 'family_vacation', 'milestone_birthday'],
      notIdealFor: ['city_lovers', 'nightlife_seekers', 'budget_conscious'],
    },
    tasteVector: [0,0,0,0,1, 1,0,0,0,0, 0.8,0.2,1,0,0, 1,0,0,0,0, 1,0,1,0,0, 1,0,1,0,0, 0.5,0.5],
  },
  {
    canonicalId: 'prop_claridges_london',
    name: "Claridge's",
    officialScore: 93.5,
    officialRank: 3,
    location: { city: 'London', country: 'United Kingdom', region: 'europe', lat: 51.5126, lng: -0.1489 },
    attributes: {
      propertyType: 'hotel',
      roomCount: 190,
      privacyLevel: 'private',
      designStyle: ['art-deco', 'classical', 'glamorous'],
      familyFriendly: true,
      childrenProgram: true,
      adultsOnly: false,
      romanticFeatures: ['afternoon_tea', 'champagne_bar', 'art_deco_suites'],
      diningOptions: { onSiteFineIining: true, cuisineTypes: ['British', 'French', 'International'], dietaryAccommodations: ['gluten-free', 'vegan', 'kosher'], michelinStarred: true, numberOfRestaurants: 3 },
      wellnessFeatures: { spa: true, spaSignatureTreatments: ['thermal_bath', 'facial'], gym: true, yoga: false, meditation: false, outdoorActivities: [], pool: false, beachAccess: false },
      serviceLevel: 'exceptional',
      priceCategory: 'luxury',
      paceVibe: 'moderate',
      bestForOccasions: ['city_break', 'shopping_trip', 'anniversary', 'business'],
      notIdealFor: ['beach_lovers', 'adventure_seekers', 'budget_conscious'],
    },
    tasteVector: [0,0,0,1,0, 1,0,0,1,0, 0.7,0.3,0,0,0, 0,1,0,0,0, 1,1,0,1,1, 1,0,0,0,0, 0.5,0.5],
  },
  {
    canonicalId: 'prop_singita_kruger',
    name: 'Singita Kruger National Park',
    officialScore: 92.1,
    officialRank: 4,
    location: { city: 'Kruger', country: 'South Africa', region: 'africa', lat: -24.0167, lng: 31.4833 },
    attributes: {
      propertyType: 'lodge',
      roomCount: 15,
      privacyLevel: 'ultra_private',
      designStyle: ['rustic', 'contemporary', 'natural'],
      familyFriendly: false,
      childrenProgram: false,
      adultsOnly: true,
      romanticFeatures: ['private_deck', 'bush_dinner', 'starlit_boma'],
      diningOptions: { onSiteFineIining: true, cuisineTypes: ['South African', 'International'], dietaryAccommodations: ['gluten-free', 'vegan'], michelinStarred: false, numberOfRestaurants: 1 },
      wellnessFeatures: { spa: true, spaSignatureTreatments: ['African_treatments'], gym: true, yoga: true, meditation: true, outdoorActivities: ['safari', 'bush_walks', 'bird_watching'], pool: true, beachAccess: false },
      serviceLevel: 'exceptional',
      priceCategory: 'ultra_luxury',
      paceVibe: 'active',
      bestForOccasions: ['honeymoon', 'anniversary', 'adventure', 'wildlife_lovers'],
      notIdealFor: ['families_with_young_children', 'city_lovers', 'beach_lovers'],
    },
    tasteVector: [0,0,1,0,0, 0,0,0,0,1, 1,0,0,0.5,0.5, 1,0,0,0,0, 1,0,1,0,0, 1,1,1,1,0, 0,1],
  },
  {
    canonicalId: 'prop_rosewood_hong_kong',
    name: 'Rosewood Hong Kong',
    officialScore: 91.4,
    officialRank: 5,
    location: { city: 'Hong Kong', country: 'China', region: 'asia', lat: 22.2953, lng: 114.1625 },
    attributes: {
      propertyType: 'hotel',
      roomCount: 413,
      privacyLevel: 'private',
      designStyle: ['contemporary', 'art-deco', 'maximalist'],
      familyFriendly: true,
      childrenProgram: true,
      adultsOnly: false,
      romanticFeatures: ['harbour_views', 'rooftop_pool', 'cocktail_bar'],
      diningOptions: { onSiteFineIining: true, cuisineTypes: ['Chinese', 'Italian', 'Japanese', 'International'], dietaryAccommodations: ['gluten-free', 'vegan', 'halal'], michelinStarred: true, numberOfRestaurants: 8 },
      wellnessFeatures: { spa: true, spaSignatureTreatments: ['Asaya_wellness'], gym: true, yoga: true, meditation: true, outdoorActivities: [], pool: true, beachAccess: false },
      serviceLevel: 'exceptional',
      priceCategory: 'luxury',
      paceVibe: 'vibrant',
      bestForOccasions: ['city_break', 'foodie_trip', 'shopping_trip', 'business'],
      notIdealFor: ['beach_lovers', 'nature_seekers', 'budget_conscious'],
    },
    tasteVector: [0,1,0,1,0, 1,0,0,1,0, 0.5,0.5,0,0.5,0, 0,1,0,0,0, 1,1,0,1,1, 1,1,0,1,0, 0.5,0.5],
  },
];

// ---------------------------------------------------------------------------
// Fit Scoring Functions
// ---------------------------------------------------------------------------

/** Score how well a property matches the user's privacy preferences. */
function scorePrivacyFit(profile: TravelerProfile, property: RankedProperty): FitDimension {
  const userPref = profile.privacyPace.privacyLevel;
  const propLevel = property.attributes.privacyLevel;

  const privacyOrder = ['communal', 'social', 'private', 'ultra_private'];
  const userIdx = privacyOrder.indexOf(userPref);
  const propIdx = privacyOrder.indexOf(propLevel);
  const distance = Math.abs(userIdx - propIdx);

  let score: number;
  let reasoning: string;

  if (distance === 0) {
    score = 1.0;
    reasoning = `Perfect privacy match: both you and ${property.name} are ${propLevel}.`;
  } else if (distance === 1) {
    score = 0.7;
    reasoning = `Close privacy match: you prefer ${userPref}, ${property.name} is ${propLevel}.`;
  } else {
    score = Math.max(0.1, 1 - distance * 0.3);
    reasoning = `Privacy mismatch: you prefer ${userPref}, but ${property.name} is ${propLevel}.`;
  }

  // Small property bonus for privacy seekers
  if (userIdx >= 2 && property.attributes.roomCount <= 30) {
    score = Math.min(1, score + 0.15);
    reasoning += ` Bonus: only ${property.attributes.roomCount} rooms means genuine privacy.`;
  }

  const weight = userIdx >= 2 ? 0.2 : 0.1;

  return { dimension: 'privacy_fit', score, weight, reasoning };
}

/** Score how well a property's design matches the user's taste. */
function scoreDesignFit(profile: TravelerProfile, property: RankedProperty): FitDimension {
  // Use taste vector similarity if both are available
  if (profile.tasteVector.length > 0 && property.tasteVector.length > 0) {
    const similarity = cosineSimilarity(profile.tasteVector, property.tasteVector);
    const score = Math.max(0, Math.min(1, similarity));

    let reasoning: string;
    if (score >= 0.8) {
      reasoning = `Strong design match: ${property.name}'s aesthetic closely aligns with your taste profile.`;
    } else if (score >= 0.5) {
      reasoning = `Moderate design match: some overlap between your taste and ${property.name}'s style.`;
    } else {
      reasoning = `Low design match: ${property.name}'s style (${property.attributes.designStyle.join(', ')}) differs from your preferences.`;
    }

    const weight = profile.designTaste.primary !== 'no_preference' ? 0.2 : 0.1;
    return { dimension: 'design_fit', score, weight, reasoning };
  }

  // Fallback: keyword matching
  const userPrimary = profile.designTaste.primary;
  const propStyles = property.attributes.designStyle;

  let score = 0.5; // neutral baseline
  let reasoning = `Design comparison: your primary taste is ${userPrimary}, property offers ${propStyles.join(', ')}.`;

  if (userPrimary !== 'no_preference' && propStyles.includes(userPrimary)) {
    score = 0.9;
    reasoning = `Excellent design match: ${property.name} features your preferred ${userPrimary} style.`;
  } else {
    const secondaryMatch = profile.designTaste.secondary.find((s) => propStyles.includes(s.style));
    if (secondaryMatch) {
      score = 0.6 + secondaryMatch.confidence * 0.3;
      reasoning = `Secondary design match: ${property.name} features ${secondaryMatch.style}, which you also enjoy.`;
    }
  }

  return { dimension: 'design_fit', score, weight: 0.15, reasoning };
}

/** Score how well a property matches the user's family stage. */
function scoreFamilyFit(profile: TravelerProfile, property: RankedProperty): FitDimension {
  const stage = profile.familyStage.stage;
  const attrs = property.attributes;

  let score: number;
  let reasoning: string;

  const needsFamilyFriendly = ['young_family', 'school_age_family', 'teen_family', 'multi_generational'].includes(stage);

  if (needsFamilyFriendly) {
    if (attrs.adultsOnly) {
      score = 0.0;
      reasoning = `${property.name} is adults-only, which does not work for your family stage (${stage}).`;
    } else if (attrs.familyFriendly && attrs.childrenProgram) {
      score = 1.0;
      reasoning = `${property.name} is family-friendly with a dedicated children's program.`;
    } else if (attrs.familyFriendly) {
      score = 0.7;
      reasoning = `${property.name} is family-friendly but lacks a dedicated children's program.`;
    } else {
      score = 0.3;
      reasoning = `${property.name} may not be ideal for families; limited family facilities.`;
    }
  } else if (stage === 'couple' || stage === 'solo') {
    if (attrs.adultsOnly) {
      score = 0.9;
      reasoning = `${property.name} is adults-only, perfect for ${stage} travelers.`;
    } else if (!attrs.familyFriendly) {
      score = 0.8;
      reasoning = `${property.name} is not primarily family-oriented, which suits your ${stage} travel style.`;
    } else {
      score = 0.5;
      reasoning = `${property.name} is family-friendly; as a ${stage} traveler, you may encounter families.`;
    }
  } else {
    score = 0.6;
    reasoning = `Neutral family fit for your travel stage (${stage}).`;
  }

  const weight = needsFamilyFriendly ? 0.25 : 0.1;
  return { dimension: 'family_fit', score, weight, reasoning };
}

/** Score romantic fit. */
function scoreRomanceFit(profile: TravelerProfile, property: RankedProperty): FitDimension {
  const isRomanticTraveler = ['couple', 'empty_nest'].includes(profile.familyStage.stage);
  const romanticFeatures = property.attributes.romanticFeatures;

  if (!isRomanticTraveler) {
    return {
      dimension: 'romance_fit',
      score: 0.5,
      weight: 0.05,
      reasoning: 'Romance fit is not a primary factor for your travel stage.',
    };
  }

  const featureCount = romanticFeatures.length;
  let score: number;
  let reasoning: string;

  if (featureCount >= 3) {
    score = 1.0;
    reasoning = `${property.name} offers ${featureCount} romantic features: ${romanticFeatures.slice(0, 3).join(', ')}.`;
  } else if (featureCount >= 1) {
    score = 0.6;
    reasoning = `${property.name} has some romantic features: ${romanticFeatures.join(', ')}.`;
  } else {
    score = 0.2;
    reasoning = `${property.name} has limited romantic features for couples.`;
  }

  // Check upcoming celebrations
  const hasCelebration = property.attributes.bestForOccasions.some((o) =>
    ['honeymoon', 'anniversary'].includes(o),
  );
  if (hasCelebration) {
    score = Math.min(1, score + 0.1);
    reasoning += ' Bonus: specifically recommended for romantic occasions.';
  }

  return { dimension: 'romance_fit', score, weight: 0.15, reasoning };
}

/** Score dining fit. */
function scoreDiningFit(profile: TravelerProfile, property: RankedProperty): FitDimension {
  const dining = property.attributes.diningOptions;
  let score = 0.5;
  const reasons: string[] = [];

  // Dietary accommodation check
  const userRestrictions = profile.dietaryProfile.restrictions;
  if (userRestrictions.length > 0) {
    const accommodated = userRestrictions.filter((r) =>
      dining.dietaryAccommodations.some((d) => d.toLowerCase().includes(r.toLowerCase())),
    );
    if (accommodated.length === userRestrictions.length) {
      score += 0.2;
      reasons.push('All dietary restrictions accommodated.');
    } else if (accommodated.length > 0) {
      score += 0.1;
      reasons.push(`Partial dietary accommodation: ${accommodated.join(', ')} covered.`);
    } else {
      score -= 0.2;
      reasons.push(`Dietary concern: your restrictions (${userRestrictions.join(', ')}) may not be accommodated.`);
    }
  }

  // Cuisine affinity check
  const affinities = profile.dietaryProfile.cuisineAffinities;
  if (affinities.length > 0) {
    const matched = affinities.filter((a) =>
      dining.cuisineTypes.some((c) => c.toLowerCase().includes(a.cuisine.toLowerCase())),
    );
    if (matched.length > 0) {
      score += 0.15 * matched.length;
      reasons.push(`Serves cuisines you enjoy: ${matched.map((m) => m.cuisine).join(', ')}.`);
    }
  }

  // Fine dining importance
  if (profile.dietaryProfile.mealImportance.dinner === 'essential') {
    if (dining.onSiteFineIining) {
      score += 0.15;
      reasons.push('On-site fine dining available.');
    }
    if (dining.michelinStarred) {
      score += 0.1;
      reasons.push('Michelin-starred restaurant on property.');
    }
    if (dining.numberOfRestaurants >= 3) {
      score += 0.1;
      reasons.push(`${dining.numberOfRestaurants} on-site restaurants for variety.`);
    }
  }

  score = Math.max(0, Math.min(1, score));
  const weight = profile.dietaryProfile.mealImportance.dinner === 'essential' ? 0.15 : 0.1;

  return {
    dimension: 'dining_fit',
    score,
    weight,
    reasoning: reasons.length > 0 ? reasons.join(' ') : `Standard dining facilities at ${property.name}.`,
  };
}

/** Score wellness fit. */
function scoreWellnessFit(profile: TravelerProfile, property: RankedProperty): FitDimension {
  const wellness = property.attributes.wellnessFeatures;
  const prefs = profile.wellnessPreferences;
  let score = 0.5;
  const reasons: string[] = [];

  if (prefs.spaImportance === 'essential') {
    if (wellness.spa) {
      score += 0.25;
      reasons.push('Spa available.');
      if (wellness.spaSignatureTreatments.length > 0) {
        score += 0.1;
        reasons.push(`Signature treatments: ${wellness.spaSignatureTreatments.join(', ')}.`);
      }
    } else {
      score -= 0.3;
      reasons.push('No spa facility -- this is essential for you.');
    }
  }

  if (prefs.fitnessRoutine === 'daily' || prefs.fitnessRoutine === 'regular') {
    if (wellness.gym) {
      score += 0.1;
      reasons.push('Gym available.');
    } else {
      score -= 0.1;
      reasons.push('No gym facility.');
    }
  }

  if (prefs.yogaMeditation) {
    if (wellness.yoga || wellness.meditation) {
      score += 0.15;
      reasons.push('Yoga/meditation offered.');
    }
  }

  if (prefs.outdoorAffinity === 'high') {
    if (wellness.outdoorActivities.length > 0) {
      score += 0.15;
      reasons.push(`Outdoor activities: ${wellness.outdoorActivities.join(', ')}.`);
    }
    if (wellness.beachAccess) {
      score += 0.1;
      reasons.push('Beach access.');
    }
  }

  score = Math.max(0, Math.min(1, score));
  const weight = prefs.spaImportance === 'essential' ? 0.2 : prefs.fitnessRoutine === 'daily' ? 0.15 : 0.1;

  return {
    dimension: 'wellness_fit',
    score,
    weight,
    reasoning: reasons.length > 0 ? reasons.join(' ') : 'Standard wellness facilities.',
  };
}

// ---------------------------------------------------------------------------
// Main Ranking Functions
// ---------------------------------------------------------------------------

/**
 * Compute the personal fit score for a single property against a user profile.
 */
export function computeFitScore(
  profile: TravelerProfile,
  property: RankedProperty,
): { overallFit: number; dimensions: FitDimension[]; fitReasons: string[]; fitTags: string[] } {
  const dimensions: FitDimension[] = [
    scorePrivacyFit(profile, property),
    scoreDesignFit(profile, property),
    scoreFamilyFit(profile, property),
    scoreRomanceFit(profile, property),
    scoreDiningFit(profile, property),
    scoreWellnessFit(profile, property),
  ];

  // Weighted average
  const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
  const weightedSum = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);
  const overallFit = totalWeight > 0 ? weightedSum / totalWeight : 0.5;

  // Generate fit reasons (only for dimensions that significantly differ from neutral)
  const fitReasons: string[] = [];
  const fitTags: string[] = [];

  for (const dim of dimensions) {
    if (dim.score >= 0.8) {
      fitReasons.push(`+ ${dim.reasoning}`);
      fitTags.push(`strong_${dim.dimension}`);
    } else if (dim.score <= 0.3) {
      fitReasons.push(`- ${dim.reasoning}`);
      fitTags.push(`weak_${dim.dimension}`);
    }
  }

  // Add best-for occasion matches
  const occasionMap: Record<string, string[]> = {
    couple: ['honeymoon', 'anniversary', 'romantic'],
    solo: ['solo_retreat'],
    young_family: ['family_vacation'],
    school_age_family: ['family_vacation'],
  };

  const relevantOccasions = occasionMap[profile.familyStage.stage] ?? [];
  const matchedOccasions = property.attributes.bestForOccasions.filter((o) =>
    relevantOccasions.some((r) => o.includes(r)),
  );
  if (matchedOccasions.length > 0) {
    fitTags.push('occasion_match');
  }

  return { overallFit, dimensions, fitReasons, fitTags };
}

/**
 * Generate a personal ranking for a user within a scope and geography.
 *
 * IMPORTANT: This never modifies the official rankings. The personalScore
 * is derived from officialScore * fit multiplier, ensuring the public
 * leaderboard remains untouched.
 */
export async function getPersonalRanking(
  userId: string,
  scope: RankingScope,
  geography: GeographyFilter,
): Promise<PersonallyRankedProperty[]> {
  const profile = await getProfile(userId);

  // Filter properties by scope and geography
  let candidates = [...MOCK_PROPERTIES];

  if (scope !== 'all') {
    const scopeMap: Record<string, string[]> = {
      hotels: ['hotel'],
      resorts: ['resort'],
      villas: ['villa'],
      boutique: ['boutique'],
      lodges: ['lodge'],
    };
    const types = scopeMap[scope] ?? [];
    if (types.length > 0) {
      candidates = candidates.filter((p) => types.includes(p.attributes.propertyType));
    }
  }

  if (geography !== 'worldwide') {
    candidates = candidates.filter((p) => {
      const geo = geography.toLowerCase();
      return (
        p.location.region.toLowerCase() === geo ||
        p.location.country.toLowerCase().includes(geo) ||
        p.location.city.toLowerCase().includes(geo)
      );
    });
  }

  // Compute personal scores
  const personallyRanked: PersonallyRankedProperty[] = candidates.map((property) => {
    const { overallFit, dimensions, fitReasons, fitTags } = computeFitScore(profile, property);

    // Personal score: official score scaled by fit
    // Fit multiplier ranges from 0.6 to 1.3 to allow meaningful re-ranking
    // without completely inverting the official order
    const fitMultiplier = 0.6 + overallFit * 0.7;
    const personalScore = Math.min(100, property.officialScore * fitMultiplier);

    return {
      canonicalId: property.canonicalId,
      name: property.name,
      officialScore: property.officialScore,
      officialRank: property.officialRank,
      personalScore: Math.round(personalScore * 10) / 10,
      personalRank: 0, // computed after sorting
      fitDimensions: dimensions,
      overallFit: Math.round(overallFit * 100) / 100,
      fitReasons,
      fitTags,
      rankChange: 0, // computed after sorting
    };
  });

  // Sort by personal score descending
  personallyRanked.sort((a, b) => b.personalScore - a.personalScore);

  // Assign personal ranks and compute rank changes
  for (let i = 0; i < personallyRanked.length; i++) {
    personallyRanked[i].personalRank = i + 1;
    personallyRanked[i].rankChange = personallyRanked[i].officialRank - (i + 1);
  }

  return personallyRanked;
}

/**
 * Get the fit score for a specific property for a specific user.
 */
export async function getPropertyFit(
  userId: string,
  canonicalId: string,
): Promise<PersonallyRankedProperty | null> {
  const profile = await getProfile(userId);
  const property = MOCK_PROPERTIES.find((p) => p.canonicalId === canonicalId);

  if (!property) return null;

  const { overallFit, dimensions, fitReasons, fitTags } = computeFitScore(profile, property);
  const fitMultiplier = 0.6 + overallFit * 0.7;
  const personalScore = Math.min(100, property.officialScore * fitMultiplier);

  return {
    canonicalId: property.canonicalId,
    name: property.name,
    officialScore: property.officialScore,
    officialRank: property.officialRank,
    personalScore: Math.round(personalScore * 10) / 10,
    personalRank: 0, // not applicable for single property
    fitDimensions: dimensions,
    overallFit: Math.round(overallFit * 100) / 100,
    fitReasons,
    fitTags,
    rankChange: 0,
  };
}
