'use strict';

/**
 * next-action service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::next-action.next-action');
