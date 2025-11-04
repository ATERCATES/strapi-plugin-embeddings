import type { Core } from '@strapi/strapi';
import { normalizeContentTypeUID } from '../services/modules/profiles';

// Perform complete indexing workflow
async function performCompleteIndexing(
  strapi: Core.Strapi, 
  contentType: string, 
  context: 'create' | 'reindex'
): Promise<void> {
  strapi.log.debug(`[Embeddings] Starting ${context} workflow for ${contentType}`);
  
  // Step 1: Index as drafts
  await strapi.plugin('embeddings').service('service').indexProfile(
    contentType,
    false
  );
  
  // Step 2: Duplicate drafts to published
  const service = strapi.plugin('embeddings').service('service');
  // use normalized UID when calling Strapi document API
  const uid = normalizeContentTypeUID(contentType);
  const documents = await strapi.documents(uid as any).findMany({ status: 'draft' });
  
  for (const document of documents) {
    await service.duplicateDraftToPublished({ 
      documentId: document.documentId,
    });
  }
  
  strapi.log.debug(`[Embeddings] ${context} workflow completed for ${contentType}`);
}

// Start async indexing workflow
function startAsyncIndexing(
  strapi: Core.Strapi,
  contentType: string,
  context: 'create' | 'reindex'
): void {
  setImmediate(async () => {
    try {
      await performCompleteIndexing(strapi, contentType, context);
    } catch (error: any) {
      strapi.log.error(`[Embeddings] ${context} failed for ${contentType}:`, error);
    }
  });
}

const profileController = ({ strapi }: { strapi: Core.Strapi }) => ({
// GET /embeddings/profiles
  // List all profiles
  async listProfiles(ctx: any) {
    try {
      const profiles = await strapi
        .plugin('embeddings')
        .service('service')
        .getProfiles();
      
      ctx.body = {
        data: profiles,
        meta: { total: profiles.length },
      };
    } catch (error: any) {
      strapi.log.error('[Embeddings] List profiles error:', error);
      ctx.throw(500, 'Error fetching profiles');
    }
  },

// GET /embeddings/profiles/:id
  // Get profile by ID
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
      strapi.log.error('[Embeddings] Get profile error:', error);
      ctx.throw(500, 'Error fetching profile');
    }
  },

// POST /embeddings/profiles
  // Create a new profile
  async createProfile(ctx: any) {
    try {
      const data = ctx.request.body;
      
      if (!data.content_type || typeof data.content_type !== 'string') {
        return ctx.badRequest('content_type is required');
      }
      
      if (!data.fields || !Array.isArray(data.fields) || data.fields.length === 0) {
        return ctx.badRequest('fields is required and must be a non-empty array');
      }
      
      for (const field of data.fields) {
        if (typeof field !== 'string') {
          return ctx.badRequest('Each field must be a string');
        }
      }
      
      const profile = await strapi
        .plugin('embeddings')
        .service('service')
        .createProfile({
          content_type: data.content_type,
          fields: data.fields,
          auto_sync: data.auto_sync !== false,
        });
      
      // Start initial indexing and publishing
      startAsyncIndexing(strapi, String(profile.content_type), 'create');
      
      ctx.body = { data: profile };
      ctx.status = 201;
    } catch (error: any) {
      strapi.log.error('[Embeddings] Create profile error:', error);
      ctx.throw(500, error.message || 'Error creating profile');
    }
  },

// DELETE /embeddings/profiles/:id
  // Delete profile
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
      strapi.log.error('[Embeddings] Delete profile error:', error);
      ctx.throw(500, 'Error deleting profile');
    }
  },

// POST /embeddings/profiles/:id/reindex
  // Trigger reindexing (both draft and published)
  async reindexProfile(ctx: any) {
    try {
      const { id } = ctx.params;
      
      if (!id) {
        return ctx.badRequest('Profile ID is required');
      }

      // Get profile first to obtain content_type
      const profile = await strapi
        .plugin('embeddings')
        .service('service')
        .getProfile(id);
      
      if (!profile) {
        return ctx.notFound('Profile not found');
      }
      
      // Start reindexing and publishing
      startAsyncIndexing(strapi, profile.content_type, 'reindex');
      
      ctx.body = { 
        data: { 
          success: true,
          message: 'Reindexing and publishing started',
          profileId: id,
          contentType: profile.content_type,
        } 
      };
    } catch (error: any) {
      strapi.log.error('[Embeddings] Reindex error:', error);
      ctx.throw(500, 'Error starting reindex');
    }
  },

// PATCH /embeddings/profiles/:id
  // Update profile settings (enabled, auto_sync)
  async updateProfile(ctx: any) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body;
      
      if (!id) {
        return ctx.badRequest('Profile ID is required');
      }

      // Validate that at least one field is being updated
      if (data.enabled === undefined && data.auto_sync === undefined) {
        return ctx.badRequest('At least one field (enabled or auto_sync) must be provided');
      }

      const profile = await strapi
        .plugin('embeddings')
        .service('service')
        .updateProfile(id, data);
      
      if (!profile) {
        return ctx.notFound('Profile not found');
      }
      
      ctx.body = { data: profile };
    } catch (error: any) {
      strapi.log.error('[Embeddings] Update profile error:', error);
      ctx.throw(500, error.message || 'Error updating profile');
    }
  },
});

export default profileController;
