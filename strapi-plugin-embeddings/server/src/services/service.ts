import type { Core } from '@strapi/strapi';
import {
  createOpenAIService,
  createVectorsService,
  createSearchService,
  createProfilesService,
  createLoggingService,
} from './modules';

const service = ({ strapi }: { strapi: Core.Strapi }) => {
  // Initialize all service modules
  const openAIService = createOpenAIService({ strapi });
  const vectorsService = createVectorsService({ strapi });
  const searchService = createSearchService({ strapi });
  const profilesService = createProfilesService({ strapi });
  const loggingService = createLoggingService({ strapi });

  return {
    // OpenAI functionality
    getOpenAIClient: openAIService.getOpenAIClient.bind(openAIService),
    validateEmbeddingDimensions: openAIService.validateEmbeddingDimensions.bind(openAIService),
    generateEmbedding: openAIService.generateEmbedding.bind(openAIService),

    // Vector operations
    upsertEmbedding: vectorsService.upsertEmbedding.bind(vectorsService),
    deleteEmbedding: vectorsService.deleteEmbedding.bind(vectorsService),

    // Semantic search
    semanticSearch: searchService.semanticSearch.bind(searchService),

    // Profile management
    getProfiles: profilesService.getProfiles.bind(profilesService),
    getProfile: profilesService.getProfile.bind(profilesService),
    createProfile: profilesService.createProfile.bind(profilesService),
    deleteProfile: profilesService.deleteProfile.bind(profilesService),
    indexProfile: profilesService.indexProfile.bind(profilesService),

    // Query logging
    logSearchQuery: loggingService.logSearchQuery.bind(loggingService),
    logSearchResults: loggingService.logSearchResults.bind(loggingService),
    getQueryHistory: loggingService.getQueryHistory.bind(loggingService),
  };
};

export default service;
