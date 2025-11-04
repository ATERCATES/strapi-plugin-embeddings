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
    method: 'GET',
    path: '/search',
    handler: 'search-controller.search',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/:contentType/search',
    handler: 'search-controller.searchByContentType',
    config: {
      policies: [],
    },
  },
];
