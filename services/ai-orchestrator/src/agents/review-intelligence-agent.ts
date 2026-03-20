/**
 * Atlas One -- Review Intelligence Agent
 *
 * Converts raw reviews into structured luxury intelligence signals.
 * Aggregates reviews for a property to produce:
 *   - Luxury truth labels (e.g., "polished but cold", "warm but inconsistent")
 *   - Best-for and not-ideal-for classifications
 *   - Service consistency scores
 *   - Sentiment trends over time
 *
 * This agent does NOT generate reviews. It reads them, structures them,
 * and produces signals that feed into rankings and personalization.
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
// Review Intelligence Types
// ---------------------------------------------------------------------------

/** A raw review to be analyzed. */
export interface RawReview {
  reviewId: string;
  propertyId: string;
  authorId: string;
  rating: number; // 1-5
  title: string;
  text: string;
  stayDate: string;
  reviewDate: string;
  tripType: 'solo' | 'couple' | 'family' | 'friends' | 'business';
  subRatings?: {
    service?: number;
    cleanliness?: number;
    location?: number;
    value?: number;
    rooms?: number;
    food?: number;
    spa?: number;
  };
  language: string;
  verified: boolean;
  photos?: string[];
}

/** A luxury truth label derived from aggregated reviews. */
export interface LuxuryTruthLabel {
  label: string; // e.g., "polished but cold"
  confidence: number;
  supportingReviewCount: number;
  exampleExcerpts: string[];
  sentiment: 'positive' | 'mixed' | 'negative';
  category: 'service' | 'design' | 'food' | 'atmosphere' | 'value' | 'location' | 'consistency';
}

/** Best-for and not-ideal-for classifications. */
export interface AudienceFit {
  bestFor: Array<{ audience: string; confidence: number; reasoning: string }>;
  notIdealFor: Array<{ audience: string; confidence: number; reasoning: string }>;
}

/** Service consistency analysis. */
export interface ServiceConsistency {
  overallScore: number; // 0-1
  ratingStdDev: number;
  trend: 'improving' | 'stable' | 'declining';
  trendPeriod: string;
  consistencyIssues: string[];
  reliableStrengths: string[];
}

/** Structured intelligence output for a property. */
export interface PropertyIntelligence {
  propertyId: string;
  propertyName: string;
  reviewCount: number;
  averageRating: number;
  truthLabels: LuxuryTruthLabel[];
  audienceFit: AudienceFit;
  serviceConsistency: ServiceConsistency;
  topStrengths: string[];
  topWeaknesses: string[];
  luxurySignals: LuxurySignal[];
  analyzedAt: string;
}

/** A structured luxury signal extracted from reviews. */
export interface LuxurySignal {
  signal: string;
  dimension: 'privacy' | 'design' | 'service' | 'dining' | 'wellness' | 'location' | 'value' | 'atmosphere';
  sentiment: 'positive' | 'negative' | 'neutral';
  frequency: number; // how many reviews mention this
  weight: number;
}

// ---------------------------------------------------------------------------
// Sentiment Analysis (Keyword-Based)
// ---------------------------------------------------------------------------

/** Positive luxury signal keywords by dimension. */
const POSITIVE_SIGNALS: Record<string, string[]> = {
  privacy: ['private', 'secluded', 'exclusive', 'intimate', 'peaceful', 'quiet', 'undisturbed', 'personal space'],
  design: ['beautiful', 'stunning', 'gorgeous', 'tasteful', 'elegant', 'sophisticated', 'architectural', 'well-designed', 'exquisite'],
  service: ['impeccable', 'attentive', 'anticipatory', 'personalized', 'warm', 'welcoming', 'professional', 'exceptional service', 'butler', 'remembered our names'],
  dining: ['delicious', 'michelin', 'gourmet', 'farm-to-table', 'incredible food', 'world-class dining', 'sommelier', 'tasting menu'],
  wellness: ['transformative', 'rejuvenating', 'best spa', 'incredible treatments', 'healing', 'relaxing spa', 'wellness journey'],
  location: ['stunning views', 'perfect location', 'breathtaking', 'idyllic', 'paradise', 'pristine', 'unspoiled'],
  value: ['worth every penny', 'exceptional value', 'justified the price', 'would pay again', 'incredible experience'],
  atmosphere: ['magical', 'enchanting', 'special', 'unforgettable', 'once in a lifetime', 'romantic', 'dreamy'],
};

/** Negative luxury signal keywords by dimension. */
const NEGATIVE_SIGNALS: Record<string, string[]> = {
  privacy: ['noisy', 'crowded', 'no privacy', 'could hear neighbors', 'packed', 'overbooked', 'construction'],
  design: ['dated', 'worn', 'tired', 'needs renovation', 'shabby', 'tacky', 'gaudy', 'uninspired'],
  service: ['slow', 'inattentive', 'rude', 'understaffed', 'forgot', 'ignored', 'unprofessional', 'cold service', 'indifferent'],
  dining: ['disappointing food', 'overpriced restaurant', 'bland', 'limited menu', 'poor breakfast', 'mediocre dining'],
  wellness: ['underwhelming spa', 'rushed treatment', 'small gym', 'dirty pool', 'crowded spa', 'overpriced spa'],
  location: ['far from everything', 'difficult access', 'noisy location', 'construction nearby', 'misleading photos'],
  value: ['overpriced', 'not worth it', 'rip off', 'hidden charges', 'expensive for what you get', 'nickel and dime'],
  atmosphere: ['sterile', 'soulless', 'generic', 'corporate', 'no character', 'felt like any hotel', 'lacking warmth'],
};

/** Truth label templates based on signal combinations. */
const TRUTH_LABEL_TEMPLATES: Array<{
  label: string;
  requires: { positive: string[]; negative?: string[] };
  sentiment: 'positive' | 'mixed' | 'negative';
  category: LuxuryTruthLabel['category'];
}> = [
  { label: 'polished but cold', requires: { positive: ['design'], negative: ['service', 'atmosphere'] }, sentiment: 'mixed', category: 'service' },
  { label: 'warm but inconsistent', requires: { positive: ['service', 'atmosphere'], negative: ['consistency'] }, sentiment: 'mixed', category: 'consistency' },
  { label: 'beautiful but noisy', requires: { positive: ['design', 'location'], negative: ['privacy'] }, sentiment: 'mixed', category: 'atmosphere' },
  { label: 'world-class dining destination', requires: { positive: ['dining'] }, sentiment: 'positive', category: 'food' },
  { label: 'sanctuary of calm', requires: { positive: ['privacy', 'atmosphere', 'wellness'] }, sentiment: 'positive', category: 'atmosphere' },
  { label: 'design masterpiece', requires: { positive: ['design'] }, sentiment: 'positive', category: 'design' },
  { label: 'service excellence', requires: { positive: ['service'] }, sentiment: 'positive', category: 'service' },
  { label: 'overpriced for the experience', requires: { negative: ['value'] }, sentiment: 'negative', category: 'value' },
  { label: 'dated grandeur', requires: { positive: ['location', 'atmosphere'], negative: ['design'] }, sentiment: 'mixed', category: 'design' },
  { label: 'hidden gem', requires: { positive: ['value', 'service', 'atmosphere'] }, sentiment: 'positive', category: 'value' },
  { label: 'family paradise', requires: { positive: ['service', 'atmosphere'] }, sentiment: 'positive', category: 'atmosphere' },
  { label: 'wellness transformation', requires: { positive: ['wellness'] }, sentiment: 'positive', category: 'service' },
  { label: 'consistently exceptional', requires: { positive: ['service', 'design', 'dining'] }, sentiment: 'positive', category: 'consistency' },
  { label: 'stunning but sterile', requires: { positive: ['design'], negative: ['atmosphere'] }, sentiment: 'mixed', category: 'atmosphere' },
  { label: 'romantic retreat', requires: { positive: ['privacy', 'atmosphere'] }, sentiment: 'positive', category: 'atmosphere' },
];

// ---------------------------------------------------------------------------
// Analysis Functions
// ---------------------------------------------------------------------------

/** Extract luxury signals from a single review. */
function extractSignals(review: RawReview): LuxurySignal[] {
  const signals: LuxurySignal[] = [];
  const textLower = (review.title + ' ' + review.text).toLowerCase();

  for (const [dimension, keywords] of Object.entries(POSITIVE_SIGNALS)) {
    for (const keyword of keywords) {
      if (textLower.includes(keyword)) {
        signals.push({
          signal: keyword,
          dimension: dimension as LuxurySignal['dimension'],
          sentiment: 'positive',
          frequency: 1,
          weight: review.verified ? 1.0 : 0.7,
        });
      }
    }
  }

  for (const [dimension, keywords] of Object.entries(NEGATIVE_SIGNALS)) {
    for (const keyword of keywords) {
      if (textLower.includes(keyword)) {
        signals.push({
          signal: keyword,
          dimension: dimension as LuxurySignal['dimension'],
          sentiment: 'negative',
          frequency: 1,
          weight: review.verified ? 1.0 : 0.7,
        });
      }
    }
  }

  return signals;
}

/** Aggregate signals across all reviews for a property. */
function aggregateSignals(allSignals: LuxurySignal[]): LuxurySignal[] {
  const aggregated = new Map<string, LuxurySignal>();

  for (const signal of allSignals) {
    const key = `${signal.dimension}:${signal.sentiment}:${signal.signal}`;
    const existing = aggregated.get(key);
    if (existing) {
      existing.frequency += 1;
      existing.weight = Math.max(existing.weight, signal.weight);
    } else {
      aggregated.set(key, { ...signal });
    }
  }

  return Array.from(aggregated.values())
    .sort((a, b) => b.frequency - a.frequency);
}

/** Generate truth labels from aggregated signals. */
function generateTruthLabels(signals: LuxurySignal[], reviewCount: number): LuxuryTruthLabel[] {
  const labels: LuxuryTruthLabel[] = [];

  // Build dimension sentiment scores
  const dimensionScores: Record<string, { positive: number; negative: number }> = {};
  for (const signal of signals) {
    if (!dimensionScores[signal.dimension]) {
      dimensionScores[signal.dimension] = { positive: 0, negative: 0 };
    }
    if (signal.sentiment === 'positive') {
      dimensionScores[signal.dimension].positive += signal.frequency;
    } else if (signal.sentiment === 'negative') {
      dimensionScores[signal.dimension].negative += signal.frequency;
    }
  }

  // Check which dimensions are net positive/negative
  const positiveDimensions: string[] = [];
  const negativeDimensions: string[] = [];
  for (const [dim, scores] of Object.entries(dimensionScores)) {
    if (scores.positive > scores.negative * 2) positiveDimensions.push(dim);
    else if (scores.negative > scores.positive) negativeDimensions.push(dim);
  }

  // Add "consistency" pseudo-dimension
  // High variance in service signals suggests inconsistency
  const servicePos = dimensionScores['service']?.positive ?? 0;
  const serviceNeg = dimensionScores['service']?.negative ?? 0;
  if (servicePos > 0 && serviceNeg > 0 && serviceNeg / servicePos > 0.3) {
    negativeDimensions.push('consistency');
  }

  // Match templates
  for (const template of TRUTH_LABEL_TEMPLATES) {
    const positiveMatch = template.requires.positive.every((p) => positiveDimensions.includes(p));
    const negativeMatch = !template.requires.negative || template.requires.negative.every((n) => negativeDimensions.includes(n));

    if (positiveMatch && negativeMatch) {
      const relevantSignals = signals.filter((s) =>
        [...template.requires.positive, ...(template.requires.negative ?? [])].includes(s.dimension),
      );
      const supportCount = relevantSignals.reduce((sum, s) => sum + s.frequency, 0);

      labels.push({
        label: template.label,
        confidence: Math.min(1, supportCount / reviewCount),
        supportingReviewCount: supportCount,
        exampleExcerpts: relevantSignals.slice(0, 3).map((s) => `"${s.signal}" (${s.frequency}x)`),
        sentiment: template.sentiment,
        category: template.category,
      });
    }
  }

  return labels.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

/** Determine audience fit from reviews. */
function determineAudienceFit(reviews: RawReview[], signals: LuxurySignal[]): AudienceFit {
  const bestFor: AudienceFit['bestFor'] = [];
  const notIdealFor: AudienceFit['notIdealFor'] = [];

  // Count by trip type and satisfaction
  const tripTypeSatisfaction: Record<string, { happy: number; unhappy: number }> = {};
  for (const review of reviews) {
    if (!tripTypeSatisfaction[review.tripType]) {
      tripTypeSatisfaction[review.tripType] = { happy: 0, unhappy: 0 };
    }
    if (review.rating >= 4) tripTypeSatisfaction[review.tripType].happy++;
    else if (review.rating <= 2) tripTypeSatisfaction[review.tripType].unhappy++;
  }

  const audienceMap: Record<string, string> = {
    couple: 'Couples & Romantics',
    solo: 'Solo Travelers',
    family: 'Families',
    friends: 'Friend Groups',
    business: 'Business Travelers',
  };

  for (const [tripType, satisfaction] of Object.entries(tripTypeSatisfaction)) {
    const total = satisfaction.happy + satisfaction.unhappy;
    if (total < 2) continue; // Need minimum sample

    const happyRatio = satisfaction.happy / total;
    const audience = audienceMap[tripType] ?? tripType;

    if (happyRatio >= 0.8) {
      bestFor.push({
        audience,
        confidence: happyRatio,
        reasoning: `${satisfaction.happy} out of ${total} ${tripType} travelers rated 4+ stars.`,
      });
    } else if (happyRatio <= 0.4) {
      notIdealFor.push({
        audience,
        confidence: 1 - happyRatio,
        reasoning: `Only ${satisfaction.happy} out of ${total} ${tripType} travelers rated 4+ stars.`,
      });
    }
  }

  // Signal-based audience fit
  const hasPrivacy = signals.some((s) => s.dimension === 'privacy' && s.sentiment === 'positive' && s.frequency >= 3);
  const hasNoise = signals.some((s) => s.dimension === 'privacy' && s.sentiment === 'negative' && s.frequency >= 3);
  const hasWellness = signals.some((s) => s.dimension === 'wellness' && s.sentiment === 'positive' && s.frequency >= 3);

  if (hasPrivacy) {
    bestFor.push({ audience: 'Privacy Seekers', confidence: 0.8, reasoning: 'Frequently praised for privacy and seclusion.' });
  }
  if (hasNoise) {
    notIdealFor.push({ audience: 'Light Sleepers', confidence: 0.7, reasoning: 'Multiple reviews mention noise concerns.' });
  }
  if (hasWellness) {
    bestFor.push({ audience: 'Wellness Enthusiasts', confidence: 0.8, reasoning: 'Highly rated spa and wellness facilities.' });
  }

  return {
    bestFor: bestFor.sort((a, b) => b.confidence - a.confidence),
    notIdealFor: notIdealFor.sort((a, b) => b.confidence - a.confidence),
  };
}

/** Analyze service consistency from review ratings over time. */
function analyzeServiceConsistency(reviews: RawReview[]): ServiceConsistency {
  if (reviews.length === 0) {
    return {
      overallScore: 0.5,
      ratingStdDev: 0,
      trend: 'stable',
      trendPeriod: 'insufficient data',
      consistencyIssues: [],
      reliableStrengths: [],
    };
  }

  const ratings = reviews.map((r) => r.rating);
  const mean = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  const variance = ratings.reduce((sum, r) => sum + (r - mean) ** 2, 0) / ratings.length;
  const stdDev = Math.sqrt(variance);

  // Consistency score: low std dev = high consistency
  const overallScore = Math.max(0, Math.min(1, 1 - stdDev / 2));

  // Trend: compare first half vs second half ratings
  const sorted = [...reviews].sort((a, b) => new Date(a.reviewDate).getTime() - new Date(b.reviewDate).getTime());
  const midpoint = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midpoint);
  const secondHalf = sorted.slice(midpoint);

  const firstAvg = firstHalf.reduce((sum, r) => sum + r.rating, 0) / (firstHalf.length || 1);
  const secondAvg = secondHalf.reduce((sum, r) => sum + r.rating, 0) / (secondHalf.length || 1);

  let trend: ServiceConsistency['trend'];
  if (secondAvg - firstAvg > 0.3) trend = 'improving';
  else if (firstAvg - secondAvg > 0.3) trend = 'declining';
  else trend = 'stable';

  // Find consistency issues (dimensions with high variance)
  const consistencyIssues: string[] = [];
  const reliableStrengths: string[] = [];

  if (stdDev > 1.0) consistencyIssues.push('High rating variance indicates inconsistent experience quality.');
  if (stdDev < 0.5 && mean >= 4.0) reliableStrengths.push('Consistently high ratings across all stay types.');

  // Check sub-rating consistency
  const serviceRatings = reviews.filter((r) => r.subRatings?.service).map((r) => r.subRatings!.service!);
  if (serviceRatings.length > 3) {
    const serviceStdDev = Math.sqrt(serviceRatings.reduce((sum, r) => sum + (r - mean) ** 2, 0) / serviceRatings.length);
    if (serviceStdDev > 1.2) consistencyIssues.push('Service quality varies significantly between stays.');
    if (serviceStdDev < 0.5 && serviceRatings.reduce((a, b) => a + b, 0) / serviceRatings.length >= 4.5) {
      reliableStrengths.push('Service is a reliable strength with minimal variation.');
    }
  }

  return {
    overallScore,
    ratingStdDev: Math.round(stdDev * 100) / 100,
    trend,
    trendPeriod: `${sorted[0]?.reviewDate ?? 'unknown'} to ${sorted[sorted.length - 1]?.reviewDate ?? 'unknown'}`,
    consistencyIssues,
    reliableStrengths,
  };
}

// ---------------------------------------------------------------------------
// In-Memory Store
// ---------------------------------------------------------------------------

const intelligenceStore = new Map<string, PropertyIntelligence>();

// ---------------------------------------------------------------------------
// Review Intelligence Agent
// ---------------------------------------------------------------------------

export class ReviewIntelligenceAgent implements SubAgent {
  public readonly agentId = 'review-intelligence-agent';
  public readonly name = 'Review Intelligence Agent';

  async handleTask(intent: Intent, context: TripContext): Promise<AgentResponse> {
    const traceId = this.generateTraceId();
    const startTime = Date.now();

    switch (intent.type) {
      case 'review.analyze':
        return this.handleAnalyze(intent, traceId, startTime);
      case 'review.get_intelligence':
        return this.handleGetIntelligence(intent, traceId, startTime);
      case 'review.truth_labels':
        return this.handleGetTruthLabels(intent, traceId, startTime);
      case 'review.audience_fit':
        return this.handleGetAudienceFit(intent, traceId, startTime);
      default:
        return {
          message: `Review Intelligence Agent does not handle intent type "${intent.type}".`,
          proposals: [],
          groundingResults: [],
          metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
        };
    }
  }

  /**
   * Analyze a batch of reviews for a property and produce structured intelligence.
   */
  async analyzeReviews(propertyId: string, propertyName: string, reviews: RawReview[]): Promise<PropertyIntelligence> {
    // Extract signals from all reviews
    const allSignals: LuxurySignal[] = [];
    for (const review of reviews) {
      allSignals.push(...extractSignals(review));
    }

    // Aggregate signals
    const aggregatedSignals = aggregateSignals(allSignals);

    // Generate truth labels
    const truthLabels = generateTruthLabels(aggregatedSignals, reviews.length);

    // Determine audience fit
    const audienceFit = determineAudienceFit(reviews, aggregatedSignals);

    // Analyze service consistency
    const serviceConsistency = analyzeServiceConsistency(reviews);

    // Extract top strengths and weaknesses
    const positiveSignals = aggregatedSignals.filter((s) => s.sentiment === 'positive');
    const negativeSignals = aggregatedSignals.filter((s) => s.sentiment === 'negative');

    const topStrengths = positiveSignals
      .slice(0, 5)
      .map((s) => `${s.dimension}: "${s.signal}" (mentioned ${s.frequency}x)`);
    const topWeaknesses = negativeSignals
      .slice(0, 5)
      .map((s) => `${s.dimension}: "${s.signal}" (mentioned ${s.frequency}x)`);

    const avgRating = reviews.length > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
      : 0;

    const intelligence: PropertyIntelligence = {
      propertyId,
      propertyName,
      reviewCount: reviews.length,
      averageRating: avgRating,
      truthLabels,
      audienceFit,
      serviceConsistency,
      topStrengths,
      topWeaknesses,
      luxurySignals: aggregatedSignals.slice(0, 20),
      analyzedAt: new Date().toISOString(),
    };

    intelligenceStore.set(propertyId, intelligence);
    return intelligence;
  }

  /**
   * Get cached intelligence for a property.
   */
  async getIntelligence(propertyId: string): Promise<PropertyIntelligence | null> {
    return intelligenceStore.get(propertyId) ?? null;
  }

  // ── Intent Handlers ─────────────────────────────────────────────

  private async handleAnalyze(
    intent: Intent,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const propertyId = intent.entities['propertyId'] as string | undefined;
    const propertyName = intent.entities['propertyName'] as string | undefined;
    const reviews = intent.entities['reviews'] as RawReview[] | undefined;

    if (!propertyId || !propertyName || !reviews) {
      return {
        message: 'Please provide propertyId, propertyName, and reviews array.',
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'strong', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const intelligence = await this.analyzeReviews(propertyId, propertyName, reviews);

    const labelsText = intelligence.truthLabels
      .map((l) => `  "${l.label}" (${(l.confidence * 100).toFixed(0)}% confidence, ${l.supportingReviewCount} reviews)`)
      .join('\n');

    const bestForText = intelligence.audienceFit.bestFor
      .map((b) => `  ${b.audience} (${(b.confidence * 100).toFixed(0)}%)`)
      .join('\n');

    return {
      message: `Review Intelligence for ${propertyName} (${reviews.length} reviews, avg ${intelligence.averageRating}/5):\n\n` +
        `Truth Labels:\n${labelsText || '  (none detected)'}\n\n` +
        `Best For:\n${bestForText || '  (insufficient data)'}\n\n` +
        `Service Consistency: ${(intelligence.serviceConsistency.overallScore * 100).toFixed(0)}% (trend: ${intelligence.serviceConsistency.trend})`,
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'strong', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  private async handleGetIntelligence(
    intent: Intent,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const propertyId = intent.entities['propertyId'] as string | undefined;
    if (!propertyId) {
      return {
        message: 'Please provide a propertyId.',
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const intelligence = await this.getIntelligence(propertyId);
    if (!intelligence) {
      return {
        message: `No intelligence found for property ${propertyId}. Submit reviews for analysis first.`,
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    return {
      message: `Intelligence for ${intelligence.propertyName}: ${intelligence.truthLabels.map((l) => `"${l.label}"`).join(', ') || 'no labels'}. Consistency: ${(intelligence.serviceConsistency.overallScore * 100).toFixed(0)}%.`,
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  private async handleGetTruthLabels(
    intent: Intent,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const propertyId = intent.entities['propertyId'] as string | undefined;
    if (!propertyId) {
      return {
        message: 'Please provide a propertyId.',
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const intelligence = await this.getIntelligence(propertyId);
    if (!intelligence) {
      return {
        message: `No intelligence found for ${propertyId}.`,
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const labelsText = intelligence.truthLabels
      .map((l) => `  "${l.label}" [${l.sentiment}] -- ${(l.confidence * 100).toFixed(0)}% confidence\n    Supporting evidence: ${l.exampleExcerpts.join(', ')}`)
      .join('\n\n');

    return {
      message: `Truth labels for ${intelligence.propertyName}:\n\n${labelsText || '  (none detected)'}`,
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  private async handleGetAudienceFit(
    intent: Intent,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const propertyId = intent.entities['propertyId'] as string | undefined;
    if (!propertyId) {
      return {
        message: 'Please provide a propertyId.',
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const intelligence = await this.getIntelligence(propertyId);
    if (!intelligence) {
      return {
        message: `No intelligence found for ${propertyId}.`,
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const bestForText = intelligence.audienceFit.bestFor
      .map((b) => `  + ${b.audience}: ${b.reasoning}`)
      .join('\n');
    const notIdealText = intelligence.audienceFit.notIdealFor
      .map((n) => `  - ${n.audience}: ${n.reasoning}`)
      .join('\n');

    return {
      message: `Audience fit for ${intelligence.propertyName}:\n\nBest for:\n${bestForText || '  (no data)'}\n\nNot ideal for:\n${notIdealText || '  (no data)'}`,
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  private generateTraceId(): string {
    return `trc_rev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
