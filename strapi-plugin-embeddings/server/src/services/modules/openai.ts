import type { Core } from '@strapi/strapi';
import OpenAI from 'openai';

export const createOpenAIService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Get OpenAI client instance
   */
  getOpenAIClient() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    return new OpenAI({ apiKey });
  },

  /**
   * Validate embedding dimensions
   */
  validateEmbeddingDimensions(embedding: number[], expectedDimensions: number = 1536) {
    if (!Array.isArray(embedding)) {
      throw new Error('Embedding must be an array');
    }
    if (embedding.length !== expectedDimensions) {
      throw new Error(`Embedding has ${embedding.length} dimensions, expected ${expectedDimensions}`);
    }
    // Check for invalid numbers (NaN, Infinity, -Infinity)
    if (embedding.some(val => !Number.isFinite(val))) {
      throw new Error('Embedding contains invalid values (NaN, Infinity, or -Infinity)');
    }
  },

  /**
   * Generate embedding for a text using OpenAI
   */
  async generateEmbedding(text: string, model = 'text-embedding-3-small'): Promise<number[]> {
    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }

    // Normalize text (trim whitespace, collapse multiple spaces)
    const normalizedText = text.trim().replace(/\s+/g, ' ');
    if (!normalizedText) {
      throw new Error('Text cannot be empty after normalization');
    }

    try {
      const openai = this.getOpenAIClient();
      const response = await openai.embeddings.create({
        model,
        input: normalizedText,
        encoding_format: 'float',
      });

      const embedding = response.data[0].embedding;
      this.validateEmbeddingDimensions(embedding);

      return embedding;
    } catch (error: any) {
      if (error.status === 429) {
        strapi.log.error('[Embeddings Plugin] OpenAI rate limit exceeded');
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      }
      if (error.status === 401) {
        strapi.log.error('[Embeddings Plugin] Invalid OpenAI API key');
        throw new Error('Invalid OpenAI API key');
      }
      strapi.log.error('[Embeddings Plugin] Error generating embedding:', error);
      throw error;
    }
  },
});