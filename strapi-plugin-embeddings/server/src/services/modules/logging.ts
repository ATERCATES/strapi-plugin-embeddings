import type { Core } from '@strapi/strapi';

export const createLoggingService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Log a search query to the history
   */
  async logSearchQuery(params: {
    profileId?: string;
    queryText: string;
    k: number;
  }): Promise<string> {
    const { profileId, queryText, k } = params;

    try {
      const knex = strapi.db.connection;
      const [result] = await knex('plugin_embedding_queries')
        .insert({
          profile_id: profileId || null,
          query_text: queryText,
          k,
        })
        .returning('id');

      return result.id;
    } catch (error: any) {
      strapi.log.error('[Embeddings Plugin] Error logging search query:', error);
      throw error;
    }
  },

  /**
   * Log search results for a query
   */
  async logSearchResults(params: {
    queryId: string;
    results: Array<{
      contentType: string;
      contentId: string;
      fieldName: string;
      locale?: string;
      similarityScore: number;
      metadata?: Record<string, any>;
      position: number;
    }>;
  }) {
    const { queryId, results } = params;

    if (!results || results.length === 0) {
      return;
    }

    try {
      const knex = strapi.db.connection;
      const recordsToInsert = results.map((result) => ({
        query_id: queryId,
        content_type: result.contentType,
        content_id: result.contentId,
        field_name: result.fieldName,
        locale: result.locale || null,
        similarity_score: result.similarityScore,
        metadata: JSON.stringify(result.metadata || {}),
        position: result.position,
      }));

      await knex('plugin_embedding_query_results')
        .insert(recordsToInsert);

      strapi.log.debug(`[Embeddings Plugin] Logged ${results.length} search results for query ${queryId}`);
    } catch (error: any) {
      strapi.log.error('[Embeddings Plugin] Error logging search results:', error);
      // Don't throw - this is non-critical functionality
    }
  },

  /**
   * Get query history with results
   */
  async getQueryHistory(params: {
    profileId?: string;
    limit?: number;
    offset?: number;
  }) {
    const { profileId, limit = 50, offset = 0 } = params;

    try {
      const knex = strapi.db.connection;

      let query = knex('plugin_embedding_queries')
        .select('*')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      if (profileId) {
        query = query.where({ profile_id: profileId });
      }

      const queries = await query;

      // Get results for each query
      const queriesWithResults = await Promise.all(
        queries.map(async (query: any) => {
          const results = await knex('plugin_embedding_query_results')
            .where({ query_id: query.id })
            .orderBy('position', 'asc');

          return {
            ...query,
            results,
          };
        })
      );

      return queriesWithResults;
    } catch (error: any) {
      strapi.log.error('[Embeddings Plugin] Error getting query history:', error);
      throw error;
    }
  },
});