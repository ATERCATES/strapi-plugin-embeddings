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
      
      // Validate optional fields
      if (data.provider && !['openai'].includes(data.provider)) {
        return ctx.badRequest('provider must be: openai');
      }
      
      if (data.distance_metric && !['cosine', 'l2', 'dot'].includes(data.distance_metric)) {
        return ctx.badRequest('distance_metric must be one of: cosine, l2, dot');
      }
      
      if (data.embedding_dimension && (typeof data.embedding_dimension !== 'number' || data.embedding_dimension < 1)) {
        return ctx.badRequest('embedding_dimension must be a positive number');
      }
      
      const profile = await strapi
        .plugin('embeddings')
        .service('service')
        .createProfile(data);
      
      ctx.body = { data: profile };
      ctx.status = 201;
    } catch (error: any) {
      strapi.log.error('[Embeddings Plugin] Create profile error:', error);
      
      // Handle unique constraint violations
      if (error.code === '23505') {
        return ctx.conflict('A profile with this slug already exists');
      }
      
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
});

export default controller;
