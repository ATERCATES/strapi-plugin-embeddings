import type { Core } from '@strapi/strapi';
import { createVectorsService } from './vectors';

export const createProfilesService = ({ strapi }: { strapi: Core.Strapi }) => {
  const vectorsService = createVectorsService({ strapi });

  return {
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
     * Index all content for a profile
     */
    async indexProfile(profileId: string) {
      strapi.log.info(`[Embeddings Plugin] Starting indexing for profile ${profileId}`);

      try {
        const profile = await this.getProfile(profileId);

        if (!profile) {
          throw new Error(`Profile ${profileId} not found`);
        }

        if (!profile.fields || profile.fields.length === 0) {
          throw new Error(`Profile ${profileId} has no fields configured`);
        }

        let totalProcessed = 0;
        let totalFailed = 0;

        // Group fields by content type
        const fieldsByContentType = profile.fields.reduce((acc: any, field: any) => {
          if (!acc[field.content_type]) {
            acc[field.content_type] = [];
          }
          acc[field.content_type].push(field.field_name);
          return acc;
        }, {});

        // Process each content type
        for (const [contentType, fields] of Object.entries(fieldsByContentType)) {
          strapi.log.info(`[Embeddings Plugin] Processing content type: ${contentType}`);

          try {
            // Get the UID for the content type (handle the mapping)
            let uid = contentType;

            // If it's a simple name like "AI Content", convert to UID format
            if (!contentType.includes('::')) {
              // Convert "AI Content" to "api::ai-content.ai-content"
              const kebabCase = contentType.toLowerCase().replace(/\s+/g, '-');
              uid = `api::${kebabCase}.${kebabCase}`;
            }

            // Fetch all documents of this content type
            const documents = await strapi.documents(uid as any).findMany({
              status: 'published',
            });

            strapi.log.info(`[Embeddings Plugin] Found ${documents.length} documents for ${contentType}`);

            // Process each document
            for (const document of documents) {
              for (const fieldName of fields as string[]) {
                try {
                  const text = document[fieldName];

                  if (!text || typeof text !== 'string') {
                    strapi.log.debug(`[Embeddings Plugin] Skipping ${contentType}:${document.documentId}:${fieldName} - no text`);
                    continue;
                  }

                  // Generate and store embedding
                  await vectorsService.upsertEmbedding({
                    profileId: profile.id,
                    contentType: contentType,
                    contentId: document.documentId,
                    fieldName: fieldName,
                    text: text,
                    locale: document.locale || null,
                    metadata: {
                      title: document.title || document.name || null,
                    },
                  });

                  totalProcessed++;
                  strapi.log.debug(`[Embeddings Plugin] Generated embedding for ${contentType}:${document.documentId}:${fieldName}`);
                } catch (error: any) {
                  totalFailed++;
                  strapi.log.error(`[Embeddings Plugin] Error generating embedding for ${contentType}:${document.documentId}:${fieldName}:`, error.message);
                }
              }
            }
          } catch (error: any) {
            strapi.log.error(`[Embeddings Plugin] Error processing content type ${contentType}:`, error.message);
            totalFailed++;
          }
        }

        strapi.log.info(`[Embeddings Plugin] Indexing complete for profile ${profileId}. Processed: ${totalProcessed}, Failed: ${totalFailed}`);

        return {
          success: true,
          totalProcessed,
          totalFailed,
        };
      } catch (error: any) {
        strapi.log.error('[Embeddings Plugin] Error indexing profile:', error);
        throw error;
      }
    },
  };
};