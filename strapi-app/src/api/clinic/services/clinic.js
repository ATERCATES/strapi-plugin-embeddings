'use strict';

/**
 * clinic service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::clinic.clinic');
