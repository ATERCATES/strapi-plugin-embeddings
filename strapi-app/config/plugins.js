const crypto = require('crypto');

module.exports = ({ env }) => ({
  upload: {
    enabled: true,
    config: {
      provider: '@strapi-community/strapi-provider-upload-google-cloud-storage',
      providerOptions: {
        serviceAccount: env.json('STORAGE_SERVICE_ACCOUNT') || env.json('SERVICE_ACCOUNT'),
        bucketName: env('GCS_BUCKET_NAME'),
        basePath: env('GCS_BASE_PATH'),
        baseUrl: env('GCS_BASE_URL')
      }
    },
  },
  graphql: {
    enabled: true,
    config: {
      endpoint: '/graphql',
      shadowCRUD: true,
      depthLimit: 15,
      amountLimit: 100,
      apolloServer: {
        tracing: false,
      },
      federation: true
    },
  },
  'users-permissions': {
    config: {
      jwtSecret: env('JWT_SECRET') || crypto.randomBytes(16).toString('base64'),
    }
  }
});

module.exports = {
  embeddings: {
    enabled: true,
    resolve: '../strapi-plugin-embeddings',
  },
};
