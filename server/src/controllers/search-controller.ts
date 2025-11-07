import type { Core } from '@strapi/strapi';
import { normalizeContentTypeUID } from '../services/modules/profiles';

const calculateScoreStats = (results: any[]) => {
  if (!results.length) return { min: 0, max: 0, avg: 0 };
  const scores = results.map((r: any) => r.similarityScore);
  return {
    min: Math.min(...scores),
    max: Math.max(...scores),
    avg: scores.reduce((sum, s) => sum + s, 0) / scores.length,
  };
};

const normalizeEmbeddingFields = (embedding_fields: any): string[] => {
  if (!embedding_fields) return [];
  
  if (typeof embedding_fields === 'string') {
    return [embedding_fields];
  }
  
  if (Array.isArray(embedding_fields)) {
    return embedding_fields.filter(field => typeof field === 'string');
  }
  
  return [];
};

const validateParams = (params: any) => {
  if (!params.query || typeof params.query !== 'string') {
    return {'error': 'The query parameter is required'};
  }

  if (params.top_k && (params.top_k <= 0 || params.top_k > 1000)) {
    return {'error': 'The top_k parameter must be between 1 and 1000'};
  }

  if (params.min_score && (params.min_score < 0 || params.min_score > 1)) {
    return {'error': 'The min_score parameter must be between 0 and 1'};
  }

  if (params.embedding_fields) {
    const normalized = normalizeEmbeddingFields(params.embedding_fields);
    if (normalized.length === 0) {
      return {'error': 'embedding_fields must be a string or array of strings'};
    }
  }

  return null;
};

export const createSearchController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async searchByContentType(ctx: any) {
    const contentType = ctx.params.contentType;
    const query = ctx.query;

    if (!query.query) {
      return ctx.badRequest('query parameter is required');
    }

    const service = strapi.plugin('embeddings').service('service');
    const profile = await service.getProfileByContentType(contentType);

    if (!profile) {
      return ctx.notFound(`No profile found for content type: ${contentType}`);
    }

    if (!profile.enabled) {
      return ctx.forbidden(`Profile for content type ${contentType} is disabled`);
    }

    const validationError = validateParams(query);
    if (validationError) {
      return ctx.badRequest(validationError.error);
    }

    const normalizedFields = normalizeEmbeddingFields(query.embedding_fields);
    if (query.embedding_fields && normalizedFields.length > 0) {
      const invalidFields = normalizedFields.filter(field => !profile.fields.includes(field));
      if (invalidFields.length > 0) {
        return ctx.badRequest(`Invalid embedding_fields: ${invalidFields.join(', ')}. Available fields are: ${profile.fields.join(', ')}`);
      }
    }

    const searchParams = {
      query: query.query,
      contentType,
      top_k: query.top_k ?? 10,
      min_score: query.min_score ?? 0,
      embedding_fields: normalizedFields,
    };

    const searchResults = await service.semanticSearchByProfile(searchParams);
    const documentIds = searchResults.map((result: any) => result.documentId);

    let documents = [];

    if (documentIds.length > 0) {
      const uid = normalizeContentTypeUID(profile.content_type);
      documents = await strapi.documents(uid as any).findMany({
          filters: { documentId: { $in: documentIds } },
          status: 'published',
          populate: query.populate,
          fields: query.fields,
          limit: query.limit,
          start: query.start,
        })
    };

    return {
      data: documents,
      meta: {
        total: documents.length,
        score: documents.length > 0 ? calculateScoreStats(searchResults) : undefined,
      },
    };
  },

  async search(ctx: any) {
    const query = ctx.query;

    const validationError = validateParams(query);
    if (validationError) {
      return ctx.badRequest(validationError.error);
    }

    if (query.populate !== undefined && (query.populate !== 'true' && query.populate !== 'false')) {
      return ctx.badRequest('populate parameter must be boolean');
    }

    const service = strapi.plugin('embeddings').service('service');
    const searchResults = await service.semanticSearchAll({
      query: query.query,
      top_k: query.top_k ?? 10,
      min_score: query.min_score ?? 0,
    });

    const documentIds = searchResults.map((result: any) => result.documentId);
    const uniqueContentTypes = Array.from(
      new Set(searchResults.map(result => result.contentType))
    );

    let documents = [];
    const activeProfiles = await service.getActiveProfiles();

    for (const contentType of uniqueContentTypes) {
      const uid = normalizeContentTypeUID(String(contentType));
      if (!activeProfiles.find((p: any) => p.content_type === contentType)) {
        continue;
      }
      const contentTypeDocuments = await strapi.documents(uid as any).findMany({
        filters: { documentId: { $in: documentIds } },
        status: 'published',
        populate: query.populate && query.populate == 'true' ? '*' : undefined,
      });
      documents.push(...contentTypeDocuments);
    }

    return {
      data: documents,
      meta: {
        total: documents.length,
        score: documents.length > 0 ? calculateScoreStats(searchResults) : undefined,
      },
    };
  }
});

export default createSearchController;