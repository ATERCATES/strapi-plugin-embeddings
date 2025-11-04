import type { Core } from '@strapi/strapi';
import type { Knex } from 'knex';

const TABLE_PROFILE = 'plugin_embeddings_profile';
const TABLE_VECTOR = 'plugin_embeddings_vector';

// Types & Interfaces
interface Profile {
  id: string;
  content_type: string;
  fields: string[];
  enabled: boolean;
  auto_sync: boolean;
  created_at: Date;
  updated_at: Date;
}

interface ProfileData {
  content_type: string;
  fields: string[];
}

interface IndexResult {
  success: boolean;
  totalProcessed: number;
  totalFailed: number;
}

interface ProcessResult {
  processed: number;
  failed: number;
}

// Utility Functions
export const extractContentTypeName = (contentType: string): string => {
  if (contentType.startsWith('api::')) {
    const parts = contentType.split('::')[1];
    return parts.split('.')[0];
  }
  return contentType;
};

export const normalizeContentTypeUID = (contentType: string): string => {
  if (contentType.includes('::')) {
    return contentType;
  }
  const kebabCase = contentType.toLowerCase().replace(/\s+/g, '-');
  return `api::${kebabCase}.${kebabCase}`;
};

const extractComponentNames = (fields: string[]): string[] => {
  const components = new Set<string>();
  
  for (const field of fields) {
    if (field.includes('.')) {
      components.add(field.split('.')[0]);
    }
  }
  
  return Array.from(components);
};

const getDocumentId = (document: any): string => 
  document.documentId || document.id || document.document_id;

// Document Fetching
const fetchDocuments = async (
  strapi: Core.Strapi,
  contentType: string,
  fields: string[],
  publishedOnly: boolean
): Promise<any[]> => {
  const uid = normalizeContentTypeUID(contentType);
  const componentNames = extractComponentNames(fields);

  const options: any = { 
    status: publishedOnly ? 'published' : 'draft'
  };

  if (componentNames.length > 0) {
    options.populate = componentNames;
    strapi.log.debug(`[Embeddings Plugin] Populating components: ${componentNames.join(', ')}`);
  }

  return strapi.documents(uid as any).findMany(options);
};

const fetchDocument = async (
  strapi: Core.Strapi,
  contentType: string,
  documentId: string,
  fields: string[]
): Promise<any | null> => {
  const uid = normalizeContentTypeUID(contentType);
  const componentNames = extractComponentNames(fields);

  const options: any = {};

  if (componentNames.length > 0) {
    options.populate = componentNames;
    strapi.log.debug(`[Embeddings Plugin] Populating components: ${componentNames.join(', ')}`);
  }

  try {
    return await strapi.documents(uid as any).findOne({ documentId, ...options });
  } catch (error: any) {
    strapi.log.error(`[Embeddings Plugin] Error fetching document ${documentId}:`, error.message);
    return null;
  }
};

// Field Processing
const processRegularField = async (params: {
  document: any;
  fieldName: string;
  profile: Profile;
  upsertEmbedding: Function;
  strapi: Core.Strapi;
  published: boolean;
}): Promise<{ success: boolean }> => {
  const { document, fieldName, profile, upsertEmbedding, strapi, published } = params;
  const text = document[fieldName];

  if (!text || typeof text !== 'string') {
    strapi.log.debug(
      `[Embeddings Plugin] Skipping ${document.documentId}:${fieldName} - no text`
    );
    return { success: false };
  }

  await upsertEmbedding({
    contentType: profile.content_type,
    documentId: getDocumentId(document),
    cmpId: null,
    field: fieldName,
    text,
    published,
  });

  strapi.log.debug(
    `[Embeddings Plugin] Generated embedding for ${document.documentId}:${fieldName}`
  );

  return { success: true };
};

const processComponentField = async (params: {
  document: any;
  fieldName: string;
  profile: Profile;
  upsertEmbedding: Function;
  strapi: Core.Strapi;
  published: boolean;
}): Promise<ProcessResult> => {
  const { document, fieldName, profile, upsertEmbedding, strapi, published } = params;
  const [componentField, nestedField] = fieldName.split('.');
  const componentData = document[componentField];

  let processed = 0;
  let failed = 0;

  if (!Array.isArray(componentData) || componentData.length === 0) {
    strapi.log.debug(
      `[Embeddings Plugin] Component field ${componentField} not found or empty for document ${document.documentId}`
    );
    return { processed, failed };
  }

  for (let index = 0; index < componentData.length; index++) {
    const component = componentData[index];
    const text = component[nestedField];
    const cmpId = component.id?.toString();

    if (!text || typeof text !== 'string') {
      strapi.log.debug(
        `[Embeddings Plugin] Skipping ${document.documentId}:${fieldName}[${index}] - no text`
      );
      continue;
    }

    try {
      await upsertEmbedding({
        contentType: profile.content_type,
        documentId: getDocumentId(document),
        cmpId,
        field: fieldName,
        text,
        published,
      });

      processed++;
      strapi.log.debug(
        `[Embeddings Plugin] Generated embedding for ${document.documentId}:${fieldName}[${index}] (cmpId: ${cmpId})`
      );
    } catch (error: any) {
      failed++;
      strapi.log.error(
        `[Embeddings Plugin] Failed to generate embedding for ${document.documentId}:${fieldName}[${index}]:`,
        error.message
      );
    }
  }

  return { processed, failed };
};

// Document Processing
const processDocument = async (params: {
  document: any;
  fields: string[];
  profile: Profile;
  upsertEmbedding: Function;
  strapi: Core.Strapi;
  published: boolean;
}): Promise<ProcessResult> => {
  const { document, fields, profile, upsertEmbedding, strapi, published } = params;
  
  let processed = 0;
  let failed = 0;

  for (const fieldName of fields) {
    try {
      const result = fieldName.includes('.')
        ? await processComponentField({ document, fieldName, profile, upsertEmbedding, strapi, published })
        : await processRegularField({ document, fieldName, profile, upsertEmbedding, strapi, published });

      if ('processed' in result) {
        processed += result.processed;
        failed += result.failed;
      } else if (result.success) {
        processed++;
      } else {
        failed++;
      }
    } catch (error: any) {
      failed++;
      strapi.log.error(
        `[Embeddings Plugin] Error processing field ${fieldName} for document ${document.documentId}:`,
        error.message
      );
    }
  }

  return { processed, failed };
};


// Services
export const createProfilesService = ({ strapi }: { strapi: Core.Strapi }) => {
  const knex: Knex = strapi.db.connection;
  
  const getUpsertEmbedding = () => {
    return strapi.plugin('embeddings').service('service').upsertEmbedding;
  };

  return {
    async getProfiles(): Promise<Profile[]> {
      const profiles = await knex(TABLE_PROFILE)
        .select('*')
        .orderBy('created_at', 'desc');
      
      return profiles.map(p => ({
        ...p,
        fields: typeof p.fields === 'string' ? JSON.parse(p.fields) : p.fields
      })) as Profile[];
    },

    async getActiveProfiles(): Promise<Profile[]> {
      const profiles = await knex(TABLE_PROFILE)
        .select('*')
        .where({ enabled: true })
        .orderBy('created_at', 'desc');
      
      return profiles.map(p => ({
        ...p,
        fields: typeof p.fields === 'string' ? JSON.parse(p.fields) : p.fields
      })) as Profile[];
    },

    async getProfile(id: string): Promise<Profile | null> {
      const profile = await knex(TABLE_PROFILE).where({ id }).first();
      if (!profile) return null;
      
      return {
        ...profile,
        fields: typeof profile.fields === 'string' ? JSON.parse(profile.fields) : profile.fields
      } as Profile;
    },

    async getProfileByContentType(contentType: string): Promise<Profile | null> {
      const profile = await knex(TABLE_PROFILE).where({ content_type: contentType }).first();
      if (!profile) return null;
      
      return {
        ...profile,
        fields: typeof profile.fields === 'string' ? JSON.parse(profile.fields) : profile.fields
      } as Profile;
    },

    async createProfile(data: ProfileData): Promise<Profile> {
      const simpleName = extractContentTypeName(data.content_type);
      const existing = await this.getProfileByContentType(simpleName);
      
      if (existing) {
        throw new Error(`Profile for content type "${simpleName}" already exists`);
      }

      const cleanFields = Array.isArray(data.fields) ? [...data.fields] : [];

      const [profile] = await knex(TABLE_PROFILE)
        .insert({
          content_type: simpleName,
          fields: JSON.stringify(cleanFields),
          enabled: true,
          auto_sync: true,
        })
        .returning('*');

      return {
        ...profile,
        fields: typeof profile.fields === 'string' ? JSON.parse(profile.fields) : profile.fields
      } as Profile;
    },

    async deleteProfile(id: string): Promise<{ success: boolean }> {
      await knex.transaction(async (trx) => {
        const profile = await trx(TABLE_PROFILE).where({ id }).first();
        
        if (!profile) {
          throw new Error(`Profile ${id} not found`);
        }

        await trx(TABLE_VECTOR).where({ content_type: profile.content_type }).del();
        await trx(TABLE_PROFILE).where({ id }).del();

        strapi.log.debug(`[Embeddings Plugin] Profile ${id} (${profile.content_type}) deleted successfully`);
      });

      return { success: true };
    },

    async updateProfile(id: string, data: { enabled?: boolean; auto_sync?: boolean }): Promise<Profile | null> {
      const updateData: any = { updated_at: knex.fn.now() };
      
      if (data.enabled !== undefined) {
        updateData.enabled = data.enabled;
      }
      
      if (data.auto_sync !== undefined) {
        updateData.auto_sync = data.auto_sync;
      }

      const [profile] = await knex(TABLE_PROFILE)
        .where({ id })
        .update(updateData)
        .returning('*');

      if (!profile) {
        return null;
      }

      strapi.log.debug(`[Embeddings Plugin] Profile ${id} updated: enabled=${profile.enabled}, auto_sync=${profile.auto_sync}`);

      return {
        ...profile,
        fields: typeof profile.fields === 'string' ? JSON.parse(profile.fields) : profile.fields
      } as Profile;
    },

    async indexProfile(contentType: string, _unused?: boolean): Promise<IndexResult> {
      strapi.log.debug(`[Embeddings Plugin] Starting indexing for content type ${contentType}`);

      const profile = await this.getProfileByContentType(contentType);

      if (!profile) {
        throw new Error(`Profile for content type ${contentType} not found`);
      }

      if (profile.fields.length === 0) {
        throw new Error(`Profile for ${contentType} has no fields configured`);
      }

      const upsertEmbedding = getUpsertEmbedding();
      const documents = await fetchDocuments(strapi, profile.content_type, profile.fields, false);
      
      strapi.log.debug(`[Embeddings Plugin] Found ${documents.length} documents for ${profile.content_type}`);

      let totalProcessed = 0;
      let totalFailed = 0;

      for (const document of documents) {
        const result = await processDocument({
          document,
          fields: profile.fields,
          profile,
          upsertEmbedding,
          strapi,
          published: false,
        });
        
        totalProcessed += result.processed;
        totalFailed += result.failed;
      }

      strapi.log.debug(
        `[Embeddings Plugin] Indexing complete for ${contentType}. ` +
        `Processed: ${totalProcessed}, Failed: ${totalFailed}`
      );

      return { success: true, totalProcessed, totalFailed };
    },

    async indexDocument(contentType: string, documentId: string): Promise<IndexResult> {
      strapi.log.debug(`[Embeddings Plugin] Starting indexing for document ${documentId} of type ${contentType}`);

      const profile = await this.getProfileByContentType(contentType);

      if (!profile) {
        strapi.log.debug(`[Embeddings Plugin] No profile found for content type ${contentType}, skipping`);
        return { success: true, totalProcessed: 0, totalFailed: 0 };
      }

      if (profile.fields.length === 0) {
        throw new Error(`Profile for ${contentType} has no fields configured`);
      }

      const service = strapi.plugin('embeddings').service('service');
      
      // First, delete all draft embeddings for this document to clean up removed components
      const { deletedCount } = await service.deleteDraftEmbeddings({ documentId });
      strapi.log.debug(`[Embeddings Plugin] Deleted ${deletedCount} existing draft embeddings for ${documentId}`);

      const upsertEmbedding = getUpsertEmbedding();
      const document = await fetchDocument(strapi, profile.content_type, documentId, profile.fields);

      if (!document) {
        strapi.log.warn(`[Embeddings Plugin] Document ${documentId} not found`);
        return { success: false, totalProcessed: 0, totalFailed: 1 };
      }

      const result = await processDocument({
        document,
        fields: profile.fields,
        profile,
        upsertEmbedding,
        strapi,
        published: false,
      });

      strapi.log.debug(
        `[Embeddings Plugin] Indexing complete for document ${documentId}. ` +
        `Processed: ${result.processed}, Failed: ${result.failed}`
      );

      return { 
        success: result.failed === 0, 
        totalProcessed: result.processed, 
        totalFailed: result.failed 
      };
    },
  };
};
