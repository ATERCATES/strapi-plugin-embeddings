import type { Core } from '@strapi/strapi';
import type { Knex } from 'knex';
import { createOpenAIService } from './openai';

const TABLE_VECTOR = 'plugin_embeddings_vector';
const DEFAULT_TOP_K = 10;

interface SemanticFilters {
  contentType?: string;
  embeddingFields?: string[];
  published?: boolean;
}

interface SemanticQueryParams {
  query: string;
  top_k?: number;
  minScore?: number;
  filters?: SemanticFilters;
}

interface SearchResult {
  documentId: string;
  contentType: string;
  similarityScore: number;
}

export const createSearchService = ({ strapi }: { strapi: Core.Strapi }) => {
  const openAIService = createOpenAIService({ strapi });

  const applyFilters = (
    qb: Knex.QueryBuilder,
    { contentType, embeddingFields, published }: SemanticFilters = {}
  ) => {
    const shouldFilterPublished = published ?? true;
    if (shouldFilterPublished) {
      qb.where('published', true);
    }

    if (contentType) {
      qb.andWhere('content_type', contentType);
    }

    if (embeddingFields?.length) {
      qb.andWhere(function applyFieldFilters() {
        embeddingFields.forEach(field => {
          this.orWhere(function matchFieldVariant() {
            this.where('field', field).orWhere('field', 'like', `${field}[%]`);
          });
        });
      });
    }
  };

  const buildVectorLiteral = (embedding: number[]): string => `[${embedding.join(',')}]`;

  const createBaseQuery = (knex: Knex, vectorLiteral: string) =>
    knex(TABLE_VECTOR)
      .select('document_id')
      .select('content_type')
      .select(knex.raw('1 - (embedding <=> ?::vector) AS similarity_score', [vectorLiteral]));

  const applyMinScoreFilter = (
    qb: Knex.QueryBuilder,
    vectorLiteral: string,
    minScore?: number
  ) => {
    if (minScore === undefined) return;
    qb.andWhereRaw('1 - (embedding <=> ?::vector) >= ?', [vectorLiteral, minScore]);
  };

  const formatSearchResult = (row: any): SearchResult => ({
    documentId: row.document_id,
    contentType: row.content_type,
    similarityScore: parseFloat(row.similarity_score),
  });

  const executeSemanticQuery = async ({
    query,
    top_k = DEFAULT_TOP_K,
    minScore,
    filters,
  }: SemanticQueryParams): Promise<SearchResult[]> => {
    const embedding = await openAIService.generateEmbedding(query);
    const vectorLiteral = buildVectorLiteral(embedding);

    const knex = strapi.db.connection;
    const queryBuilder = createBaseQuery(knex, vectorLiteral);

    applyFilters(queryBuilder, filters);
    applyMinScoreFilter(queryBuilder, vectorLiteral, minScore);

    queryBuilder.orderByRaw('embedding <=> ?::vector', [vectorLiteral]);
    queryBuilder.limit(top_k);

    const rows = await queryBuilder;
    return rows.map(formatSearchResult);
  };

  return {
    async semanticSearchByProfile(params: {
      query: string;
      contentType: string;
      embeddingFields?: string[];
      top_k?: number;
      minScore?: number;
    }): Promise<SearchResult[]> {
      try {
        return await executeSemanticQuery({
          query: params.query,
          top_k: params.top_k,
          minScore: params.minScore,
          filters: {
            contentType: params.contentType,
            embeddingFields: params.embeddingFields,
          },
        });
      } catch (error: any) {
        strapi.log.error('[Embeddings] Semantic search error:', error);
        throw error;
      }
    },

    async semanticSearchAll(params: {
      query: string;
      top_k?: number;
      minScore?: number;
      published?: boolean;
    }): Promise<SearchResult[]> {
      try {
        return await executeSemanticQuery({
          query: params.query,
          top_k: params.top_k,
          minScore: params.minScore,
          filters: {
            published: params.published,
          },
        });
      } catch (error: any) {
        strapi.log.error('[Embeddings] Global semantic search error:', error);
        throw error;
      }
    },
  };
};
