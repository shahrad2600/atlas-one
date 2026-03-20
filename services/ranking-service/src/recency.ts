// ── Recency Multiplier ──────────────────────────────────────────────────────
// Applies a time-decay factor to a property's score based on when its most
// recent review was submitted. Properties with stale data are penalized.
//
// Decay schedule:
//   0-6 months:   1.00 (no penalty)
//   6-12 months:  0.95
//   12-24 months: 0.85
//   24+ months:   0.70

export interface RecencyBand {
  label: string;
  minMonths: number;
  maxMonths: number;
  multiplier: number;
}

export const RECENCY_BANDS: ReadonlyArray<RecencyBand> = [
  { label: 'fresh',      minMonths: 0,  maxMonths: 6,  multiplier: 1.00 },
  { label: 'recent',     minMonths: 6,  maxMonths: 12, multiplier: 0.95 },
  { label: 'aging',      minMonths: 12, maxMonths: 24, multiplier: 0.85 },
  { label: 'stale',      minMonths: 24, maxMonths: Infinity, multiplier: 0.70 },
];

// ── Month Difference Utility ───────────────────────────────────────────────

function monthsBetween(from: Date, to: Date): number {
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  const dayFraction = (to.getDate() - from.getDate()) / 30;
  return years * 12 + months + dayFraction;
}

// ── Compute Recency Multiplier ─────────────────────────────────────────────

export function computeRecencyMultiplier(latestReviewDate: Date, referenceDate?: Date): number {
  const now = referenceDate ?? new Date();
  const ageMonths = monthsBetween(latestReviewDate, now);

  // Walk the bands in order; return the first match
  for (const band of RECENCY_BANDS) {
    if (ageMonths < band.maxMonths) {
      return band.multiplier;
    }
  }

  // Fallback (should not be reached)
  return 0.70;
}

// ── Determine Recency Band ─────────────────────────────────────────────────

export function getRecencyBand(latestReviewDate: Date, referenceDate?: Date): RecencyBand {
  const now = referenceDate ?? new Date();
  const ageMonths = monthsBetween(latestReviewDate, now);

  for (const band of RECENCY_BANDS) {
    if (ageMonths < band.maxMonths) {
      return band;
    }
  }

  return RECENCY_BANDS[RECENCY_BANDS.length - 1]!;
}

// ── Compute Age in Months (exposed for explanations) ───────────────────────

export function computeReviewAgeMonths(latestReviewDate: Date, referenceDate?: Date): number {
  const now = referenceDate ?? new Date();
  return Math.round(monthsBetween(latestReviewDate, now) * 10) / 10;
}
