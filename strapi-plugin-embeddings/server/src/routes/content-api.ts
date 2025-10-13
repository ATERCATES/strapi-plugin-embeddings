export default [
  {
    method: 'POST',
    path: '/query',
    handler: 'controller.query',
    config: {
      policies: [],
      auth: false,
    },
  },
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
    method: 'POST',
    path: '/generate',
    handler: 'controller.generateEmbedding',
    config: {
      policies: [],
    },
  },
];
