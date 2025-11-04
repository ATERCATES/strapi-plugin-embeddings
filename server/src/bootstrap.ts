import type { Core } from '@strapi/strapi';
import type { Knex } from 'knex';

const PLUGIN_NAME = 'Embeddings Plugin';
const VECTOR_DIMENSION = 1536;
const HNSW_THRESHOLD = 5000;

// Setup pgvector extension
async function setupPgvectorExtension(knex: Knex, strapi: Core.Strapi): Promise<void> {
  try {
    await knex.raw('CREATE EXTENSION IF NOT EXISTS vector');
    
    const { rows } = await knex.raw(
      "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') AS exists"
    );
    
    if (!rows[0].exists) {
      throw new Error('pgvector extension not available. Ensure PostgreSQL has pgvector installed.');
    }
    
    await knex.raw('SELECT \'[1,2,3]\'::vector(3)');
    strapi.log.debug('Extension pgvector extension ready');
  } catch (error: any) {
    strapi.log.error(`[${PLUGIN_NAME}] pgvector setup failed:`, error.message);
    throw new Error(`pgvector error: ${error.message}`);
  }
}

// Create HNSW index if threshold exceeded
async function ensureHNSWIndex(knex: Knex, strapi: Core.Strapi): Promise<void> {
  const indexName = 'idx_vector_embedding_hnsw_cosine';
  const tableName = 'plugin_embeddings_vector';
  
  const { rows } = await knex.raw(
    `SELECT EXISTS(SELECT 1 FROM pg_indexes WHERE tablename = '${tableName}' AND indexname = '${indexName}') AS exists`
  );
  
  if (rows[0].exists) {
    return;
  }
  
  const countResult = await knex.raw(`SELECT COUNT(*) FROM ${tableName}`);
  const rowCount = parseInt(countResult.rows[0].count, 10);
  
  if (rowCount > HNSW_THRESHOLD) {
    await knex.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS ${indexName}
      ON ${tableName}
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)
    `);
    strapi.log.debug(`[${PLUGIN_NAME}] HNSW index created on ${tableName}`);
  }
}

// Create profiles table
async function createProfilesTable(knex: Knex): Promise<void> {
  const tableName = 'plugin_embeddings_profile';
  
  if (await knex.schema.hasTable(tableName)) {
    return;
  }
  
  await knex.schema.createTable(tableName, (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('content_type', 255).unique().notNullable();
    table.jsonb('fields').notNullable();
    table.boolean('enabled').notNullable().defaultTo(true);
    table.boolean('auto_sync').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index('content_type', 'idx_profile_content_type');
  });
}

async function createVectorsTable(knex: Knex, strapi: Core.Strapi): Promise<void> {
  const tableName = 'plugin_embeddings_vector';
  
  if (await knex.schema.hasTable(tableName)) {
    await ensureHNSWIndex(knex, strapi);
    return;
  }

  await knex.schema.createTable(tableName, (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('content_type', 255).notNullable().references('content_type').inTable('plugin_embeddings_profile').onDelete('CASCADE');
    table.string('document_id', 255).notNullable();
    table.string('cmp_id', 255).nullable();
    table.string('field', 255).notNullable();
    table.text('content').notNullable();
    table.specificType('embedding', `vector(${VECTOR_DIMENSION})`).notNullable();
    table.boolean('published').notNullable().defaultTo(false);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    // Performance indexes for frequent operations
    table.index(['document_id'], 'idx_vector_document');
    table.index(['document_id', 'published'], 'idx_vector_doc_state');
    table.index(['content_type'], 'idx_vector_content_type');
  });

  // Create UNIQUE index for ON CONFLICT upsert (CRITICAL for performance)
  await knex.raw(
    `CREATE UNIQUE INDEX idx_vector_upsert 
    ON ${tableName} (content_type, document_id, field, published, COALESCE(cmp_id, ''))
    NULLS DISTINCT`
  );

  strapi.log.debug(`[${PLUGIN_NAME}] Vectors table created with optimized indexes. HNSW index will be created after ${HNSW_THRESHOLD}+ rows`);
}

// Initialize database tables
async function initializeDatabase(knex: Knex, strapi: Core.Strapi): Promise<void> {
  await setupPgvectorExtension(knex, strapi);
  await createProfilesTable(knex);
  await createVectorsTable(knex, strapi);
}

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }): Promise<void> => {
  try {
    await initializeDatabase(strapi.db.connection, strapi);
    strapi.log.debug(`[${PLUGIN_NAME}] Bootstrap completed successfully`);
  } catch (error: any) {
    strapi.log.error(`[${PLUGIN_NAME}] Bootstrap failed:`, error);
    throw error;
  }
};

export default bootstrap;
