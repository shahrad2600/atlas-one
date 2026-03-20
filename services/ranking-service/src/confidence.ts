// ── Confidence Multiplier ───────────────────────────────────────────────────
// Determines how much trust to place in a property's computed score based on
// the quantity, diversity, recency, and verification status of its review data.
// Range: 0.70 (low confidence) to 1.10 (inspector-boosted high confidence).

export interface ConfidenceInputs {
  /** Number of reviews from verified stays (booking confirmation matched). */
  verifiedStayCount: number;
  /** Diversity score: number of distinct reviewer nationalities / traveler types (0-100). */
  reviewDiversity: number;
  /** Percentage of trailing 36 months with at least one review (0-100). */
  recencyCoverage: number;
  /** Percentage of room categories represented in reviews (0-100). */
  roomDistribution: number;
  /** Number of distinct review sources (OTA, direct, inspector, editorial). 0-10 scale. */
  sourceMix: number;
  /** Whether an accredited inspector has confirmed the property in the last 24 months. */
  inspectorConfirmed: boolean;
}

// ── Sub-factor Weights ─────────────────────────────────────────────────────

const CONFIDENCE_WEIGHTS = {
  verifiedStayCount: 0.30,
  reviewDiversity:   0.15,
  recencyCoverage:   0.20,
  roomDistribution:  0.10,
  sourceMix:         0.15,
  inspectorBonus:    0.10,
} as const;

// ── Verified Stay Count Normalization ──────────────────────────────────────
// Logarithmic curve: diminishing returns past ~50 reviews, near-ceiling at 200+.

function normalizeVerifiedStayCount(count: number): number {
  if (count <= 0) return 0;
  if (count >= 200) return 1.0;
  // Log curve: log(count+1) / log(201) gives 0..1
  return Math.log(count + 1) / Math.log(201);
}

// ── Diversity Normalization ────────────────────────────────────────────────
// Linear pass-through with clamping.

function normalizeDiversity(score: number): number {
  return Math.max(0, Math.min(1, score / 100));
}

// ── Recency Coverage Normalization ─────────────────────────────────────────
// Linear: 0-100 maps to 0-1.

function normalizeRecencyCoverage(coverage: number): number {
  return Math.max(0, Math.min(1, coverage / 100));
}

// ── Room Distribution Normalization ────────────────────────────────────────

function normalizeRoomDistribution(distribution: number): number {
  return Math.max(0, Math.min(1, distribution / 100));
}

// ── Source Mix Normalization ───────────────────────────────────────────────
// 4+ distinct sources = full marks.

function normalizeSourceMix(sources: number): number {
  if (sources <= 0) return 0;
  if (sources >= 4) return 1.0;
  return sources / 4;
}

// ── Compute Confidence Multiplier ──────────────────────────────────────────

export function computeConfidenceMultiplier(inputs: ConfidenceInputs): number {
  const verifiedScore  = normalizeVerifiedStayCount(inputs.verifiedStayCount);
  const diversityScore = normalizeDiversity(inputs.reviewDiversity);
  const recencyScore   = normalizeRecencyCoverage(inputs.recencyCoverage);
  const roomScore      = normalizeRoomDistribution(inputs.roomDistribution);
  const sourceScore    = normalizeSourceMix(inputs.sourceMix);
  const inspectorScore = inputs.inspectorConfirmed ? 1.0 : 0.0;

  const weightedSum =
    CONFIDENCE_WEIGHTS.verifiedStayCount * verifiedScore +
    CONFIDENCE_WEIGHTS.reviewDiversity   * diversityScore +
    CONFIDENCE_WEIGHTS.recencyCoverage   * recencyScore +
    CONFIDENCE_WEIGHTS.roomDistribution  * roomScore +
    CONFIDENCE_WEIGHTS.sourceMix         * sourceScore +
    CONFIDENCE_WEIGHTS.inspectorBonus    * inspectorScore;

  // Map weighted sum (0..1) to output range (0.70..1.10).
  // weightedSum=0 -> 0.70, weightedSum=1 -> 1.10
  const multiplier = 0.70 + weightedSum * 0.40;

  // Clamp to guaranteed range
  return Math.round(Math.max(0.70, Math.min(1.10, multiplier)) * 1000) / 1000;
}

// ── Breakdown for Debugging / Explanations ─────────────────────────────────

export interface ConfidenceBreakdown {
  verifiedStayScore: number;
  diversityScore: number;
  recencyCoverageScore: number;
  roomDistributionScore: number;
  sourceMixScore: number;
  inspectorBonus: number;
  weightedSum: number;
  multiplier: number;
}

export function computeConfidenceBreakdown(inputs: ConfidenceInputs): ConfidenceBreakdown {
  const verifiedStayScore      = normalizeVerifiedStayCount(inputs.verifiedStayCount);
  const diversityScore         = normalizeDiversity(inputs.reviewDiversity);
  const recencyCoverageScore   = normalizeRecencyCoverage(inputs.recencyCoverage);
  const roomDistributionScore  = normalizeRoomDistribution(inputs.roomDistribution);
  const sourceMixScore         = normalizeSourceMix(inputs.sourceMix);
  const inspectorBonus         = inputs.inspectorConfirmed ? 1.0 : 0.0;

  const weightedSum =
    CONFIDENCE_WEIGHTS.verifiedStayCount * verifiedStayScore +
    CONFIDENCE_WEIGHTS.reviewDiversity   * diversityScore +
    CONFIDENCE_WEIGHTS.recencyCoverage   * recencyCoverageScore +
    CONFIDENCE_WEIGHTS.roomDistribution  * roomDistributionScore +
    CONFIDENCE_WEIGHTS.sourceMix         * sourceMixScore +
    CONFIDENCE_WEIGHTS.inspectorBonus    * inspectorBonus;

  const multiplier = Math.round(Math.max(0.70, Math.min(1.10, 0.70 + weightedSum * 0.40)) * 1000) / 1000;

  return {
    verifiedStayScore:     Math.round(verifiedStayScore * 1000) / 1000,
    diversityScore:        Math.round(diversityScore * 1000) / 1000,
    recencyCoverageScore:  Math.round(recencyCoverageScore * 1000) / 1000,
    roomDistributionScore: Math.round(roomDistributionScore * 1000) / 1000,
    sourceMixScore:        Math.round(sourceMixScore * 1000) / 1000,
    inspectorBonus,
    weightedSum:           Math.round(weightedSum * 1000) / 1000,
    multiplier,
  };
}
