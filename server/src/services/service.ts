import type { Core } from '@strapi/strapi';
import {
  createOpenAIService,
  createVectorsService,
  createSearchService,
  createProfilesService,
} from './modules';

const service = ({ strapi }: { strapi: Core.Strapi }) => {
  // Initialize all service modules
  const openAIService = createOpenAIService({ strapi });
  const vectorsService = createVectorsService({ strapi });
  const searchService = createSearchService({ strapi });
  const profilesService = createProfilesService({ strapi });

  return {
    // OpenAI functionality
    getOpenAIClient: openAIService.getOpenAIClient.bind(openAIService),
    generateEmbedding: openAIService.generateEmbedding.bind(openAIService),

    // Vector operations
    upsertEmbedding: vectorsService.upsertEmbedding.bind(vectorsService),
    deleteEmbedding: vectorsService.deleteEmbedding.bind(vectorsService),
    deleteDraftEmbeddings: vectorsService.deleteDraftEmbeddings.bind(vectorsService),
    deletePublishedEmbeddings: vectorsService.deletePublishedEmbeddings.bind(vectorsService),
    duplicateDraftToPublished: vectorsService.duplicateDraftToPublished.bind(vectorsService),

    // Semantic search
    semanticSearchByProfile: searchService.semanticSearchByProfile.bind(searchService),
    semanticSearchAll: searchService.semanticSearchAll.bind(searchService),

    // Profile management
    getProfiles: profilesService.getProfiles.bind(profilesService),
    getProfile: profilesService.getProfile.bind(profilesService),
    getActiveProfiles: profilesService.getActiveProfiles.bind(profilesService),
    getProfileByContentType: profilesService.getProfileByContentType.bind(profilesService),
    createProfile: profilesService.createProfile.bind(profilesService),
    updateProfile: profilesService.updateProfile.bind(profilesService),
    deleteProfile: profilesService.deleteProfile.bind(profilesService),
    indexProfile: profilesService.indexProfile.bind(profilesService),
    indexDocument: profilesService.indexDocument.bind(profilesService),
  };
};

export default service;
