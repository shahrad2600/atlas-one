/**
 * Atlas One -- Ranking Explanation Agent
 *
 * Writes the "why this ranked here" panel for each property in the luxury
 * rankings. Compares a property's scores to its peer set and generates
 * natural language explanations.
 *
 * Outputs:
 *   - Why this property ranks where it does
 *   - Specific strengths and weaknesses vs. peer set
 *   - Best-for and not-ideal-for audiences
 *   - Score breakdown with dimensional comparisons
 *
 * Design invariant: This agent only reads ranking data. It never modifies
 * the official score or ranking position.
 */

import type {
  SubAgent,
  Intent,
  TripContext,
  AgentResponse,
} from './orchestrator';

// ---------------------------------------------------------------------------
// Ranking Explanation Types
// ---------------------------------------------------------------------------

/** A property with its ranking scores and peer context. */
export interface RankedPropertyForExplanation {
  canonicalId: string;
  name: string;
  overallScore: number; // 0-100
  rank: number;
  totalInPeerSet: number;
  location: { city: string; country: string; region: string };
  propertyType: string;
  priceCategory: string;
  scores: DimensionalScores;
  peerSetAverage: DimensionalScores;
  taxonomyClassification: string;
  truthLabels: string[];
  bestFor: string[];
  notIdealFor: string[];
}

/** Dimensional score breakdown. */
export interface DimensionalScores {
  service: number; // 0-100
  design: number;
  dining: number;
  location: number;
  wellness: number;
  privacy: number;
  value: number;
  consistency: number;
}

/** The explanation panel output. */
export interface RankingExplanation {
  canonicalId: string;
  propertyName: string;
  rank: number;
  overallScore: number;
  headline: string;
  summary: string;
  strengths: ExplanationPoint[];
  weaknesses: ExplanationPoint[];
  peerComparison: string;
  bestFor: string[];
  notIdealFor: string[];
  scoreBreakdown: Array<{ dimension: string; score: number; peerAvg: number; delta: number; narrative: string }>;
  generatedAt: string;
}

/** A single strength or weakness point with narrative. */
export interface ExplanationPoint {
  dimension: string;
  score: number;
  peerAvg: number;
  narrative: string;
  isSignificant: boolean;
}

// ---------------------------------------------------------------------------
// Mock Peer Set Data
// ---------------------------------------------------------------------------

const MOCK_PROPERTIES: RankedPropertyForExplanation[] = [
  {
    canonicalId: 'prop_aman_tokyo',
    name: 'Aman Tokyo',
    overallScore: 96.2,
    rank: 1,
    totalInPeerSet: 50,
    location: { city: 'Tokyo', country: 'Japan', region: 'Asia' },
    propertyType: 'hotel',
    priceCategory: 'ultra_luxury',
    scores: { service: 98, design: 97, dining: 88, location: 92, wellness: 95, privacy: 99, value: 82, consistency: 96 },
    peerSetAverage: { service: 85, design: 80, dining: 82, location: 85, wellness: 78, privacy: 75, value: 72, consistency: 80 },
    taxonomyClassification: 'discreet_classical',
    truthLabels: ['sanctuary of calm', 'design masterpiece', 'service excellence'],
    bestFor: ['Couples', 'Solo Travelers', 'Design Lovers'],
    notIdealFor: ['Families with Young Children', 'Party Seekers'],
  },
  {
    canonicalId: 'prop_four_seasons_bora_bora',
    name: 'Four Seasons Bora Bora',
    overallScore: 94.8,
    rank: 2,
    totalInPeerSet: 50,
    location: { city: 'Bora Bora', country: 'French Polynesia', region: 'Pacific' },
    propertyType: 'resort',
    priceCategory: 'ultra_luxury',
    scores: { service: 95, design: 85, dining: 90, location: 99, wellness: 88, privacy: 90, value: 75, consistency: 92 },
    peerSetAverage: { service: 85, design: 80, dining: 82, location: 85, wellness: 78, privacy: 75, value: 72, consistency: 80 },
    taxonomyClassification: 'barefoot',
    truthLabels: ['romantic retreat', 'world-class dining destination', 'consistently exceptional'],
    bestFor: ['Honeymooners', 'Anniversary Trips', 'Beach Lovers'],
    notIdealFor: ['City Lovers', 'Budget Conscious'],
  },
  {
    canonicalId: 'prop_claridges_london',
    name: "Claridge's",
    overallScore: 93.5,
    rank: 3,
    totalInPeerSet: 50,
    location: { city: 'London', country: 'United Kingdom', region: 'Europe' },
    propertyType: 'hotel',
    priceCategory: 'luxury',
    scores: { service: 96, design: 88, dining: 94, location: 95, wellness: 72, privacy: 80, value: 78, consistency: 94 },
    peerSetAverage: { service: 85, design: 80, dining: 82, location: 85, wellness: 78, privacy: 75, value: 72, consistency: 80 },
    taxonomyClassification: 'heritage_grand',
    truthLabels: ['service excellence', 'world-class dining destination', 'dated grandeur'],
    bestFor: ['City Breakers', 'Foodies', 'Business Travelers'],
    notIdealFor: ['Beach Lovers', 'Adventure Seekers'],
  },
];

// ---------------------------------------------------------------------------
// Explanation Generation
// ---------------------------------------------------------------------------

/** Dimensional display names. */
const DIMENSION_NAMES: Record<string, string> = {
  service: 'Service',
  design: 'Design & Aesthetics',
  dining: 'Dining',
  location: 'Location',
  wellness: 'Wellness & Spa',
  privacy: 'Privacy',
  value: 'Value',
  consistency: 'Consistency',
};

/** Generate a narrative for a dimensional score vs peer average. */
function generateDimensionalNarrative(
  dimension: string,
  score: number,
  peerAvg: number,
  propertyName: string,
): string {
  const dimName = DIMENSION_NAMES[dimension] ?? dimension;
  const delta = score - peerAvg;

  if (delta >= 15) {
    return `${propertyName} significantly outperforms its peer set in ${dimName}, scoring ${score} vs. the peer average of ${peerAvg}. This is a standout strength.`;
  } else if (delta >= 8) {
    return `${dimName} is a notable strength at ${score}, comfortably above the peer average of ${peerAvg}.`;
  } else if (delta >= 0) {
    return `${dimName} scores ${score}, in line with the peer average of ${peerAvg}.`;
  } else if (delta >= -8) {
    return `${dimName} at ${score} is slightly below the peer average of ${peerAvg}, though still competitive.`;
  } else {
    return `${dimName} is a relative weakness at ${score}, notably below the peer average of ${peerAvg}. This pulls the overall ranking down.`;
  }
}

/** Generate the headline for the explanation panel. */
function generateHeadline(property: RankedPropertyForExplanation): string {
  const { rank, totalInPeerSet, name, taxonomyClassification } = property;

  const classificationNice = taxonomyClassification.replace(/_/g, ' ');

  if (rank === 1) {
    return `${name} leads the ranking as the top ${classificationNice} property.`;
  } else if (rank <= 3) {
    return `${name} ranks #${rank} of ${totalInPeerSet}, excelling as a ${classificationNice} experience.`;
  } else if (rank <= 10) {
    return `${name} earns a top-10 position (#${rank} of ${totalInPeerSet}) with strong ${classificationNice} credentials.`;
  } else if (rank <= totalInPeerSet * 0.25) {
    return `${name} places in the top quartile (#${rank} of ${totalInPeerSet}) as a solid ${classificationNice} option.`;
  } else {
    return `${name} ranks #${rank} of ${totalInPeerSet} in the ${classificationNice} category.`;
  }
}

/** Generate the summary paragraph. */
function generateSummary(property: RankedPropertyForExplanation): string {
  const { name, overallScore, scores, peerSetAverage, truthLabels } = property;

  // Find top 2 strengths and top weakness
  const dimensions = Object.keys(scores) as (keyof DimensionalScores)[];
  const deltas = dimensions.map((d) => ({ dimension: d, delta: scores[d] - peerSetAverage[d], score: scores[d] }));
  deltas.sort((a, b) => b.delta - a.delta);

  const topStrengths = deltas.slice(0, 2);
  const topWeakness = deltas[deltas.length - 1];

  let summary = `With an overall score of ${overallScore}, ${name} `;

  if (topStrengths[0].delta >= 10) {
    summary += `distinguishes itself through exceptional ${DIMENSION_NAMES[topStrengths[0].dimension]}`;
    if (topStrengths[1].delta >= 8) {
      summary += ` and ${DIMENSION_NAMES[topStrengths[1].dimension]}`;
    }
    summary += '. ';
  } else {
    summary += 'delivers a well-rounded luxury experience. ';
  }

  if (truthLabels.length > 0) {
    summary += `Guests describe it as "${truthLabels[0]}"`;
    if (truthLabels.length > 1) {
      summary += ` and "${truthLabels[1]}"`;
    }
    summary += '. ';
  }

  if (topWeakness.delta < -5) {
    summary += `${DIMENSION_NAMES[topWeakness.dimension]} (${topWeakness.score}) is the area with most room for improvement relative to peers. `;
  }

  return summary.trim();
}

/**
 * Generate a complete ranking explanation for a property.
 */
export function generateExplanation(property: RankedPropertyForExplanation): RankingExplanation {
  const dimensions = Object.keys(property.scores) as (keyof DimensionalScores)[];

  // Build score breakdown with narratives
  const scoreBreakdown = dimensions.map((dim) => {
    const score = property.scores[dim];
    const peerAvg = property.peerSetAverage[dim];
    return {
      dimension: DIMENSION_NAMES[dim] ?? dim,
      score,
      peerAvg,
      delta: score - peerAvg,
      narrative: generateDimensionalNarrative(dim, score, peerAvg, property.name),
    };
  });

  // Sort by delta for strengths/weaknesses
  const sortedByDelta = [...scoreBreakdown].sort((a, b) => b.delta - a.delta);

  const strengths: ExplanationPoint[] = sortedByDelta
    .filter((s) => s.delta > 0)
    .map((s) => ({
      dimension: s.dimension,
      score: s.score,
      peerAvg: s.peerAvg,
      narrative: s.narrative,
      isSignificant: s.delta >= 10,
    }));

  const weaknesses: ExplanationPoint[] = sortedByDelta
    .filter((s) => s.delta < -3)
    .reverse()
    .map((s) => ({
      dimension: s.dimension,
      score: s.score,
      peerAvg: s.peerAvg,
      narrative: s.narrative,
      isSignificant: s.delta <= -10,
    }));

  // Peer comparison narrative
  const aboveAvgCount = scoreBreakdown.filter((s) => s.delta > 5).length;
  const belowAvgCount = scoreBreakdown.filter((s) => s.delta < -5).length;
  let peerComparison: string;

  if (aboveAvgCount >= 6) {
    peerComparison = `${property.name} outperforms its peer set in ${aboveAvgCount} of ${dimensions.length} dimensions, making it an exceptionally well-rounded property.`;
  } else if (aboveAvgCount >= 4) {
    peerComparison = `${property.name} exceeds peer averages in ${aboveAvgCount} dimensions, with particular strengths that differentiate it from comparable properties.`;
  } else if (belowAvgCount >= 3) {
    peerComparison = `${property.name} falls below peer averages in ${belowAvgCount} dimensions, which limits its ranking position despite strengths elsewhere.`;
  } else {
    peerComparison = `${property.name} performs in line with its peer set across most dimensions, with a few standout areas that define its character.`;
  }

  return {
    canonicalId: property.canonicalId,
    propertyName: property.name,
    rank: property.rank,
    overallScore: property.overallScore,
    headline: generateHeadline(property),
    summary: generateSummary(property),
    strengths,
    weaknesses,
    peerComparison,
    bestFor: property.bestFor,
    notIdealFor: property.notIdealFor,
    scoreBreakdown,
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// In-Memory Store
// ---------------------------------------------------------------------------

const explanationStore = new Map<string, RankingExplanation>();

// ---------------------------------------------------------------------------
// Ranking Explanation Agent
// ---------------------------------------------------------------------------

export class RankingExplanationAgent implements SubAgent {
  public readonly agentId = 'ranking-explanation-agent';
  public readonly name = 'Ranking Explanation Agent';

  async handleTask(intent: Intent, context: TripContext): Promise<AgentResponse> {
    const traceId = this.generateTraceId();
    const startTime = Date.now();

    switch (intent.type) {
      case 'ranking.explain':
        return this.handleExplain(intent, traceId, startTime);
      case 'ranking.compare':
        return this.handleCompare(intent, traceId, startTime);
      case 'ranking.strengths':
        return this.handleGetStrengths(intent, traceId, startTime);
      default:
        return {
          message: `Ranking Explanation Agent does not handle intent type "${intent.type}".`,
          proposals: [],
          groundingResults: [],
          metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
        };
    }
  }

  /**
   * Generate and cache an explanation for a property.
   */
  async explain(canonicalId: string): Promise<RankingExplanation | null> {
    const property = MOCK_PROPERTIES.find((p) => p.canonicalId === canonicalId);
    if (!property) return null;

    const explanation = generateExplanation(property);
    explanationStore.set(canonicalId, explanation);
    return explanation;
  }

  /**
   * Compare two properties' ranking explanations.
   */
  async compare(id1: string, id2: string): Promise<string | null> {
    const p1 = MOCK_PROPERTIES.find((p) => p.canonicalId === id1);
    const p2 = MOCK_PROPERTIES.find((p) => p.canonicalId === id2);
    if (!p1 || !p2) return null;

    const dimensions = Object.keys(p1.scores) as (keyof DimensionalScores)[];
    const comparisons: string[] = [];

    for (const dim of dimensions) {
      const s1 = p1.scores[dim];
      const s2 = p2.scores[dim];
      const diff = s1 - s2;
      const dimName = DIMENSION_NAMES[dim] ?? dim;

      if (Math.abs(diff) >= 5) {
        const winner = diff > 0 ? p1.name : p2.name;
        const loser = diff > 0 ? p2.name : p1.name;
        comparisons.push(`${dimName}: ${winner} leads (${Math.max(s1, s2)} vs ${Math.min(s1, s2)})`);
      } else {
        comparisons.push(`${dimName}: Comparable (${s1} vs ${s2})`);
      }
    }

    return `Comparison: ${p1.name} (#${p1.rank}) vs ${p2.name} (#${p2.rank})\n` +
      `Overall: ${p1.overallScore} vs ${p2.overallScore}\n\n` +
      comparisons.join('\n');
  }

  // ── Intent Handlers ─────────────────────────────────────────────

  private async handleExplain(
    intent: Intent,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const canonicalId = intent.entities['canonicalId'] as string | undefined;
    if (!canonicalId) {
      return {
        message: 'Please provide a canonicalId to explain.',
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'strong', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const explanation = await this.explain(canonicalId);
    if (!explanation) {
      return {
        message: `Property ${canonicalId} not found in rankings.`,
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const strengthsText = explanation.strengths
      .slice(0, 3)
      .map((s) => `  + ${s.dimension}: ${s.score} (peer avg: ${s.peerAvg})`)
      .join('\n');

    const weaknessesText = explanation.weaknesses
      .slice(0, 2)
      .map((w) => `  - ${w.dimension}: ${w.score} (peer avg: ${w.peerAvg})`)
      .join('\n');

    return {
      message: `${explanation.headline}\n\n${explanation.summary}\n\n` +
        `Strengths:\n${strengthsText || '  (none significant)'}\n\n` +
        `Weaknesses:\n${weaknessesText || '  (none significant)'}\n\n` +
        `${explanation.peerComparison}\n\n` +
        `Best for: ${explanation.bestFor.join(', ')}\n` +
        `Not ideal for: ${explanation.notIdealFor.join(', ')}`,
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'strong', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  private async handleCompare(
    intent: Intent,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const id1 = intent.entities['canonicalId1'] as string | undefined;
    const id2 = intent.entities['canonicalId2'] as string | undefined;

    if (!id1 || !id2) {
      return {
        message: 'Please provide two canonical IDs to compare.',
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'strong', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const comparison = await this.compare(id1, id2);
    if (!comparison) {
      return {
        message: 'One or both properties not found.',
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    return {
      message: comparison,
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'strong', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  private async handleGetStrengths(
    intent: Intent,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const canonicalId = intent.entities['canonicalId'] as string | undefined;
    if (!canonicalId) {
      return {
        message: 'Please provide a canonicalId.',
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    let explanation = explanationStore.get(canonicalId);
    if (!explanation) {
      explanation = (await this.explain(canonicalId)) ?? undefined;
    }
    if (!explanation) {
      return {
        message: `Property ${canonicalId} not found.`,
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const allPoints = [...explanation.strengths, ...explanation.weaknesses];
    const text = allPoints
      .map((p) => `  ${p.score > p.peerAvg ? '+' : '-'} ${p.dimension}: ${p.narrative}`)
      .join('\n');

    return {
      message: `Strengths & Weaknesses for ${explanation.propertyName}:\n\n${text}`,
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  private generateTraceId(): string {
    return `trc_rkx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
