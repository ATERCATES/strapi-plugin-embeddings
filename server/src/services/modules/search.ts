import type { Core } from '@strapi/strapi';
import type { Knex } from 'knex';
import { createOpenAIService } from './openai';

const TABLE_VECTOR = 'plugin_embeddings_vector';
const DEFAULT_TOP_K = 10;

interface SemanticFilters {
  contentType?: string;
  embedding_fields?: string[];
  published?: boolean;
}

interface SemanticQueryParams {
  query: string;
  top_k?: number;
  min_score?: number;
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
    { contentType, embedding_fields, published }: SemanticFilters = {}
  ) => {
    const shouldFilterPublished = published ?? true;
    if (shouldFilterPublished) {
      qb.where('published', true);
    }

    if (contentType) {
      qb.andWhere('content_type', contentType);
    }

    if (embedding_fields?.length) {
      qb.whereIn('field', embedding_fields);
    }
  };

  const buildVectorLiteral = (embedding: number[]): string => `[${embedding.join(',')}]`;

  const createBaseQuery = (knex: Knex, vectorLiteral: string) =>
    knex(TABLE_VECTOR)
      .select('document_id')
      .select('content_type')
      .select(knex.raw('1 - (embedding <=> ?::vector) AS similarity_score', [vectorLiteral]));

  const applymin_scoreFilter = (
    qb: Knex.QueryBuilder,
    vectorLiteral: string,
    min_score?: number
  ) => {
    if (min_score === undefined) return;
    qb.andWhereRaw('1 - (embedding <=> ?::vector) >= ?', [vectorLiteral, min_score]);
  };

  const formatSearchResult = (row: any): SearchResult => ({
    documentId: row.document_id,
    contentType: row.content_type,
    similarityScore: parseFloat(row.similarity_score),
  });

  const executeSemanticQuery = async ({
    query,
    top_k = DEFAULT_TOP_K,
    min_score,
    filters,
  }: SemanticQueryParams): Promise<SearchResult[]> => {
    const embedding = await openAIService.generateEmbedding(query);
    const vectorLiteral = buildVectorLiteral(embedding);

    const knex = strapi.db.connection;
    const queryBuilder = createBaseQuery(knex, vectorLiteral);

    applyFilters(queryBuilder, filters);
    applymin_scoreFilter(queryBuilder, vectorLiteral, min_score);

    queryBuilder.orderByRaw('embedding <=> ?::vector', [vectorLiteral]);
    queryBuilder.limit(top_k);

    const rows = await queryBuilder;
    return rows.map(formatSearchResult);
  };

  return {
    async semanticSearchByProfile(params: {
      query: string;
      contentType: string;
      embedding_fields?: string[];
      top_k?: number;
      min_score?: number;
    }): Promise<SearchResult[]> {
      try {
        return await executeSemanticQuery({
          query: params.query,
          top_k: params.top_k,
          min_score: params.min_score,
          filters: {
            contentType: params.contentType,
            embedding_fields: params.embedding_fields,
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
      min_score?: number;
      published?: boolean;
    }): Promise<SearchResult[]> {
      try {
        return await executeSemanticQuery({
          query: params.query,
          top_k: params.top_k,
          min_score: params.min_score,
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
