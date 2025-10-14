import type { Core } from '@strapi/strapi';
import OpenAI from 'openai';

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
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

  /**
   * Create or update embedding for content
   */
  async upsertEmbedding(params: {
    profileId: string;
    contentType: string;
    contentId: string;
    fieldName: string;
    text: string;
    locale?: string;
    metadata?: Record<string, any>;
  }) {
    const { profileId, contentType, contentId, fieldName, text, locale, metadata } = params;
    
    // Validate required params
    if (!profileId || !contentType || !contentId || !fieldName || !text) {
      throw new Error('Missing required parameters: profileId, contentType, contentId, fieldName, text');
    }

    try {
      // Generate embedding
      const embedding = await this.generateEmbedding(text);
      
      // Convert embedding array to pgvector format
      const vectorString = `[${embedding.join(',')}]`;
      
      // Validate metadata
      const cleanMetadata = metadata && typeof metadata === 'object' ? metadata : {};
      
      // Upsert to database using proper PostgreSQL ON CONFLICT
      // Note: Since locale can be NULL and PostgreSQL treats NULL != NULL in unique constraints,
      // we need to handle NULL locale separately
      const knex = strapi.db.connection;
      
      let result;
      if (locale) {
        // If locale is provided, use the unique constraint
        result = await knex.raw(`
          INSERT INTO plugin_embeddings_vectors 
            (profile_id, content_type, content_id, field_name, locale, embedding, metadata, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?::vector, ?::jsonb, NOW(), NOW())
          ON CONFLICT (profile_id, content_type, content_id, field_name, locale)
          DO UPDATE SET
            embedding = EXCLUDED.embedding,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
          RETURNING *
        `, [
          profileId,
          contentType,
          contentId,
          fieldName,
          locale,
          vectorString,
          JSON.stringify(cleanMetadata)
        ]);
      } else {
        // If locale is NULL, we need to update or insert based on manual check
        // since UNIQUE constraint doesn't handle NULL properly for our use case
        const existing = await knex('plugin_embeddings_vectors')
          .where({
            profile_id: profileId,
            content_type: contentType,
            content_id: contentId,
            field_name: fieldName,
          })
          .whereNull('locale')
          .first();
        
        if (existing) {
          result = await knex.raw(`
            UPDATE plugin_embeddings_vectors
            SET embedding = ?::vector, metadata = ?::jsonb, updated_at = NOW()
            WHERE id = ?
            RETURNING *
          `, [vectorString, JSON.stringify(cleanMetadata), existing.id]);
        } else {
          result = await knex.raw(`
            INSERT INTO plugin_embeddings_vectors 
              (profile_id, content_type, content_id, field_name, locale, embedding, metadata, created_at, updated_at)
            VALUES (?, ?, ?, ?, NULL, ?::vector, ?::jsonb, NOW(), NOW())
            RETURNING *
          `, [
            profileId,
            contentType,
            contentId,
            fieldName,
            vectorString,
            JSON.stringify(cleanMetadata)
          ]);
        }
      }
      
      strapi.log.debug(`[Embeddings Plugin] Upserted embedding for ${contentType}:${contentId}:${fieldName}`);
      return result.rows[0];
    } catch (error: any) {
      strapi.log.error('[Embeddings Plugin] Error upserting embedding:', error);
      throw error;
    }
  },

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
        queryId = await this.logSearchQuery({
          profileId,
          queryText: query,
          k,
        });
      }

      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);
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
        await this.logSearchResults({
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

  /**
   * Get all profiles
   */
  async getProfiles() {
    const knex = strapi.db.connection;
    const profiles = await knex('plugin_embedding_profiles')
      .select('*')
      .orderBy('created_at', 'desc');
    return profiles;
  },

  /**
   * Get profile by ID with fields
   */
  async getProfile(id: string) {
    const knex = strapi.db.connection;
    
    const profile = await knex('plugin_embedding_profiles')
      .where({ id })
      .first();
    
    if (!profile) {
      return null;
    }
    
    const fields = await knex('plugin_embedding_profile_fields')
      .where({ profile_id: id })
      .select('*');
    
    return {
      ...profile,
      fields,
    };
  },

  /**
   * Create a new profile
   */
  async createProfile(data: {
    name: string;
    slug: string;
    description?: string;
    fields: Array<{
      content_type: string;
      field_name: string;
      enabled?: boolean;
    }>;
  }) {
    const knex = strapi.db.connection;
    
    try {
      return await knex.transaction(async (trx: any) => {
        // Create profile
        const [profile] = await trx('plugin_embedding_profiles')
          .insert({
            name: data.name,
            slug: data.slug,
            description: data.description,
            enabled: true,
            auto_sync: true,
          })
          .returning('*');
        
        // Create fields
        if (data.fields && data.fields.length > 0) {
          const fieldsToInsert = data.fields.map((field) => ({
            profile_id: profile.id,
            content_type: field.content_type,
            field_name: field.field_name,
            enabled: field.enabled !== false,
          }));
          
          await trx('plugin_embedding_profile_fields')
            .insert(fieldsToInsert);
        }
        
        return profile;
      });
    } catch (error) {
      strapi.log.error('[Embeddings Plugin] Error creating profile:', error);
      throw error;
    }
  },

  /**
   * Delete embedding when content is deleted
   */
  async deleteEmbedding(params: {
    contentType: string;
    contentId: string;
  }) {
    const { contentType, contentId } = params;
    
    const knex = strapi.db.connection;
    await knex('plugin_embeddings_vectors')
      .where({ content_type: contentType, content_id: contentId })
      .del();
    
    strapi.log.debug(`[Embeddings Plugin] Deleted embeddings for ${contentType}:${contentId}`);
  },

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

export default service;
