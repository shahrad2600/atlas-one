// ─── AI Utilities ────────────────────────────────────────────────────
// Deterministic mock embedding generator and AI-related type definitions.
// Used for development and testing without requiring external API keys.
// ─────────────────────────────────────────────────────────────────────

/**
 * Simple string hash function that produces a consistent non-negative integer
 * for a given input string. Uses the djb2-variant shift-and-subtract algorithm.
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Generates a deterministic 1536-dimensional mock embedding vector from text.
 *
 * Uses a hash of the input text to seed a pseudo-random sequence, producing
 * a consistent unit vector for the same input. This allows the full search
 * and recommendation infrastructure to function during development without
 * requiring an external embeddings API (e.g., OpenAI).
 *
 * The output is normalized to a unit vector (magnitude = 1) so that cosine
 * similarity computations produce meaningful values in the [0, 1] range.
 *
 * @param text - The input text to generate an embedding for
 * @returns A 1536-dimensional unit vector
 */
export function generateMockEmbedding(text: string): number[] {
  const hash = simpleHash(text);
  const embedding: number[] = [];
  for (let i = 0; i < 1536; i++) {
    // Deterministic pseudo-random value based on hash + index
    const seed = hash * 31 + i;
    embedding.push(Math.sin(seed) * 0.5);
  }
  // Normalize to unit vector
  const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  return embedding.map(v => v / magnitude);
}

/**
 * Embedding model identifiers supported by the platform.
 */
export type EmbeddingModel = 'text-embedding-3-small' | 'text-embedding-3-large' | 'mock';

/**
 * Cost per 1,000 tokens for each supported embedding model (USD).
 */
export const EMBEDDING_COSTS: Record<string, number> = {
  'text-embedding-3-small': 0.00002,
  'text-embedding-3-large': 0.00013,
  'mock': 0,
};

/**
 * Dimensionality of the embedding vector for each model.
 */
export const EMBEDDING_DIMENSIONS: Record<string, number> = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'mock': 1536,
};

/**
 * Interaction weights for user preference vector updates.
 * Higher weights indicate stronger user interest signals.
 */
export const INTERACTION_WEIGHTS: Record<string, number> = {
  view: 1,
  save: 2,
  review: 3,
  book: 5,
};

/**
 * Recommendation algorithm identifiers used in recommendation logging.
 */
export type RecommendationAlgorithm =
  | 'content_similarity'
  | 'collaborative_filtering'
  | 'trending'
  | 'personalized'
  | 'hybrid';

/**
 * Interaction types tracked for preference vector computation.
 */
export type InteractionType = 'view' | 'save' | 'book' | 'review';
