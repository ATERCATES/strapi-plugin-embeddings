import type { Core } from '@strapi/strapi';
import { createOpenAIService } from './openai';
import { createLoggingService } from './logging';

export const createSearchService = ({ strapi }: { strapi: Core.Strapi }) => {
  const openAIService = createOpenAIService({ strapi });
  const loggingService = createLoggingService({ strapi });

  return {
    /**
     * Semantic search using vector similarity
     */
    async semanticSearch(params: {
      query: string;
      profileId?: string;
      contentType?: string;
      k?: number;
      distanceMetric?: 'cosine' | 'l2' | 'dot';
      filters?: Record<string, any>;
      minSimilarity?: number;
      logQuery?: boolean;
    }) {
      const {
        query,
        profileId,
        contentType,
        k = 10,
        distanceMetric = 'cosine',
        filters = {},
        minSimilarity,
        logQuery = true,
      } = params;

      // Validate k parameter
      if (k < 1 || k > 1000) {
        throw new Error('k must be between 1 and 1000');
      }

      try {
        // Log the query if enabled
        let queryId: string | undefined;
        if (logQuery) {
          queryId = await loggingService.logSearchQuery({
            profileId,
            queryText: query,
            k,
          });
        }

        // Generate embedding for query
        const queryEmbedding = await openAIService.generateEmbedding(query);
        const vectorString = `[${queryEmbedding.join(',')}]`;

        // Choose distance operator based on metric
        // <=> is cosine distance, <-> is L2, <#> is negative inner product
        const distanceOp = distanceMetric === 'cosine' ? '<=>' :
                          distanceMetric === 'l2' ? '<->' :
                          '<#>';

        // Build WHERE clause for filters
        let whereClause = '1=1';
        const whereParams: any[] = [];

        if (profileId) {
          whereClause += ` AND profile_id = ?`;
          whereParams.push(profileId);
        }

        if (contentType) {
          whereClause += ` AND content_type = ?`;
          whereParams.push(contentType);
        }

        // Add metadata filters using jsonb operators
        for (const [key, value] of Object.entries(filters)) {
          if (value === null) {
            whereClause += ` AND (metadata->>'${key}' IS NULL)`;
          } else {
            whereClause += ` AND (metadata->>'${key}' = ?)`;
            whereParams.push(String(value));
          }
        }

        // Add minimum similarity filter if specified
        let havingClause = '';
        if (minSimilarity !== undefined) {
          if (minSimilarity < 0 || minSimilarity > 1) {
            throw new Error('minSimilarity must be between 0 and 1');
          }
          // For cosine distance, similarity = 1 - distance
          // For inner product, we need different logic
          if (distanceMetric === 'cosine') {
            havingClause = ` HAVING (1 - (embedding <=> ?::vector)) >= ?`;
            whereParams.push(vectorString, minSimilarity);
          } else if (distanceMetric === 'dot') {
            // Inner product similarity (higher is better)
            havingClause = ` HAVING (embedding <#> ?::vector) * -1 >= ?`;
            whereParams.push(vectorString, minSimilarity);
          }
        }

        // Execute search with proper indexing support
        // Note: ORDER BY must use the distance operator directly for index scan
        const knex = strapi.db.connection;
        const results = await knex.raw(`
          SELECT
            id,
            profile_id,
            content_type,
            content_id,
            field_name,
            locale,
            metadata,
            embedding ${distanceOp} ?::vector AS distance,
            CASE
              WHEN '${distanceMetric}' = 'cosine' THEN 1 - (embedding <=> ?::vector)
              WHEN '${distanceMetric}' = 'dot' THEN (embedding <#> ?::vector) * -1
              ELSE NULL
            END AS similarity_score
          FROM plugin_embeddings_vectors
          WHERE ${whereClause}
          ${havingClause}
          ORDER BY embedding ${distanceOp} ?::vector
          LIMIT ?
        `, [vectorString, vectorString, vectorString, ...whereParams, vectorString, k]);

        // Log results if query was logged
        if (logQuery && queryId && results.rows.length > 0) {
          await loggingService.logSearchResults({
            queryId,
            results: results.rows.map((row: any, index: number) => ({
              contentType: row.content_type,
              contentId: row.content_id,
              fieldName: row.field_name,
              locale: row.locale,
              similarityScore: parseFloat(row.similarity_score),
              metadata: row.metadata,
              position: index + 1,
            })),
          });
        }

        return results.rows;
      } catch (error: any) {
        strapi.log.error('[Embeddings Plugin] Error in semantic search:', error);
        throw error;
      }
    },
  };
};