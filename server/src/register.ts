import type { Core } from '@strapi/strapi';
import { createSyncMiddleware } from './middlewares/sync-middleware';

const register = async ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.debug('[Embeddings Plugin] Registering plugin...');
  
  // Register Document Service Middleware for automatic embedding synchronization
  strapi.documents.use(createSyncMiddleware({ strapi }));
  
  strapi.log.debug('[Embeddings Plugin] Sync middleware registered successfully');
  
  // The actual table creation will happen in bootstrap after DB is ready
};

export default register;
