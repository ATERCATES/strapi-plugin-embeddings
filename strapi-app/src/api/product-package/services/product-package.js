'use strict';

/**
 * product-package service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::product-package.product-package');
