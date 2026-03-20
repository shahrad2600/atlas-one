/**
 * Atlas One -- Luxury Taxonomy Agent
 *
 * Classifies properties into the Atlas One luxury taxonomy. Each property
 * receives a primary classification and secondary affinities from a fixed
 * vocabulary of luxury archetypes.
 *
 * Taxonomy archetypes:
 *   discreet_classical   -- Old-money elegance, understated, Aman / Four Seasons
 *   design_led           -- Architecture-forward, statement interiors, Bulgari / Nobu
 *   barefoot             -- Elevated casual, sand-between-toes luxury, Soneva / Six Senses
 *   family_polished      -- Refined family experience, kids' programs, One&Only / Mandarin Oriental
 *   social_glamour       -- See-and-be-seen, vibrant nightlife, Nobu / W / St. Regis
 *   wellness_first       -- Healing and transformation focus, SHA / Clinique La Prairie
 *   heritage_grand       -- Historic properties with legacy, Claridge's / The Ritz Paris
 *   expedition_adventure -- Remote, adventure-focused, Explora / AndBeyond
 *   safari_lodge          -- Wildlife and bush luxury, Singita / &Beyond
 *   ski_service           -- Alpine luxury with ski-in/ski-out, Chedi / Aman Le Melezin
 *
 * The agent uses property descriptions, reviews, photo metadata, and location
 * signals to assign classifications. It does NOT change the official rank.
 *
 * Design invariant: All mutations flow through the Tool Registry.
 */

import type {
  SubAgent,
  Intent,
  TripContext,
  AgentResponse,
} from './orchestrator';

// ---------------------------------------------------------------------------
// Taxonomy Types
// ---------------------------------------------------------------------------

/** The fixed luxury archetype vocabulary. */
export type LuxuryArchetype =
  | 'discreet_classical'
  | 'design_led'
  | 'barefoot'
  | 'family_polished'
  | 'social_glamour'
  | 'wellness_first'
  | 'heritage_grand'
  | 'expedition_adventure'
  | 'safari_lodge'
  | 'ski_service';

/** Classification result for a property. */
export interface TaxonomyClassification {
  canonicalId: string;
  propertyName: string;
  primary: LuxuryArchetype;
  primaryConfidence: number;
  secondaryAffinities: Array<{ archetype: LuxuryArchetype; confidence: number }>;
  classificationSignals: ClassificationSignal[];
  classifiedAt: string;
  classifiedBy: string;
}

/** A signal that contributed to the classification decision. */
export interface ClassificationSignal {
  source: 'description' | 'reviews' | 'amenities' | 'location' | 'photos' | 'brand' | 'property_type';
  signal: string;
  suggestedArchetype: LuxuryArchetype;
  weight: number;
}

/** Input for classification: property data from multiple sources. */
export interface PropertyClassificationInput {
  canonicalId: string;
  name: string;
  description: string;
  propertyType: string;
  brand?: string;
  location: {
    city: string;
    country: string;
    region: string;
    terrain?: string; // e.g., "beach", "mountain", "city", "bush", "island"
  };
  amenities: string[];
  reviewSummary?: {
    totalReviews: number;
    averageRating: number;
    topThemes: string[];
    topPhrases: string[];
  };
  photoTags?: string[]; // e.g., ["infinity_pool", "bush_view", "modern_architecture"]
  roomCount: number;
  priceCategory: string;
}

// ---------------------------------------------------------------------------
// Keyword Signals by Archetype
// ---------------------------------------------------------------------------

const ARCHETYPE_KEYWORDS: Record<LuxuryArchetype, { description: string[]; amenities: string[]; reviewThemes: string[]; photoTags: string[]; brands: string[]; terrains: string[] }> = {
  discreet_classical: {
    description: ['understated', 'serene', 'tranquil', 'refined', 'timeless', 'sanctuary', 'minimalist', 'zen', 'private', 'secluded', 'discreet'],
    amenities: ['private_pool', 'butler', 'private_villa', 'library', 'tea_ceremony', 'meditation', 'onsen'],
    reviewThemes: ['peaceful', 'quiet', 'impeccable_service', 'privacy', 'understated_luxury'],
    photoTags: ['zen_garden', 'minimalist_interior', 'private_pool', 'library'],
    brands: ['aman', 'amanresorts', 'four_seasons', 'park_hyatt', 'peninsula'],
    terrains: [],
  },
  design_led: {
    description: ['architectural', 'design', 'contemporary', 'bold', 'statement', 'curated', 'gallery', 'art', 'iconic', 'avant-garde'],
    amenities: ['art_gallery', 'designer_furniture', 'rooftop_bar', 'cocktail_bar', 'concept_store'],
    reviewThemes: ['stunning_design', 'instagram', 'beautiful_interiors', 'architectural', 'art_collection'],
    photoTags: ['modern_architecture', 'designer_interior', 'art_installation', 'statement_lighting'],
    brands: ['bulgari', 'nobu', 'edition', 'ace', 'soho_house'],
    terrains: [],
  },
  barefoot: {
    description: ['barefoot', 'island', 'tropical', 'eco', 'sustainable', 'overwater', 'lagoon', 'reef', 'sand', 'castaway', 'natural'],
    amenities: ['overwater_villa', 'snorkeling', 'diving', 'beach_access', 'coral_reef', 'kayaking', 'stargazing', 'organic_garden'],
    reviewThemes: ['paradise', 'pristine_beach', 'crystal_clear_water', 'natural_beauty', 'eco_friendly'],
    photoTags: ['overwater_bungalow', 'beach', 'coral', 'sunset', 'tropical_garden'],
    brands: ['soneva', 'six_senses', 'como', 'anantara'],
    terrains: ['beach', 'island'],
  },
  family_polished: {
    description: ['family', 'children', 'kids', 'multi-generational', 'connecting_rooms', 'nanny', 'playground', 'waterpark'],
    amenities: ['kids_club', 'children_pool', 'family_suite', 'babysitting', 'connecting_rooms', 'playground', 'teen_lounge', 'family_activities'],
    reviewThemes: ['family_friendly', 'kids_loved_it', 'great_for_children', 'family_vacation'],
    photoTags: ['kids_pool', 'playground', 'family_suite', 'waterslide'],
    brands: ['one_and_only', 'mandarin_oriental', 'ritz_carlton', 'four_seasons', 'belmond'],
    terrains: [],
  },
  social_glamour: {
    description: ['glamorous', 'vibrant', 'nightlife', 'scene', 'celebrity', 'trendy', 'party', 'DJ', 'club', 'social'],
    amenities: ['nightclub', 'rooftop_bar', 'dj', 'beach_club', 'pool_party', 'vip_area', 'champagne_bar'],
    reviewThemes: ['amazing_nightlife', 'celebrity_sightings', 'trendy', 'see_and_be_seen', 'great_pool_scene'],
    photoTags: ['rooftop_bar', 'beach_club', 'pool_party', 'cocktails', 'nightlife'],
    brands: ['w_hotels', 'nobu', 'edition', 'sls', 'st_regis', 'faena'],
    terrains: [],
  },
  wellness_first: {
    description: ['wellness', 'healing', 'detox', 'cleanse', 'medical', 'longevity', 'rejuvenation', 'holistic', 'therapeutic', 'retreat'],
    amenities: ['medical_spa', 'hydrotherapy', 'cryotherapy', 'nutritionist', 'sleep_program', 'detox_program', 'iv_therapy', 'thermal_bath', 'sauna', 'hammam'],
    reviewThemes: ['life_changing', 'transformed', 'best_spa', 'wellness_journey', 'healing'],
    photoTags: ['spa_treatment', 'thermal_pool', 'meditation_room', 'wellness_center'],
    brands: ['sha_wellness', 'clinique_la_prairie', 'chenot', 'lanserhof', 'vana', 'chiva_som'],
    terrains: [],
  },
  heritage_grand: {
    description: ['historic', 'heritage', 'palace', 'grand', 'landmark', 'legendary', 'storied', 'century', 'restored', 'Victorian', 'Edwardian'],
    amenities: ['ballroom', 'afternoon_tea', 'grand_staircase', 'historic_suite', 'heritage_tour', 'archive'],
    reviewThemes: ['stepping_back_in_time', 'old_world_charm', 'legendary', 'iconic', 'tradition'],
    photoTags: ['grand_lobby', 'historic_facade', 'chandelier', 'antique_furniture', 'period_detail'],
    brands: ['claridges', 'ritz_paris', 'raffles', 'belmond', 'dorchester', 'savoy'],
    terrains: ['city'],
  },
  expedition_adventure: {
    description: ['expedition', 'adventure', 'remote', 'wilderness', 'exploration', 'trekking', 'glacier', 'volcano', 'fjord', 'arctic', 'patagonia'],
    amenities: ['guided_expeditions', 'helicopter', 'climbing_gear', 'expedition_boat', 'naturalist_guide', 'kayak'],
    reviewThemes: ['once_in_a_lifetime', 'incredible_adventure', 'remote', 'off_the_beaten_path', 'extraordinary_guides'],
    photoTags: ['glacier', 'mountain_peak', 'wilderness', 'expedition_boat', 'northern_lights'],
    brands: ['explora', 'andbeyond', 'natural_habitat', 'silversea_expeditions', 'nothern_escape'],
    terrains: ['mountain', 'arctic', 'wilderness'],
  },
  safari_lodge: {
    description: ['safari', 'game_drive', 'bush', 'wildlife', 'big_five', 'conservation', 'ranger', 'boma', 'bushveld', 'sundowner'],
    amenities: ['game_drive', 'bush_walk', 'bird_watching', 'night_safari', 'conservation_program', 'boma_dinner', 'sundowner', 'private_guide'],
    reviewThemes: ['incredible_wildlife', 'amazing_guide', 'unforgettable_safari', 'big_five', 'conservation'],
    photoTags: ['safari_vehicle', 'lion', 'elephant', 'bush_view', 'boma', 'sundowner'],
    brands: ['singita', 'andbeyond', 'great_plains', 'wilderness_safaris', 'sanctuary_retreats'],
    terrains: ['bush', 'savanna'],
  },
  ski_service: {
    description: ['ski', 'alpine', 'chalet', 'slope', 'piste', 'apres-ski', 'snow', 'gondola', 'mountain', 'ski-in', 'ski-out'],
    amenities: ['ski_in_ski_out', 'ski_valet', 'boot_warming', 'ski_concierge', 'apres_ski_bar', 'heated_pool', 'fireplace', 'fondue'],
    reviewThemes: ['perfect_ski_access', 'amazing_slopes', 'cozy_chalet', 'best_apres_ski', 'ski_in_ski_out'],
    photoTags: ['ski_slope', 'chalet', 'mountain_view', 'fireplace', 'snow'],
    brands: ['aman', 'chedi', 'ultima', 'kulm', 'badrutts_palace', 'the_alpina'],
    terrains: ['mountain', 'alpine'],
  },
};

// ---------------------------------------------------------------------------
// Classification Engine
// ---------------------------------------------------------------------------

/**
 * Classify a property into the luxury taxonomy.
 */
export function classifyProperty(input: PropertyClassificationInput): TaxonomyClassification {
  const signals: ClassificationSignal[] = [];
  const archetypeScores: Record<LuxuryArchetype, number> = {
    discreet_classical: 0,
    design_led: 0,
    barefoot: 0,
    family_polished: 0,
    social_glamour: 0,
    wellness_first: 0,
    heritage_grand: 0,
    expedition_adventure: 0,
    safari_lodge: 0,
    ski_service: 0,
  };

  const descLower = input.description.toLowerCase();
  const amenitiesLower = input.amenities.map((a) => a.toLowerCase());

  for (const [archetype, keywords] of Object.entries(ARCHETYPE_KEYWORDS) as [LuxuryArchetype, typeof ARCHETYPE_KEYWORDS[LuxuryArchetype]][]) {
    // Description matching
    for (const kw of keywords.description) {
      if (descLower.includes(kw)) {
        archetypeScores[archetype] += 1.0;
        signals.push({
          source: 'description',
          signal: `Description contains "${kw}"`,
          suggestedArchetype: archetype,
          weight: 1.0,
        });
      }
    }

    // Amenity matching
    for (const kw of keywords.amenities) {
      if (amenitiesLower.some((a) => a.includes(kw) || kw.includes(a))) {
        archetypeScores[archetype] += 1.5;
        signals.push({
          source: 'amenities',
          signal: `Amenity matches "${kw}"`,
          suggestedArchetype: archetype,
          weight: 1.5,
        });
      }
    }

    // Review theme matching
    if (input.reviewSummary) {
      const themes = input.reviewSummary.topThemes.map((t) => t.toLowerCase());
      const phrases = input.reviewSummary.topPhrases.map((p) => p.toLowerCase());
      const combined = [...themes, ...phrases];
      for (const kw of keywords.reviewThemes) {
        if (combined.some((t) => t.includes(kw) || kw.includes(t))) {
          archetypeScores[archetype] += 1.2;
          signals.push({
            source: 'reviews',
            signal: `Review theme matches "${kw}"`,
            suggestedArchetype: archetype,
            weight: 1.2,
          });
        }
      }
    }

    // Photo tag matching
    if (input.photoTags) {
      for (const kw of keywords.photoTags) {
        if (input.photoTags.some((t) => t.toLowerCase().includes(kw))) {
          archetypeScores[archetype] += 0.8;
          signals.push({
            source: 'photos',
            signal: `Photo tag matches "${kw}"`,
            suggestedArchetype: archetype,
            weight: 0.8,
          });
        }
      }
    }

    // Brand matching
    if (input.brand) {
      const brandLower = input.brand.toLowerCase().replace(/[\s-]/g, '_');
      if (keywords.brands.some((b) => brandLower.includes(b) || b.includes(brandLower))) {
        archetypeScores[archetype] += 3.0;
        signals.push({
          source: 'brand',
          signal: `Brand "${input.brand}" is associated with ${archetype}`,
          suggestedArchetype: archetype,
          weight: 3.0,
        });
      }
    }

    // Terrain/location matching
    if (input.location.terrain) {
      const terrainLower = input.location.terrain.toLowerCase();
      if (keywords.terrains.some((t) => terrainLower.includes(t) || t.includes(terrainLower))) {
        archetypeScores[archetype] += 1.5;
        signals.push({
          source: 'location',
          signal: `Terrain "${input.location.terrain}" matches ${archetype}`,
          suggestedArchetype: archetype,
          weight: 1.5,
        });
      }
    }
  }

  // Sort archetypes by score
  const sorted = (Object.entries(archetypeScores) as [LuxuryArchetype, number][])
    .sort(([, a], [, b]) => b - a);

  const maxScore = sorted[0][1];
  const primary = sorted[0][0];
  const primaryConfidence = maxScore > 0 ? Math.min(1, maxScore / 10) : 0.1;

  const secondaryAffinities = sorted
    .slice(1)
    .filter(([, score]) => score > 0)
    .map(([archetype, score]) => ({
      archetype,
      confidence: Math.min(1, score / 10),
    }))
    .slice(0, 3);

  return {
    canonicalId: input.canonicalId,
    propertyName: input.name,
    primary,
    primaryConfidence,
    secondaryAffinities,
    classificationSignals: signals,
    classifiedAt: new Date().toISOString(),
    classifiedBy: 'luxury-taxonomy-agent',
  };
}

// ---------------------------------------------------------------------------
// In-Memory Classification Store
// ---------------------------------------------------------------------------

const classificationStore = new Map<string, TaxonomyClassification>();

// ---------------------------------------------------------------------------
// Luxury Taxonomy Agent
// ---------------------------------------------------------------------------

export class LuxuryTaxonomyAgent implements SubAgent {
  public readonly agentId = 'luxury-taxonomy-agent';
  public readonly name = 'Luxury Taxonomy Agent';

  async handleTask(intent: Intent, context: TripContext): Promise<AgentResponse> {
    const traceId = this.generateTraceId();
    const startTime = Date.now();

    switch (intent.type) {
      case 'taxonomy.classify':
        return this.handleClassify(intent, traceId, startTime);
      case 'taxonomy.get':
        return this.handleGetClassification(intent, traceId, startTime);
      case 'taxonomy.search':
        return this.handleSearchByArchetype(intent, traceId, startTime);
      case 'taxonomy.batch_classify':
        return this.handleBatchClassify(intent, traceId, startTime);
      default:
        return {
          message: `Luxury Taxonomy Agent does not handle intent type "${intent.type}".`,
          proposals: [],
          groundingResults: [],
          metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
        };
    }
  }

  /**
   * Classify a property and store the result.
   */
  async classify(input: PropertyClassificationInput): Promise<TaxonomyClassification> {
    const classification = classifyProperty(input);
    classificationStore.set(input.canonicalId, classification);
    return classification;
  }

  /**
   * Get existing classification for a property.
   */
  async getClassification(canonicalId: string): Promise<TaxonomyClassification | null> {
    return classificationStore.get(canonicalId) ?? null;
  }

  /**
   * Search for properties by archetype.
   */
  async searchByArchetype(archetype: LuxuryArchetype): Promise<TaxonomyClassification[]> {
    const results: TaxonomyClassification[] = [];
    for (const classification of classificationStore.values()) {
      if (classification.primary === archetype) {
        results.push(classification);
      } else if (classification.secondaryAffinities.some((a) => a.archetype === archetype && a.confidence >= 0.3)) {
        results.push(classification);
      }
    }
    return results.sort((a, b) => b.primaryConfidence - a.primaryConfidence);
  }

  // ── Intent Handlers ─────────────────────────────────────────────

  private async handleClassify(
    intent: Intent,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const input = intent.entities['property'] as PropertyClassificationInput | undefined;
    if (!input) {
      return {
        message: 'Please provide property data for classification.',
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'strong', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const classification = await this.classify(input);
    const secondaryText = classification.secondaryAffinities.length > 0
      ? `\nSecondary: ${classification.secondaryAffinities.map((a) => `${a.archetype} (${(a.confidence * 100).toFixed(0)}%)`).join(', ')}`
      : '';

    return {
      message: `Classified "${classification.propertyName}":\n` +
        `Primary: ${classification.primary} (${(classification.primaryConfidence * 100).toFixed(0)}% confidence)` +
        secondaryText +
        `\nBased on ${classification.classificationSignals.length} signals.`,
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'strong', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  private async handleGetClassification(
    intent: Intent,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const canonicalId = intent.entities['canonicalId'] as string | undefined;
    if (!canonicalId) {
      return {
        message: 'Please provide a canonical ID.',
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const classification = await this.getClassification(canonicalId);
    if (!classification) {
      return {
        message: `No classification found for ${canonicalId}. Use taxonomy.classify to classify this property.`,
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    return {
      message: `${classification.propertyName}: ${classification.primary} (${(classification.primaryConfidence * 100).toFixed(0)}%)`,
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  private async handleSearchByArchetype(
    intent: Intent,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const archetype = intent.entities['archetype'] as LuxuryArchetype | undefined;
    if (!archetype) {
      return {
        message: `Please provide an archetype. Valid options: ${Object.keys(ARCHETYPE_KEYWORDS).join(', ')}`,
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const results = await this.searchByArchetype(archetype);
    const listing = results
      .map((r) => `  ${r.propertyName}: ${r.primary} (${(r.primaryConfidence * 100).toFixed(0)}%)`)
      .join('\n');

    return {
      message: `Found ${results.length} properties matching archetype "${archetype}":\n${listing || '  (none)'}`,
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  private async handleBatchClassify(
    intent: Intent,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const properties = intent.entities['properties'] as PropertyClassificationInput[] | undefined;
    if (!properties || properties.length === 0) {
      return {
        message: 'Please provide an array of properties to classify.',
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'strong', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const results: TaxonomyClassification[] = [];
    for (const prop of properties) {
      results.push(await this.classify(prop));
    }

    const summary = results
      .map((r) => `  ${r.propertyName}: ${r.primary}`)
      .join('\n');

    return {
      message: `Batch classified ${results.length} properties:\n${summary}`,
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'strong', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  private generateTraceId(): string {
    return `trc_tax_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
