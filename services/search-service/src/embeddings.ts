// ─── Embedding Service ───────────────────────────────────────────────
// Provides deterministic embedding generation and cosine similarity
// computation. In production, the generateEmbedding method would call
// an external API (e.g., OpenAI text-embedding-3-small). The mock
// implementation uses a hash-seeded pseudo-random sequence that
// produces consistent 1536-dim unit vectors for the same input text.
// ─────────────────────────────────────────────────────────────────────

const EMBEDDING_DIMENSIONS = 1536;

/**
 * Simple string hash function (djb2 variant). Produces a consistent
 * non-negative 32-bit integer for a given input string.
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) + hash + char) | 0;
  }
  return Math.abs(hash);
}

/**
 * EmbeddingService encapsulates all vector-related operations:
 * generating embeddings from text and computing similarity scores.
 */
export class EmbeddingService {
  readonly dimensions: number = EMBEDDING_DIMENSIONS;

  /**
   * Generates a deterministic 1536-dimensional embedding vector from text.
   *
   * Uses a hash of the input text to seed a pseudo-random sequence,
   * producing a normalised unit vector. Identical text always yields
   * identical vectors, which keeps search results stable during
   * development and testing.
   *
   * In production, replace the body with a call to an embeddings API:
   * ```
   * const res = await fetch('https://api.openai.com/v1/embeddings', {
   *   method: 'POST',
   *   headers: { Authorization: `Bearer ${apiKey}` },
   *   body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
   * });
   * return (await res.json()).data[0].embedding;
   * ```
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const normalised = text.toLowerCase().trim();
    const seed = hashString(normalised);
    const embedding: number[] = new Array<number>(this.dimensions);

    for (let i = 0; i < this.dimensions; i++) {
      // Deterministic pseudo-random value seeded by hash + dimension index
      const x = seed * 31 + i;
      embedding[i] = Math.sin(x) * 0.5;
    }

    // Normalise to unit vector so cosine similarity produces values in [-1, 1]
    const magnitude = Math.sqrt(
      embedding.reduce((sum, v) => sum + v * v, 0),
    );

    if (magnitude === 0) {
      return embedding;
    }

    for (let i = 0; i < this.dimensions; i++) {
      embedding[i] = embedding[i]! / magnitude;
    }

    return embedding;
  }

  /**
   * Computes the cosine similarity between two vectors.
   *
   * Returns a value in [-1, 1] where 1 means identical direction,
   * 0 means orthogonal, and -1 means opposite direction.
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(
        `Vector dimension mismatch: ${String(a.length)} vs ${String(b.length)}`,
      );
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      const ai = a[i]!;
      const bi = b[i]!;
      dotProduct += ai * bi;
      magnitudeA += ai * ai;
      magnitudeB += bi * bi;
    }

    const denominator = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);

    if (denominator === 0) {
      return 0;
    }

    return dotProduct / denominator;
  }
}

/**
 * Singleton instance shared across the service. Import this rather
 * than constructing a new EmbeddingService in each module.
 */
export const embeddingService = new EmbeddingService();
