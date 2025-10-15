'use strict';

/**
 * next-action router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::next-action.next-action');
