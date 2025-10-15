'use strict';

/**
 * lesson-question service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::lesson-question.lesson-question');