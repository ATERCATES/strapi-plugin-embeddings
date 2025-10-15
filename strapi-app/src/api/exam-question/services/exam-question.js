'use strict';

/**
 * exam-question service
 */

const { createCoreService } = require('@strapi/strapi').factories;

const modelId = 'api::exam-question.exam-question';
module.exports = createCoreService(modelId, ({ strapi }) =>  ({
  async find(...args) {  
    if (!args[0].randomSort) {
      // No random sort, call the default core controller
      return super.find(...args);
    }

    // Get only the ids of the questions that match the query
    const queryIds = await super.find({ ...args[0], fields: ['id'], populate: [] });

    // Get as many ids as 'randomSort' indicates, from the ones that match the query
    const ids = (await strapi.db.connection
      .select('id')
      .from(strapi.getModel(modelId).collectionName)
      .whereIn('id', queryIds.results.map(it => it.id))
      .orderByRaw('RANDOM()')
      .limit(args[0].randomSort)
    ).map(it => it.id);

    // Return the original requested fields of the random ids found.
    return super.find({ ...args[0], filters: { id: { $in: ids } } });
  }
}));