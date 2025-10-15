import type { Core } from '@strapi/strapi';
import { createOpenAIService } from './openai';

export const createVectorsService = ({ strapi }: { strapi: Core.Strapi }) => {
  const openAIService = createOpenAIService({ strapi });

  return {
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
        const embedding = await openAIService.generateEmbedding(text);

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
  };
};