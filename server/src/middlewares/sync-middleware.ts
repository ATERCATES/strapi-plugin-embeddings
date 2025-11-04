import type { Core } from '@strapi/strapi';
import { extractContentTypeName } from '../services/modules/profiles';

// Document Service Middleware for automatic embedding synchronization
export const createSyncMiddleware = ({ strapi }: { strapi: Core.Strapi }) => {
  return async (context: any, next: () => Promise<any>) => {
    const result = await next();

    const syncActions = ['create', 'update', 'delete', 'publish', 'unpublish'];
    if (!syncActions.includes(context.action)) {
      return result;
    }

    const contentType = extractContentTypeName(context.uid);
    const documentId = result?.documentId || context.params?.documentId;

    if (!documentId) {
      return result;
    }

    // Process async to not block the request
    setImmediate(async () => {
      try {
        await handleSync(strapi, {
          action: context.action,
          contentType,
          documentId,
        });
      } catch (error: any) {
        strapi.log.error(`[Embeddings] Sync failed for ${contentType}:${documentId}: ${error.message}`);
      }
    });

    return result;
  };
};

async function handleSync(
  strapi: Core.Strapi,
  params: {
    action: string;
    contentType: string;
    documentId: string;
  }
) {
  const { action, contentType, documentId } = params;
  const service = strapi.plugin('embeddings').service('service');

  const profile = await service.getProfileByContentType(contentType);
  
  // Skip if no profile exists, profile is disabled, or auto_sync is disabled
  if (!profile || !profile.enabled || !profile.auto_sync) {
    return;
  }

  switch (action) {
    case 'delete':
      await service.deleteEmbedding({ documentId });
      strapi.log.debug(`[Embeddings] Deleted all embeddings for ${documentId}`);
      break;

    case 'publish':
      await service.indexDocument(contentType, documentId);
      await service.duplicateDraftToPublished({ documentId });
      strapi.log.debug(`[Embeddings] Published embeddings for ${documentId}`);
      break;

    case 'unpublish':
      await service.deletePublishedEmbeddings({ documentId });
      strapi.log.debug(`[Embeddings] Unpublished embeddings for ${documentId}`);
      break;
  }
}
