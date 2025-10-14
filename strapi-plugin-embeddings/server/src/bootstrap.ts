import type { Core } from '@strapi/strapi';

/**
 * Creates the database tables for the embeddings plugin
 */
async function createTables(knex: any, strapi: Core.Strapi) {
  // Setup pgvector extension
  try {
    await knex.raw('CREATE EXTENSION IF NOT EXISTS vector');
    const hasExtension = await knex.raw(`
      SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') AS exists
    `);
    if (!hasExtension.rows[0].exists) {
      throw new Error('pgvector extension not available. Ensure PostgreSQL has pgvector installed.');
    }
    await knex.raw('SELECT \'[1,2,3]\'::vector(3)');
    strapi.log.info('[Embeddings Plugin] pgvector ready');
  } catch (error: any) {
    strapi.log.error('[Embeddings Plugin] pgvector setup failed:', error.message);
    throw new Error(`pgvector error: ${error.message}`);
  }

  // Create profiles table
  if (!(await knex.schema.hasTable('plugin_embedding_profiles'))) {
    await knex.schema.createTable('plugin_embedding_profiles', (table: any) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name', 255).notNullable();
      table.string('slug', 255).unique().notNullable();
      table.text('description');
      table.boolean('enabled').defaultTo(true);
      table.boolean('auto_sync').defaultTo(true);
      table.timestamps(true, true);
    });
  }

  // Create profile_fields table
  if (!(await knex.schema.hasTable('plugin_embedding_profile_fields'))) {
    await knex.schema.createTable('plugin_embedding_profile_fields', (table: any) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('profile_id').notNullable()
        .references('id').inTable('plugin_embedding_profiles').onDelete('CASCADE');
      table.string('content_type', 255).notNullable();
      table.string('field_name', 255).notNullable();
      table.boolean('enabled').defaultTo(true);
      table.timestamps(true, true);
      table.unique(['profile_id', 'content_type', 'field_name']);
    });
  }

  // Create vectors table
  if (!(await knex.schema.hasTable('plugin_embeddings_vectors'))) {
    try {
      await knex.raw(`
        CREATE TABLE plugin_embeddings_vectors (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          profile_id uuid NOT NULL REFERENCES plugin_embedding_profiles(id) ON DELETE CASCADE,
          content_type varchar(255) NOT NULL,
          content_id varchar(255) NOT NULL,
          field_name varchar(255) NOT NULL,
          locale varchar(10),
          embedding vector(1536) NOT NULL,
          metadata jsonb DEFAULT '{}'::jsonb,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now(),
          UNIQUE(profile_id, content_type, content_id, field_name, locale)
        )
      `);
    } catch (error: any) {
      throw new Error(`Cannot create vectors table: ${error.message}`);
    }
    await knex.raw('CREATE INDEX idx_vectors_profile ON plugin_embeddings_vectors(profile_id)');
    await knex.raw('CREATE INDEX idx_vectors_content ON plugin_embeddings_vectors(content_type, content_id)');
    await knex.raw('CREATE INDEX idx_vectors_content_type ON plugin_embeddings_vectors(content_type)');
    await knex.raw('CREATE INDEX idx_vectors_locale ON plugin_embeddings_vectors(locale) WHERE locale IS NOT NULL');
    await knex.raw('CREATE INDEX idx_vectors_metadata ON plugin_embeddings_vectors USING GIN (metadata)');
    strapi.log.info('[Embeddings Plugin] Vectors table created. Create HNSW index after loading data.');
  } else {
    const hasHNSWIndex = await knex.raw(`
      SELECT EXISTS(SELECT 1 FROM pg_indexes WHERE tablename = 'plugin_embeddings_vectors' AND indexname = 'idx_vectors_embedding_hnsw_cosine') AS exists
    `);
    if (!hasHNSWIndex.rows[0].exists) {
      const countResult = await knex.raw('SELECT COUNT(*) FROM plugin_embeddings_vectors');
      const rowCount = parseInt(countResult.rows[0].count);
      if (rowCount > 1000) {
        await knex.raw(`
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vectors_embedding_hnsw_cosine 
          ON plugin_embeddings_vectors 
          USING hnsw (embedding vector_cosine_ops)
          WITH (m = 16, ef_construction = 64)
        `);
        strapi.log.info('[Embeddings Plugin] HNSW index created');
      }
    }
  }

  // Create jobs table
  if (!(await knex.schema.hasTable('plugin_embedding_jobs'))) {
    await knex.schema.createTable('plugin_embedding_jobs', (table: any) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('profile_id').references('id').inTable('plugin_embedding_profiles').onDelete('SET NULL');
      table.string('type', 50).notNullable();
      table.string('status', 50).notNullable().defaultTo('pending');
      table.integer('total_items');
      table.integer('processed_items').defaultTo(0);
      table.integer('failed_items').defaultTo(0);
      table.jsonb('params').defaultTo('{}');
      table.text('error_message');
      table.timestamp('started_at');
      table.timestamp('finished_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
    await knex.raw('CREATE INDEX idx_jobs_profile ON plugin_embedding_jobs(profile_id)');
    await knex.raw('CREATE INDEX idx_jobs_status ON plugin_embedding_jobs(status)');
    await knex.raw('CREATE INDEX idx_jobs_created ON plugin_embedding_jobs(created_at DESC)');
  }

  // Create queries table for search history
  if (!(await knex.schema.hasTable('plugin_embedding_queries'))) {
    await knex.schema.createTable('plugin_embedding_queries', (table: any) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('profile_id').references('id').inTable('plugin_embedding_profiles').onDelete('SET NULL');
      table.text('query_text');
      table.integer('k').defaultTo(10);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
    await knex.raw('CREATE INDEX idx_queries_profile ON plugin_embedding_queries(profile_id)');
    await knex.raw('CREATE INDEX idx_queries_created ON plugin_embedding_queries(created_at DESC)');
  }

  // Create query_results table for detailed search results
  if (!(await knex.schema.hasTable('plugin_embedding_query_results'))) {
    await knex.schema.createTable('plugin_embedding_query_results', (table: any) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('query_id').notNullable()
        .references('id').inTable('plugin_embedding_queries').onDelete('CASCADE');
      table.string('content_type', 255).notNullable();
      table.string('content_id', 255).notNullable();
      table.string('field_name', 255).notNullable();
      table.string('locale', 10);
      table.decimal('similarity_score', 10, 6).notNullable();
      table.jsonb('metadata').defaultTo('{}');
      table.integer('position').notNullable();
    });
    await knex.raw('CREATE INDEX idx_query_results_query ON plugin_embedding_query_results(query_id)');
    await knex.raw('CREATE INDEX idx_query_results_content ON plugin_embedding_query_results(content_type, content_id)');
  }

  strapi.log.info('[Embeddings Plugin] Tables created');
}

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  try {
    await createTables(strapi.db.connection, strapi);
    strapi.log.info('[Embeddings Plugin] Bootstrap completed');
  } catch (error) {
    strapi.log.error('[Embeddings Plugin] Bootstrap failed:', error);
    throw error;
  }
};

export default bootstrap;
