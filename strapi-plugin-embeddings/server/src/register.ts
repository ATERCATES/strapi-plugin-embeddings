import type { Core } from '@strapi/strapi';

const register = async ({ strapi }: { strapi: Core.Strapi }) => {
  // Register pgvector extension and create migration
  strapi.log.info('[Embeddings Plugin] Registering plugin...');
  
  // The actual table creation will happen in bootstrap after DB is ready
};

export default register;
