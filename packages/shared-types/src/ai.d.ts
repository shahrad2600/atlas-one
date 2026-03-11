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
export declare function generateMockEmbedding(text: string): number[];
/**
 * Embedding model identifiers supported by the platform.
 */
export type EmbeddingModel = 'text-embedding-3-small' | 'text-embedding-3-large' | 'mock';
/**
 * Cost per 1,000 tokens for each supported embedding model (USD).
 */
export declare const EMBEDDING_COSTS: Record<string, number>;
/**
 * Dimensionality of the embedding vector for each model.
 */
export declare const EMBEDDING_DIMENSIONS: Record<string, number>;
/**
 * Interaction weights for user preference vector updates.
 * Higher weights indicate stronger user interest signals.
 */
export declare const INTERACTION_WEIGHTS: Record<string, number>;
/**
 * Recommendation algorithm identifiers used in recommendation logging.
 */
export type RecommendationAlgorithm = 'content_similarity' | 'collaborative_filtering' | 'trending' | 'personalized' | 'hybrid';
/**
 * Interaction types tracked for preference vector computation.
 */
export type InteractionType = 'view' | 'save' | 'book' | 'review';
//# sourceMappingURL=ai.d.ts.map