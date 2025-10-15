'use strict';

/**
 * web-summary service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::web-summary.web-summary');
