import type { Core } from '@strapi/strapi';
import { createOpenAIService } from './openai';

const TABLE_VECTOR = 'plugin_embeddings_vector';

export const createVectorsService = ({ strapi }: { strapi: Core.Strapi }) => {
  const openAIService = createOpenAIService({ strapi });

  return {
    // Create or update embedding for content (draft or published)
    async upsertEmbedding(params: {
      contentType: string;
      documentId: string;
      cmpId?: string | null;
      field: string;
      text: string;
      published?: boolean;
    }) {
      const { 
        contentType, 
        documentId, 
        cmpId = null,
        field, 
        text, 
        published = false 
      } = params;

      if (!contentType || !documentId || !field || !text) {
        throw new Error('Missing required parameters: contentType, documentId, field, text');
      }

      try {
        const embedding = await openAIService.generateEmbedding(text);
        const vectorString = `[${embedding.join(',')}]`;
        const knex = strapi.db.connection;

        await knex.raw(
          `
          INSERT INTO ${TABLE_VECTOR}
            (content_type, document_id, cmp_id, field, content, embedding, published, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?::vector, ?, NOW(), NOW())
          ON CONFLICT (content_type, document_id, field, published, COALESCE(cmp_id, ''))
          DO UPDATE SET
            embedding = EXCLUDED.embedding,
            content = EXCLUDED.content,
            updated_at = NOW()
          `,
          [contentType, documentId, cmpId, field, text, vectorString, published]
        );

        strapi.log.debug(
          `[Embeddings Plugin] Upserted embedding for ${documentId}:${field} ` +
          `(published: ${published}, cmpId: ${cmpId || 'null'})`
        );
      } catch (error: any) {
        strapi.log.error('[Embeddings Plugin] Error upserting embedding:', error);
        throw error;
      }
    },

    // Delete all embeddings for a document (both draft and published)
    async deleteEmbedding(params: { documentId: string }) {
      const { documentId } = params;
      const knex = strapi.db.connection;

      await knex(TABLE_VECTOR)
        .where({ document_id: documentId })
        .del();

      strapi.log.debug(`[Embeddings Plugin] Deleted all embeddings for ${documentId}`);
    },

    /**
     * Delete only draft embeddings for a document
     * Used before regenerating embeddings on document update
     */
    async deleteDraftEmbeddings(params: { 
      documentId: string;
    }) {
      const { documentId } = params;
      const knex = strapi.db.connection;

      const deletedCount = await knex(TABLE_VECTOR)
        .where({ document_id: documentId, published: false })
        .del();

      strapi.log.debug(
        `[Embeddings Plugin] Deleted ${deletedCount} draft embeddings for ${documentId}`
      );

      return { deletedCount };
    },

    /**
     * Delete only published embeddings for a document
     * Used before duplicating draft to published on publish action
     */
    async deletePublishedEmbeddings(params: { 
      documentId: string;
    }) {
      const { documentId } = params;
      const knex = strapi.db.connection;

      const deletedCount = await knex(TABLE_VECTOR)
        .where({ document_id: documentId, published: true })
        .del();

      strapi.log.debug(
        `[Embeddings Plugin] Deleted ${deletedCount} published embeddings for ${documentId}`
      );

      return { deletedCount };
    },

    /**
     * Duplicate all draft embeddings to published
     * Used when publishing a document
     */
    async duplicateDraftToPublished(params: {
      documentId: string;
    }) {
      const { documentId } = params;
      const knex = strapi.db.connection;

      // First, delete all published embeddings for this document
      await this.deletePublishedEmbeddings({ documentId });

      // Then, duplicate all draft embeddings to published
      const result = await knex.raw(
        `
        INSERT INTO ${TABLE_VECTOR}
          (content_type, document_id, cmp_id, field, content, embedding, published, created_at, updated_at)
        SELECT
          content_type,
          document_id,
          cmp_id,
          field,
          content,
          embedding,
          true AS published,
          NOW() AS created_at,
          NOW() AS updated_at
        FROM ${TABLE_VECTOR}
        WHERE document_id = ?
          AND published = false
        `,
        [documentId]
      );

      const copiedCount = result.rowCount || 0;

      strapi.log.debug(
        `[Embeddings Plugin] Duplicated ${copiedCount} draft embeddings to published for ${documentId}`
      );

      return { copiedCount };
    },
  };
};
