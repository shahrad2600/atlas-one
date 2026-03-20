// ── Scoring Engine ──────────────────────────────────────────────────────────
// Implements the exact luxury ranking formulas from the enterprise blueprint.
// Each property type (hotel, villa, specialty) has distinct dimension weights.

import { computeConfidenceMultiplier, type ConfidenceInputs } from './confidence.js';
import { computeRecencyMultiplier } from './recency.js';
import { computeIntegrityMultiplier, type IntegrityInputs } from './integrity.js';

// ── Property Types ─────────────────────────────────────────────────────────

export type PropertyType = 'hotel' | 'villa' | 'specialty';

// ── Dimension Inputs ───────────────────────────────────────────────────────

export interface HotelDimensions {
  serviceExecution: number;        // 0-100
  consistency: number;             // 0-100
  roomQuality: number;             // 0-100
  designSenseOfPlace: number;      // 0-100
  privacyCalm: number;             // 0-100
  dining: number;                  // 0-100
  locationContext: number;         // 0-100
  wellness: number;                // 0-100
  recovery: number;                // 0-100
  valueWithinSet: number;          // 0-100
}

export interface VillaDimensions {
  managementServiceability: number;   // 0-100
  privacyExclusivity: number;         // 0-100
  unitQualityDesign: number;          // 0-100
  location: number;                   // 0-100
  staffingConciergePotential: number; // 0-100
  amenitySeriousness: number;         // 0-100
  consistency: number;                // 0-100
  recoverySupport: number;            // 0-100
}

export interface SpecialtyDimensions {
  authenticityExecution: number;   // 0-100
  service: number;                 // 0-100
  accommodationQuality: number;    // 0-100
  senseOfPlace: number;            // 0-100
  consistency: number;             // 0-100
  privacyCalm: number;             // 0-100
  recovery: number;                // 0-100
  valueInSet: number;              // 0-100
}

export type ScoringDimensions = HotelDimensions | VillaDimensions | SpecialtyDimensions;

// ── Scoring Context ────────────────────────────────────────────────────────

export interface ScoringContext {
  propertyType: PropertyType;
  dimensions: ScoringDimensions;
  confidence: ConfidenceInputs;
  latestReviewDate: Date;
  integrity: IntegrityInputs;
}

// ── Score Result ───────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  rawDimensionScore: number;
  confidenceMultiplier: number;
  recencyMultiplier: number;
  integrityMultiplier: number;
  finalScore: number;
  dimensionContributions: Record<string, number>;
  computedAt: string;
}

// ── Hotel Weights ──────────────────────────────────────────────────────────

const HOTEL_WEIGHTS = {
  serviceExecution:    0.25,
  consistency:         0.15,
  roomQuality:         0.15,
  designSenseOfPlace:  0.10,
  privacyCalm:         0.10,
  dining:              0.10,
  locationContext:     0.05,
  wellness:            0.05,
  recovery:            0.03,
  valueWithinSet:      0.02,
} as const;

// ── Villa Weights ──────────────────────────────────────────────────────────

const VILLA_WEIGHTS = {
  managementServiceability:   0.25,
  privacyExclusivity:         0.15,
  unitQualityDesign:          0.15,
  location:                   0.10,
  staffingConciergePotential: 0.10,
  amenitySeriousness:         0.10,
  consistency:                0.10,
  recoverySupport:            0.05,
} as const;

// ── Specialty Weights ──────────────────────────────────────────────────────

const SPECIALTY_WEIGHTS = {
  authenticityExecution: 0.20,
  service:               0.20,
  accommodationQuality:  0.15,
  senseOfPlace:          0.15,
  consistency:           0.10,
  privacyCalm:           0.10,
  recovery:              0.05,
  valueInSet:            0.05,
} as const;

// ── Clamping Utility ───────────────────────────────────────────────────────

function clampDimension(value: number): number {
  return Math.max(0, Math.min(100, value));
}

// ── Weighted Score Computation ─────────────────────────────────────────────

function computeWeightedScore(
  dimensions: Record<string, number>,
  weights: Record<string, number>,
): { total: number; contributions: Record<string, number> } {
  const contributions: Record<string, number> = {};
  let total = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const raw = clampDimension(dimensions[key] ?? 0);
    const contribution = weight * raw;
    contributions[key] = Math.round(contribution * 1000) / 1000;
    total += contribution;
  }

  return { total: Math.round(total * 1000) / 1000, contributions };
}

// ── Hotel Scoring ──────────────────────────────────────────────────────────

function computeHotelRawScore(dims: HotelDimensions): { total: number; contributions: Record<string, number> } {
  return computeWeightedScore(
    {
      serviceExecution:   dims.serviceExecution,
      consistency:        dims.consistency,
      roomQuality:        dims.roomQuality,
      designSenseOfPlace: dims.designSenseOfPlace,
      privacyCalm:        dims.privacyCalm,
      dining:             dims.dining,
      locationContext:    dims.locationContext,
      wellness:           dims.wellness,
      recovery:           dims.recovery,
      valueWithinSet:     dims.valueWithinSet,
    },
    HOTEL_WEIGHTS,
  );
}

// ── Villa Scoring ──────────────────────────────────────────────────────────

function computeVillaRawScore(dims: VillaDimensions): { total: number; contributions: Record<string, number> } {
  return computeWeightedScore(
    {
      managementServiceability:   dims.managementServiceability,
      privacyExclusivity:         dims.privacyExclusivity,
      unitQualityDesign:          dims.unitQualityDesign,
      location:                   dims.location,
      staffingConciergePotential: dims.staffingConciergePotential,
      amenitySeriousness:         dims.amenitySeriousness,
      consistency:                dims.consistency,
      recoverySupport:            dims.recoverySupport,
    },
    VILLA_WEIGHTS,
  );
}

// ── Specialty Scoring ──────────────────────────────────────────────────────

function computeSpecialtyRawScore(dims: SpecialtyDimensions): { total: number; contributions: Record<string, number> } {
  return computeWeightedScore(
    {
      authenticityExecution: dims.authenticityExecution,
      service:               dims.service,
      accommodationQuality:  dims.accommodationQuality,
      senseOfPlace:          dims.senseOfPlace,
      consistency:           dims.consistency,
      privacyCalm:           dims.privacyCalm,
      recovery:              dims.recovery,
      valueInSet:            dims.valueInSet,
    },
    SPECIALTY_WEIGHTS,
  );
}

// ── Main Scoring Function ──────────────────────────────────────────────────

export function computeLuxuryRankScore(ctx: ScoringContext): ScoreBreakdown {
  let rawResult: { total: number; contributions: Record<string, number> };

  switch (ctx.propertyType) {
    case 'hotel':
      rawResult = computeHotelRawScore(ctx.dimensions as HotelDimensions);
      break;
    case 'villa':
      rawResult = computeVillaRawScore(ctx.dimensions as VillaDimensions);
      break;
    case 'specialty':
      rawResult = computeSpecialtyRawScore(ctx.dimensions as SpecialtyDimensions);
      break;
    default: {
      const _exhaustive: never = ctx.propertyType;
      throw new Error(`Unknown property type: ${_exhaustive}`);
    }
  }

  const confidenceMultiplier = computeConfidenceMultiplier(ctx.confidence);
  const recencyMultiplier = computeRecencyMultiplier(ctx.latestReviewDate);
  const integrityMultiplier = computeIntegrityMultiplier(ctx.integrity);

  const finalScore = Math.round(
    rawResult.total * confidenceMultiplier * recencyMultiplier * integrityMultiplier * 1000,
  ) / 1000;

  return {
    rawDimensionScore: rawResult.total,
    confidenceMultiplier,
    recencyMultiplier,
    integrityMultiplier,
    finalScore,
    dimensionContributions: rawResult.contributions,
    computedAt: new Date().toISOString(),
  };
}

// ── Convenience: Get weights for a property type ───────────────────────────

export function getWeightsForType(propertyType: PropertyType): Record<string, number> {
  switch (propertyType) {
    case 'hotel':     return { ...HOTEL_WEIGHTS };
    case 'villa':     return { ...VILLA_WEIGHTS };
    case 'specialty': return { ...SPECIALTY_WEIGHTS };
    default: {
      const _exhaustive: never = propertyType;
      throw new Error(`Unknown property type: ${_exhaustive}`);
    }
  }
}

// ── Convenience: Get dimension names for a property type ───────────────────

export function getDimensionNames(propertyType: PropertyType): string[] {
  return Object.keys(getWeightsForType(propertyType));
}
