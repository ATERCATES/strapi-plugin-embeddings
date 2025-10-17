import type { Core } from '@strapi/strapi';
import { createVectorsService } from './vectors';

export const createProfilesService = ({ strapi }: { strapi: Core.Strapi }) => {
  const vectorsService = createVectorsService({ strapi });

  /**
   * Extract a nested value from an object using dot notation
   * e.g., "seoComponent.metaTitle" -> object.seoComponent.metaTitle
   */
  const getNestedValue = (obj: any, path: string): any => {
    if (!path.includes('.')) {
      return obj[path];
    }
    
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current == null) {
        return null;
      }
      current = current[part];
    }
    
    return current;
  };

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

            // Extract component names from fields (e.g., "question_variants.question_variant" -> "question_variants")
            const componentNames = new Set<string>();
            for (const fieldName of fields as string[]) {
              if (fieldName.includes('.')) {
                const componentName = fieldName.split('.')[0];
                componentNames.add(componentName);
              }
            }

            // Build populate option to fetch component data
            // For Strapi v5 Document Service API, components must be explicitly populated
            // Components are populated the same way as relations - using an array
            // See: https://docs.strapi.io/cms/api/document-service/populate#components--dynamic-zones
            const findManyOptions: any = {
              status: 'published',
            };
            
            // If we have components, populate them explicitly in an array
            if (componentNames.size > 0) {
              findManyOptions.populate = Array.from(componentNames);
              strapi.log.debug(`[Embeddings Plugin] Populating components: ${JSON.stringify(findManyOptions.populate)}`);
            }

            const documents = await strapi.documents(uid as any).findMany(findManyOptions);
            
            strapi.log.debug(`[Embeddings Plugin] Document sample keys: ${documents[0] ? Object.keys(documents[0]).join(', ') : 'no documents'}`);

            strapi.log.info(`[Embeddings Plugin] Found ${documents.length} documents for ${contentType}`);

            // Process each document
            for (const document of documents) {
              for (const fieldName of fields as string[]) {
                try {
                  // Check if this is a repeatable component field (e.g., "question_variants.question_variant")
                  if (fieldName.includes('.')) {
                    const [componentField, nestedField] = fieldName.split('.');
                    const componentData = document[componentField];
                    
                    // Check if the component field exists and is an array (repeatable component)
                    if (Array.isArray(componentData) && componentData.length > 0) {
                      // Iterate over each item in the repeatable component
                      for (let index = 0; index < componentData.length; index++) {
                        const componentItem = componentData[index];
                        const text = componentItem[nestedField];
                        
                        if (!text || typeof text !== 'string') {
                          strapi.log.debug(`[Embeddings Plugin] Skipping ${contentType}:${document.documentId}:${fieldName}[${index}] - no text`);
                          continue;
                        }
                        
                        // Generate and store embedding for each item in the repeatable component
                        await vectorsService.upsertEmbedding({
                          profileId: profile.id,
                          contentType: contentType,
                          contentId: document.documentId,
                          fieldName: `${fieldName}[${index}]`, // Include index to make it unique
                          text: text,
                          locale: document.locale || null,
                          metadata: {
                            title: document.title || document.name || null,
                            componentIndex: index,
                          },
                        });
                        
                        totalProcessed++;
                        strapi.log.debug(`[Embeddings Plugin] Generated embedding for ${contentType}:${document.documentId}:${fieldName}[${index}]`);
                      }
                    } else {
                      strapi.log.debug(`[Embeddings Plugin] Component field not found or not an array: ${componentField}. Document keys: ${Object.keys(document).join(', ')}`);
                    }
                  } else {
                    // Regular field (not a component)
                    let text = document[fieldName];
                    
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
                  }
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

    /**
     * Delete a profile and all associated data
     */
    async deleteProfile(id: string) {
      const knex = strapi.db.connection;

      try {
        return await knex.transaction(async (trx: any) => {
          // Delete all vectors associated with this profile
          await trx('plugin_embedding_vectors')
            .where({ profile_id: id })
            .del();

          // Delete all fields associated with this profile
          await trx('plugin_embedding_profile_fields')
            .where({ profile_id: id })
            .del();

          // Delete the profile itself
          const result = await trx('plugin_embedding_profiles')
            .where({ id })
            .del();

          if (result === 0) {
            throw new Error(`Profile ${id} not found`);
          }

          strapi.log.info(`[Embeddings Plugin] Profile ${id} deleted successfully`);

          return { success: true };
        });
      } catch (error) {
        strapi.log.error('[Embeddings Plugin] Error deleting profile:', error);
        throw error;
      }
    },
  };
};