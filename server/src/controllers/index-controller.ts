import type { Core } from '@strapi/strapi';
import { normalizeContentTypeUID } from '../services/modules/profiles';

const indexController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async indexDocument(ctx: any) {
    const { contentType, documentId } = ctx.params;

    if (!contentType) {
      return ctx.badRequest('contentType parameter is required');
    }

    if (!documentId) {
      return ctx.badRequest('documentId parameter is required');
    }

    const service = strapi.plugin('embeddings').service('service');
    const profile = await service.getProfileByContentType(contentType);

    if (!profile) {
      return ctx.notFound(`No profile found for content type: ${contentType}`);
    }

    if (!profile.enabled) {
      return ctx.forbidden(`Profile for content type ${contentType} is disabled`);
    }

    try {
      const uid = normalizeContentTypeUID(contentType);
      const document = await strapi.documents(uid as any).findOne({ documentId });

      if (!document) {
        return ctx.notFound(`Document ${documentId} not found for content type ${contentType}`);
      }

      // Index the document as draft
      const indexResult = await service.indexDocument(contentType, documentId);

      if (!indexResult.success) {
        strapi.log.error(`[Embeddings] Failed to index document ${documentId}`);
        return ctx.badRequest(`Failed to index document ${documentId}`);
      }

      // Duplicate draft embeddings to published (same as publish action)
      await service.duplicateDraftToPublished({ documentId });

      strapi.log.debug(`[Embeddings] Manually indexed and published embeddings for ${documentId}`);

      ctx.body = {
        data: {
          documentId,
          contentType,
          indexed: true,
          totalProcessed: indexResult.totalProcessed,
          totalFailed: indexResult.totalFailed,
        },
        meta: {
          message: `Document ${documentId} has been indexed successfully`,
        },
      };
    } catch (error: any) {
      strapi.log.error(`[Embeddings] Error indexing document ${documentId}:`, error);
      ctx.throw(500, `Error indexing document: ${error.message}`);
    }
  },
});

export default indexController;
