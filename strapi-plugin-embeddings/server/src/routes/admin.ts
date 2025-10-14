export default [
  {
    method: 'GET',
    path: '/profiles',
    handler: 'controller.listProfiles',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/profiles/:id',
    handler: 'controller.getProfile',
    config: {
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/profiles',
    handler: 'controller.createProfile',
    config: {
      policies: [],
    },
  },
  {
    method: 'DELETE',
    path: '/profiles/:id',
    handler: 'controller.deleteProfile',
    config: {
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/profiles/:id/reindex',
    handler: 'controller.reindexProfile',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/jobs',
    handler: 'controller.listJobs',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/logs',
    handler: 'controller.listLogs',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/content-types',
    handler: 'controller.getContentTypes',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/queries',
    handler: 'controller.getQueryHistory',
    config: {
      policies: [],
    },
  },
];
