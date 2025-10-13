import type { Core } from '@strapi/strapi';

/**
 * Creates the database tables for the embeddings plugin
 */
async function createTables(knex: any, strapi: Core.Strapi) {
  const hasExtension = await knex.raw(`
    SELECT EXISTS(
      SELECT 1 FROM pg_extension WHERE extname = 'vector'
    ) AS exists
  `);
  
  if (!hasExtension.rows[0].exists) {
    strapi.log.info('[Embeddings Plugin] Creating pgvector extension...');
    await knex.raw('CREATE EXTENSION IF NOT EXISTS vector');
  }

  // 1. Create profiles table
  const hasProfiles = await knex.schema.hasTable('plugin_embedding_profiles');
  if (!hasProfiles) {
    strapi.log.info('[Embeddings Plugin] Creating plugin_embedding_profiles table...');
    await knex.schema.createTable('plugin_embedding_profiles', (table: any) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name', 255).notNullable();
      table.string('slug', 255).unique().notNullable();
      table.text('description');
      table.boolean('enabled').defaultTo(true);
      
      // Provider config
      table.string('provider', 50).notNullable().defaultTo('openai');
      table.integer('embedding_dimension').notNullable().defaultTo(1536);
      table.string('distance_metric', 20).notNullable().defaultTo('cosine');
      
      // Options
      table.boolean('auto_sync').defaultTo(true);
      
      table.timestamps(true, true);
    });

    await knex.raw('CREATE INDEX idx_profiles_enabled ON plugin_embedding_profiles(enabled)');
  }

  // 2. Create profile_fields table
  const hasProfileFields = await knex.schema.hasTable('plugin_embedding_profile_fields');
  if (!hasProfileFields) {
    strapi.log.info('[Embeddings Plugin] Creating plugin_embedding_profile_fields table...');
    await knex.schema.createTable('plugin_embedding_profile_fields', (table: any) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('profile_id').notNullable()
        .references('id').inTable('plugin_embedding_profiles').onDelete('CASCADE');
      
      table.string('content_type', 255).notNullable();
      table.string('field_name', 255).notNullable();
      
      table.boolean('enabled').defaultTo(true);
      table.decimal('weight', 3, 2).defaultTo(1.0);
      
      table.timestamps(true, true);
      
      table.unique(['profile_id', 'content_type', 'field_name']);
    });

    await knex.raw('CREATE INDEX idx_profile_fields_profile ON plugin_embedding_profile_fields(profile_id)');
    await knex.raw('CREATE INDEX idx_profile_fields_content ON plugin_embedding_profile_fields(content_type)');
  }

  // 3. Create vectors table
  const hasVectors = await knex.schema.hasTable('plugin_embeddings_vectors');
  if (!hasVectors) {
    strapi.log.info('[Embeddings Plugin] Creating plugin_embeddings_vectors table...');
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
        UNIQUE(profile_id, content_type, content_id, field_name, COALESCE(locale, ''))
      )
    `);

    // Create indexes (but NOT the HNSW index yet - create it after initial data load)
    await knex.raw('CREATE INDEX idx_vectors_profile ON plugin_embeddings_vectors(profile_id)');
    await knex.raw('CREATE INDEX idx_vectors_content ON plugin_embeddings_vectors(content_type, content_id)');
    await knex.raw('CREATE INDEX idx_vectors_content_type ON plugin_embeddings_vectors(content_type)');
    await knex.raw('CREATE INDEX idx_vectors_locale ON plugin_embeddings_vectors(locale) WHERE locale IS NOT NULL');
    await knex.raw('CREATE INDEX idx_vectors_metadata ON plugin_embeddings_vectors USING GIN (metadata)');
    
    strapi.log.info('[Embeddings Plugin] Vector table created. Create HNSW index after loading data for better performance.');
    strapi.log.info('[Embeddings Plugin] Run this SQL when ready: CREATE INDEX CONCURRENTLY idx_vectors_embedding_hnsw_cosine ON plugin_embeddings_vectors USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);');
  } else {
    // Check if HNSW index exists
    const hasHNSWIndex = await knex.raw(`
      SELECT EXISTS(
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'plugin_embeddings_vectors' 
        AND indexname = 'idx_vectors_embedding_hnsw_cosine'
      ) AS exists
    `);
    
    if (!hasHNSWIndex.rows[0].exists) {
      // Get row count to decide on index parameters
      const countResult = await knex.raw('SELECT COUNT(*) FROM plugin_embeddings_vectors');
      const rowCount = parseInt(countResult.rows[0].count);
      
      if (rowCount > 1000) {
        strapi.log.info(`[Embeddings Plugin] Found ${rowCount} vectors. Creating HNSW index (this may take a while)...`);
        // For production, use higher ef_construction for better recall
        await knex.raw(`
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vectors_embedding_hnsw_cosine 
          ON plugin_embeddings_vectors 
          USING hnsw (embedding vector_cosine_ops)
          WITH (m = 16, ef_construction = 64)
        `);
        strapi.log.info('[Embeddings Plugin] HNSW index created successfully!');
      } else {
        strapi.log.info(`[Embeddings Plugin] Only ${rowCount} vectors found. Skipping HNSW index creation (create manually when you have more data).`);
      }
    }
  }

  // 4. Create jobs table
  const hasJobs = await knex.schema.hasTable('plugin_embedding_jobs');
  if (!hasJobs) {
    strapi.log.info('[Embeddings Plugin] Creating plugin_embedding_jobs table...');
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

  strapi.log.info('[Embeddings Plugin] All tables created successfully!');
}

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info('[Embeddings Plugin] Bootstrapping plugin...');
  
  try {
    const knex = strapi.db.connection;
    
    // Create tables
    await createTables(knex, strapi);
    
    strapi.log.info('[Embeddings Plugin] Bootstrap completed successfully!');
  } catch (error) {
    strapi.log.error('[Embeddings Plugin] Bootstrap error:', error);
    throw error;
  }
};

export default bootstrap;
