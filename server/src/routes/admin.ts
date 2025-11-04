export default [
  {
    method: 'GET',
    path: '/profiles',
    handler: 'profile-controller.listProfiles',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/profiles/:id',
    handler: 'profile-controller.getProfile',
    config: {
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/profiles',
    handler: 'profile-controller.createProfile',
    config: {
      policies: [],
    },
  },
  {
    method: 'DELETE',
    path: '/profiles/:id',
    handler: 'profile-controller.deleteProfile',
    config: {
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/profiles/:id/reindex',
    handler: 'profile-controller.reindexProfile',
    config: {
      policies: [],
    },
  },
  {
    method: 'PUT',
    path: '/profiles/:id',
    handler: 'profile-controller.updateProfile',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/content-types',
    handler: 'system-controller.getContentTypes',
    config: {
      policies: [],
    },
  },
];
