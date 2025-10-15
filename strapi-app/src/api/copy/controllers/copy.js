'use strict';

/**
 * copy controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::copy.copy');