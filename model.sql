// # definition.dbml — strapi-plugin-embeddings
// Versión: 1.0
// Autor: Javier (cliente)
// Fecha: 2025-10-10

/////////////////////////////////////////////////////
// Tablas principales
/////////////////////////////////////////////////////

Table plugin_embedding_profiles {
  id uuid [pk, note: "Primary key"]
  name varchar(255) [not null]
  slug varchar(255) [unique, not null]
  description text
  enabled boolean [default: true]
  auto_sync boolean [default: true]
  created_at timestamptz [default: `now()`]
  updated_at timestamptz [default: `now()`]
}

/////////////////////////////////////////////////////

Table plugin_embedding_profile_fields {
  id uuid [pk]
  profile_id uuid [not null, ref: > plugin_embedding_profiles.id]
  content_type varchar(255) [not null, note: "e.g. api::article.article"]
  field_name varchar(255) [not null, note: "e.g. title, body"]
  enabled boolean [default: true]
  created_at timestamptz [default: `now()`]
  updated_at timestamptz [default: `now()`]

  indexes {
    (profile_id, content_type, field_name) [unique]
  }
}

/////////////////////////////////////////////////////

Table plugin_embeddings_vectors {
  id uuid [pk]
  profile_id uuid [not null, ref: > plugin_embedding_profiles.id]

  content_type varchar(255) [not null]
  content_id varchar(255) [not null, note: "ID como string para compatibilidad"]
  field_name varchar(255) [not null]
  locale varchar(10)

  embedding vector(1536) [not null, note: "pgvector extension"]
  metadata jsonb [default: `'{}'::jsonb`]

  created_at timestamptz [default: `now()`]
  updated_at timestamptz [default: `now()`]

  indexes {
    (profile_id, content_type, content_id, field_name, locale) [unique]
    profile_id
    (content_type, content_id)
    content_type
  }
}

/////////////////////////////////////////////////////

Table plugin_embedding_jobs {
  id uuid [pk]
  profile_id uuid [ref: > plugin_embedding_profiles.id]

  type varchar(50) [not null, note: "'reindex' | 'sync' | 'backfill' | 'cleanup'"]
  status varchar(50) [not null, default: 'pending', note: "'pending' | 'running' | 'completed' | 'failed' | 'cancelled'"]

  total_items integer
  processed_items integer [default: 0]
  failed_items integer [default: 0]

  params jsonb [default: `'{}'::jsonb`]
  error_message text

  started_at timestamptz
  finished_at timestamptz
  created_at timestamptz [default: `now()`]

  indexes {
    profile_id
    status
    (created_at)
  }
}

/////////////////////////////////////////////////////
// Historial de consultas vectoriales
/////////////////////////////////////////////////////

Table plugin_embedding_queries {
  id uuid [pk]
  profile_id uuid [ref: > plugin_embedding_profiles.id, note: "Perfil usado para esta consulta"]
  query_text text [note: "Texto original de la consulta, si aplica"]
  k integer [default: 10, note: "Número de resultados solicitados"]
  created_at timestamptz [default: `now()`]
  indexes {
    profile_id
    (created_at)
  }
}

/////////////////////////////////////////////////////

Table plugin_embedding_query_results {
  id uuid [pk]
  query_id uuid [not null, ref: > plugin_embedding_queries.id]
  
  content_type varchar(255) [not null, note: "Tipo de contenido devuelto"]
  content_id varchar(255) [not null, note: "ID del contenido devuelto"]
  field_name varchar(255) [not null, note: "Campo que generó el embedding"]
  locale varchar(10) [note: "Idioma del resultado, si aplica"]
  
  similarity_score decimal(10,6) [not null, note: "Score de similitud devuelto por la búsqueda vectorial"]
  metadata jsonb [default: `'{}'::jsonb`, note: "Información adicional de la respuesta, p.ej. snippet, longitud, hash"]
  
  position integer [not null, note: "Posición del resultado en el ranking"]
  
  indexes {
    query_id
    (content_type, content_id)
  }
}