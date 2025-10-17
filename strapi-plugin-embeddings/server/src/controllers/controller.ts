import type { Core } from '@strapi/strapi';

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * POST /embeddings/query
   * Perform semantic search
   */
  async query(ctx: any) {
    try {
      const { query, profileId, contentType, k, distanceMetric, filters, minSimilarity } = ctx.request.body;
      
      // Validation
      if (!query || typeof query !== 'string') {
        return ctx.badRequest('Query text is required and must be a string');
      }
      
      if (k !== undefined && (typeof k !== 'number' || k < 1 || k > 1000)) {
        return ctx.badRequest('k must be a number between 1 and 1000');
      }
      
      if (distanceMetric && !['cosine', 'l2', 'dot'].includes(distanceMetric)) {
        return ctx.badRequest('distanceMetric must be one of: cosine, l2, dot');
      }

      if (minSimilarity !== undefined && (typeof minSimilarity !== 'number' || minSimilarity < 0 || minSimilarity > 1)) {
        return ctx.badRequest('minSimilarity must be a number between 0 and 1');
      }
      
      const results = await strapi
        .plugin('embeddings')
        .service('service')
        .semanticSearch({
          query,
          profileId,
          contentType,
          k: k || 10,
          distanceMetric: distanceMetric || 'cosine',
          filters: filters || {},
          minSimilarity,
        });
      
      ctx.body = {
        data: results,
        meta: {
          total: results.length,
          distanceMetric: distanceMetric || 'cosine',
        },
      };
    } catch (error: any) {
      strapi.log.error('[Embeddings Plugin] Query error:', error);
      const message = error.message || 'Error performing semantic search';
      ctx.throw(500, message);
    }
  },

  /**
   * GET /embeddings/:profileName/query
   * Perform semantic search by profile name with natural language query
   */
  async queryByProfileName(ctx: any) {
    try {
      const { profileName } = ctx.params;
      const { q, k, distanceMetric, minSimilarity } = ctx.query;
      
      // Validation
      if (!profileName || typeof profileName !== 'string') {
        return ctx.badRequest('Profile name is required');
      }
      
      if (!q || typeof q !== 'string') {
        return ctx.badRequest('Query parameter "q" is required and must be a string');
      }
      
      // Get profile by slug/name
      const profiles = await strapi
        .plugin('embeddings')
        .service('service')
        .getProfiles();
      
      const profile = profiles.find((p: any) => p.slug === profileName || p.name === profileName);
      
      if (!profile) {
        return ctx.notFound(`Profile "${profileName}" not found`);
      }
      
      // Parse optional parameters
      const parsedK = k ? parseInt(k as string, 10) : 10;
      const parsedMinSimilarity = minSimilarity ? parseFloat(minSimilarity as string) : undefined;
      
      if (parsedK < 1 || parsedK > 1000) {
        return ctx.badRequest('k must be a number between 1 and 1000');
      }
      
      if (distanceMetric && !['cosine', 'l2', 'dot'].includes(distanceMetric as string)) {
        return ctx.badRequest('distanceMetric must be one of: cosine, l2, dot');
      }

      if (parsedMinSimilarity !== undefined && (parsedMinSimilarity < 0 || parsedMinSimilarity > 1)) {
        return ctx.badRequest('minSimilarity must be a number between 0 and 1');
      }
      
      const results = await strapi
        .plugin('embeddings')
        .service('service')
        .semanticSearch({
          query: q as string,
          profileId: profile.id,
          k: parsedK,
          distanceMetric: (distanceMetric as any) || 'cosine',
          filters: {},
          minSimilarity: parsedMinSimilarity,
        });
      
      ctx.body = {
        data: results,
        meta: {
          total: results.length,
          profileName: profile.name,
          profileSlug: profile.slug,
          query: q,
          distanceMetric: distanceMetric || 'cosine',
        },
      };
    } catch (error: any) {
      strapi.log.error('[Embeddings Plugin] Query by profile name error:', error);
      const message = error.message || 'Error performing semantic search';
      ctx.throw(500, message);
    }
  },

  /**
   * GET /embeddings/profiles
   * Get all profiles
   */
  async listProfiles(ctx: any) {
    try {
      const profiles = await strapi
        .plugin('embeddings')
        .service('service')
        .getProfiles();
      
      ctx.body = {
        data: profiles,
        meta: {
          total: profiles.length,
        },
      };
    } catch (error: any) {
      strapi.log.error('[Embeddings Plugin] List profiles error:', error);
      ctx.throw(500, 'Error fetching profiles');
    }
  },

  /**
   * GET /embeddings/profiles/:id
   * Get profile by ID
   */
  async getProfile(ctx: any) {
    try {
      const { id } = ctx.params;
      
      if (!id) {
        return ctx.badRequest('Profile ID is required');
      }
      
      const profile = await strapi
        .plugin('embeddings')
        .service('service')
        .getProfile(id);
      
      if (!profile) {
        return ctx.notFound('Profile not found');
      }
      
      ctx.body = { data: profile };
    } catch (error: any) {
      strapi.log.error('[Embeddings Plugin] Get profile error:', error);
      ctx.throw(500, 'Error fetching profile');
    }
  },

  /**
   * POST /embeddings/profiles
   * Create a new profile
   */
  async createProfile(ctx: any) {
    try {
      const data = ctx.request.body;
      
      // Validate required fields
      if (!data.name || typeof data.name !== 'string') {
        return ctx.badRequest('name is required and must be a string');
      }
      
      if (!data.slug || typeof data.slug !== 'string') {
        return ctx.badRequest('slug is required and must be a string');
      }
      
      // Validate slug format (alphanumeric and hyphens only)
      if (!/^[a-z0-9-]+$/.test(data.slug)) {
        return ctx.badRequest('slug must contain only lowercase letters, numbers, and hyphens');
      }
      
      if (!data.fields || !Array.isArray(data.fields) || data.fields.length === 0) {
        return ctx.badRequest('fields is required and must be a non-empty array');
      }
      
      // Validate each field
      for (const field of data.fields) {
        if (!field.content_type || !field.field_name) {
          return ctx.badRequest('Each field must have content_type and field_name');
        }
      }
      
      const profile = await strapi
        .plugin('embeddings')
        .service('service')
        .createProfile(data);
      
      // Start indexing in the background
      setImmediate(async () => {
        try {
          strapi.log.info(`[Embeddings Plugin] Starting background indexing for profile ${profile.id}`);
          await strapi.plugin('embeddings').service('service').indexProfile(profile.id);
        } catch (error: any) {
          strapi.log.error(`[Embeddings Plugin] Error indexing profile ${profile.id}:`, error);
        }
      });
      
      ctx.body = { data: profile };
      ctx.status = 201;
    } catch (error: any) {
      strapi.log.error('[Embeddings Plugin] Create profile error:', error);
      
      const message = error.message || 'Error creating profile';
      ctx.throw(500, message);
    }
  },

  /**
   * POST /embeddings/generate
   * Manually generate embedding for content
   */
  async generateEmbedding(ctx: any) {
    try {
      const { profileId, contentType, contentId, fieldName, text, locale, metadata } = ctx.request.body;
      
      // Validation
      if (!profileId) {
        return ctx.badRequest('profileId is required');
      }
      
      if (!contentType) {
        return ctx.badRequest('contentType is required');
      }
      
      if (!contentId) {
        return ctx.badRequest('contentId is required');
      }
      
      if (!fieldName) {
        return ctx.badRequest('fieldName is required');
      }
      
      if (!text || typeof text !== 'string') {
        return ctx.badRequest('text is required and must be a non-empty string');
      }
      
      if (locale && typeof locale !== 'string') {
        return ctx.badRequest('locale must be a string');
      }
      
      if (metadata && typeof metadata !== 'object') {
        return ctx.badRequest('metadata must be an object');
      }
      
      const result = await strapi
        .plugin('embeddings')
        .service('service')
        .upsertEmbedding({
          profileId,
          contentType,
          contentId,
          fieldName,
          text,
          locale,
          metadata,
        });
      
      ctx.body = { data: result };
      ctx.status = 201;
    } catch (error: any) {
      strapi.log.error('[Embeddings Plugin] Generate embedding error:', error);
      const message = error.message || 'Error generating embedding';
      ctx.throw(500, message);
    }
  },

  /**
   * GET /embeddings/content-types
   * Get all content types with their text fields and component fields
   */
  async getContentTypes(ctx: any) {
    try {
      const contentTypes = strapi.contentTypes;
      const components = strapi.components;
      const result: any[] = [];

      // Helper function to extract text fields from component attributes
      const getComponentTextFields = (componentUid: string) => {
        const component = components[componentUid];
        if (!component) return [];
        
        const textFields: any[] = [];
        const attributes = (component as any).attributes || {};

        for (const [fieldName, field] of Object.entries(attributes)) {
          const fieldType = (field as any).type;
          
          if (fieldType === 'text' || fieldType === 'richtext' || fieldType === 'string') {
            textFields.push({
              name: fieldName,
              type: fieldType,
              isComponentField: true,
            });
          }
        }

        return textFields;
      };

      for (const [uid, contentType] of Object.entries(contentTypes)) {
        // Skip system content types
        if (uid.startsWith('admin::') || uid.startsWith('plugin::upload') || uid.startsWith('plugin::embeddings')) {
          continue;
        }

        const textFields: any[] = [];
        const attributes = (contentType as any).attributes || {};

        for (const [fieldName, field] of Object.entries(attributes)) {
          const fieldType = (field as any).type;
          
          // Include text, richtext, and string fields
          if (fieldType === 'text' || fieldType === 'richtext' || fieldType === 'string') {
            textFields.push({
              name: fieldName,
              type: fieldType,
            });
          } else if (fieldType === 'component') {
            // Handle component fields
            const componentUid = (field as any).component;
            const componentFields = getComponentTextFields(componentUid);
            
            if (componentFields.length > 0) {
              textFields.push({
                name: fieldName,
                type: 'component',
                isComponent: true,
                componentUid,
                children: componentFields.map(childField => ({
                  ...childField,
                  parentName: fieldName,
                  displayName: `${fieldName}.${childField.name}`,
                })),
              });
            }
          }
        }

        // Only include content types that have text fields
        if (textFields.length > 0) {
          result.push({
            uid,
            displayName: (contentType as any).info?.displayName || uid,
            fields: textFields,
          });
        }
      }

      ctx.body = { data: result };
    } catch (error: any) {
      strapi.log.error('[Embeddings Plugin] Get content types error:', error);
      ctx.throw(500, 'Error fetching content types');
    }
  },

  /**
   * GET /embeddings/queries
   * Get query history with results
   */
  async getQueryHistory(ctx: any) {
    try {
      const { profileId, limit, offset } = ctx.query;
      
      // Validate parameters
      const parsedLimit = limit ? parseInt(limit) : 50;
      const parsedOffset = offset ? parseInt(offset) : 0;
      
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
        return ctx.badRequest('limit must be a number between 1 and 1000');
      }
      
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return ctx.badRequest('offset must be a non-negative number');
      }
      
      const queries = await strapi
        .plugin('embeddings')
        .service('service')
        .getQueryHistory({
          profileId,
          limit: parsedLimit,
          offset: parsedOffset,
        });
      
      ctx.body = {
        data: queries,
        meta: {
          total: queries.length,
          limit: parsedLimit,
          offset: parsedOffset,
        },
      };
    } catch (error: any) {
      strapi.log.error('[Embeddings Plugin] Get query history error:', error);
      ctx.throw(500, 'Error fetching query history');
    }
  },

  /**
   * DELETE /embeddings/profiles/:id
   * Delete a profile
   */
  async deleteProfile(ctx: any) {
    try {
      const { id } = ctx.params;
      
      if (!id) {
        return ctx.badRequest('Profile ID is required');
      }
      
      await strapi
        .plugin('embeddings')
        .service('service')
        .deleteProfile(id);
      
      ctx.body = { data: { success: true } };
    } catch (error: any) {
      strapi.log.error('[Embeddings Plugin] Delete profile error:', error);
      ctx.throw(500, 'Error deleting profile');
    }
  },

  /**
   * POST /embeddings/profiles/:id/reindex
   * Trigger reindexing for a profile
   */
  async reindexProfile(ctx: any) {
    try {
      const { id } = ctx.params;
      
      if (!id) {
        return ctx.badRequest('Profile ID is required');
      }
      
      // Start indexing in the background
      setImmediate(async () => {
        try {
          strapi.log.info(`[Embeddings Plugin] Starting reindexing for profile ${id}`);
          await strapi
            .plugin('embeddings')
            .service('service')
            .indexProfile(id);
        } catch (error: any) {
          strapi.log.error(`[Embeddings Plugin] Error reindexing profile ${id}:`, error);
        }
      });
      
      ctx.body = { 
        data: { 
          success: true,
          message: 'Reindexing job has been started',
          profileId: id
        } 
      };
    } catch (error: any) {
      strapi.log.error('[Embeddings Plugin] Reindex profile error:', error);
      ctx.throw(500, 'Error starting reindex');
    }
  },

  /**
   * GET /embeddings/jobs
   * Get indexing jobs
   */
  async listJobs(ctx: any) {
    try {
      // For now, return empty array
      // This would typically fetch from a job queue or database
      ctx.body = {
        data: [],
        meta: {
          total: 0,
        },
      };
    } catch (error: any) {
      strapi.log.error('[Embeddings Plugin] List jobs error:', error);
      ctx.throw(500, 'Error fetching jobs');
    }
  },

  /**
   * GET /embeddings/logs
   * Get API query logs
   */
  async listLogs(ctx: any) {
    try {
      // For now, return empty array
      // This would typically fetch from a logs table
      ctx.body = {
        data: [],
        meta: {
          total: 0,
        },
      };
    } catch (error: any) {
      strapi.log.error('[Embeddings Plugin] List logs error:', error);
      ctx.throw(500, 'Error fetching logs');
    }
  },
});

export default controller;
