# definition.md — strapi-plugin-embeddings

> **Versión:** 1.0
> **Autor:** Javier (cliente)
> **Fecha:** 2025-10-10

---

## Resumen ejecutivo

`strapi-plugin-embeddings` es un plugin para Strapi v5 que automatiza la generación, almacenamiento, indexación y búsqueda de vectores/embeddings asociados a campos de los Content Types. Su objetivo es proporcionar búsqueda semántica, y enriquecimiento semántico directamente desde la UI de Strapi y mediante una API REST privada.

El plugin usa como proveedor de embeddings OpenAI, usa indexación con `pgvector` (HNSW), sincronización dinámica de content types, y control granular desde la UI (habilitar campo por campo, reindexado)

## Objetivos

* Facilitar la integración de embeddings en proyectos Strapi sin tocar lógica de negocio externalizada.
* Permitir búsquedas semánticas rápidas y filtros combinados (SQL + vector).
* Ofrecer control desde la UI para habilitar/deshabilitar generación automática por campo o content type.
* Soportar operaciones de reindexado, batch sync y sincronización incremental.
* Poder usar UI cómoda para crear contenido y tenerla disponible para el uso de modelos
* Sincronización activa con el contenido, (on_delete, on_update, on_insert)

## Principales casos de uso

1. **Búsqueda semántica:** encontrar contenido similar por significado en lugar de sólo texto.

## Diseño de alto nivel

Arquitectura de componentes:

* **UI (panel de Strapi)**

  * Sección independiente donde administrar los que se van a llmar `Embedding Profiles` que van a estar formados por 1 o mas campos de 1 o varios Content Types
  * Panel por `Embedding Profile`: habilitar/inhabilitar, seleccionar campos a vectorizar, opción de reindexar.
  * Monitor de tareas / logs de sincronización.
  * Logs de consultas

* **Storage / DB**

  * Postgres con extensión `pgvector`.
  * Opciones de almacenamiento:

    1. **Columna vector en la tabla original** (recomendado para 1 vector por registro y simplicidad).
    2. **Tabla dedicada `plugin_embeddings_vectors`** (recomendado para múltiples vectores por registro o versionado).

## Modelo de datos (propuesta)

### Esquema de tablas

El diseño usa 4 tablas principales para separar responsabilidades y mantener flexibilidad:

#### 1. `plugin_embedding_profiles` — Configuración de perfiles

Define perfiles de embedding con configuración del provider y métricas.

```sql
CREATE TABLE plugin_embedding_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  slug varchar(255) UNIQUE NOT NULL,
  description text,
  enabled boolean DEFAULT true,
  
  -- Configuración del provider
  provider varchar(50) NOT NULL DEFAULT 'openai',
  embedding_dimension integer NOT NULL DEFAULT 1536,
  distance_metric varchar(20) NOT NULL DEFAULT 'cosine', -- 'cosine' | 'l2' | 'dot'
  
  -- Opciones
  auto_sync boolean DEFAULT true, -- sincronizar automáticamente on create/update
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_profiles_enabled ON plugin_embedding_profiles(enabled);
```

#### 2. `plugin_embedding_profile_fields` — Campos asociados a cada perfil

Relaciona un perfil con los content-types y campos específicos que debe vectorizar.

```sql
CREATE TABLE plugin_embedding_profile_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES plugin_embedding_profiles(id) ON DELETE CASCADE,
  
  -- Identificación del campo
  content_type varchar(255) NOT NULL, -- e.g. 'api::article.article'
  field_name varchar(255) NOT NULL,   -- e.g. 'title', 'body'
  
  -- Configuración opcional por campo
  enabled boolean DEFAULT true,
  weight decimal(3,2) DEFAULT 1.0, -- peso para combinar múltiples campos (futuro)
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Un perfil no puede tener el mismo campo duplicado
  UNIQUE(profile_id, content_type, field_name)
);

CREATE INDEX idx_profile_fields_profile ON plugin_embedding_profile_fields(profile_id);
CREATE INDEX idx_profile_fields_content ON plugin_embedding_profile_fields(content_type);
```

#### 3. `plugin_embeddings_vectors` — Almacenamiento de vectores

Almacena los embeddings generados, referenciando el perfil que lo generó.

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE plugin_embeddings_vectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES plugin_embedding_profiles(id) ON DELETE CASCADE,
  
  -- Referencia al contenido
  content_type varchar(255) NOT NULL,
  content_id varchar(255) NOT NULL, -- ID como string para compatibilidad
  field_name varchar(255) NOT NULL,
  locale varchar(10),               -- soporte i18n: 'es', 'en', null
  
  -- Vector y metadatos
  embedding vector(1536) NOT NULL,  -- ajustar dimensión según provider
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Evitar duplicados: un vector por (profile, content, field, locale)
  UNIQUE(profile_id, content_type, content_id, field_name, COALESCE(locale, ''))
);

-- Índices para queries frecuentes
CREATE INDEX idx_vectors_profile ON plugin_embeddings_vectors(profile_id);
CREATE INDEX idx_vectors_content ON plugin_embeddings_vectors(content_type, content_id);
CREATE INDEX idx_vectors_content_type ON plugin_embeddings_vectors(content_type);

-- Índice vectorial HNSW para búsqueda semántica (cosine)
CREATE INDEX idx_vectors_embedding_hnsw_cosine 
  ON plugin_embeddings_vectors USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 200);

-- Opcional: índices para otras métricas
-- CREATE INDEX idx_vectors_embedding_hnsw_l2 
--   ON plugin_embeddings_vectors USING hnsw (embedding vector_l2_ops);
-- CREATE INDEX idx_vectors_embedding_hnsw_ip 
--   ON plugin_embeddings_vectors USING hnsw (embedding vector_ip_ops);
```

#### 4. `plugin_embedding_jobs` — Control de tareas de sincronización

Rastrea operaciones de reindexado, sincronización y backfill.

```sql
CREATE TABLE plugin_embedding_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES plugin_embedding_profiles(id) ON DELETE SET NULL,
  
  type varchar(50) NOT NULL, -- 'reindex' | 'sync' | 'backfill' | 'cleanup'
  status varchar(50) NOT NULL DEFAULT 'pending', -- 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  
  -- Progreso
  total_items integer,
  processed_items integer DEFAULT 0,
  failed_items integer DEFAULT 0,
  
  -- Configuración y resultado
  params jsonb DEFAULT '{}'::jsonb,
  error_message text,
  
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_jobs_profile ON plugin_embedding_jobs(profile_id);
CREATE INDEX idx_jobs_status ON plugin_embedding_jobs(status);
CREATE INDEX idx_jobs_created ON plugin_embedding_jobs(created_at DESC);
```

### Ejemplo de uso

#### Crear un perfil con múltiples campos

```sql
-- 1. Crear el perfil
INSERT INTO plugin_embedding_profiles (name, slug, provider, embedding_dimension, distance_metric)
VALUES ('Blog Content Search', 'blog-content-search', 'openai', 1536, 'cosine')
RETURNING id; -- Supongamos que retorna: 'profile-uuid-123'

-- 2. Asociar campos al perfil
INSERT INTO plugin_embedding_profile_fields (profile_id, content_type, field_name) VALUES
  ('profile-uuid-123', 'api::article.article', 'title'),
  ('profile-uuid-123', 'api::article.article', 'body'),
  ('profile-uuid-123', 'api::author.author', 'bio'),
  ('profile-uuid-123', 'api::comment.comment', 'content');
```

#### Insertar/actualizar un embedding

```sql
-- Upsert de un vector
INSERT INTO plugin_embeddings_vectors 
  (profile_id, content_type, content_id, field_name, locale, embedding, metadata)
VALUES 
  ('profile-uuid-123', 'api::article.article', '42', 'body', 'es', '[0.1,0.2,...]'::vector, '{"text_length": 1234}')
ON CONFLICT (profile_id, content_type, content_id, field_name, COALESCE(locale, ''))
DO UPDATE SET
  embedding = EXCLUDED.embedding,
  metadata = EXCLUDED.metadata,
  updated_at = now();
```

#### Consultar campos de un perfil

```sql
-- Obtener todos los content-types y campos de un perfil
SELECT content_type, field_name, enabled
FROM plugin_embedding_profile_fields
WHERE profile_id = 'profile-uuid-123' AND enabled = true;
```

#### Búsqueda semántica

```sql
-- Buscar los 10 más similares en un perfil específico
SELECT 
  v.content_type,
  v.content_id,
  v.field_name,
  v.metadata,
  1 - (v.embedding <=> '[0.1,0.2,...]'::vector) AS similarity_score
FROM plugin_embeddings_vectors v
WHERE v.profile_id = 'profile-uuid-123'
  AND v.content_type = 'api::article.article' -- filtro opcional
ORDER BY v.embedding <=> '[0.1,0.2,...]'::vector ASC
LIMIT 10;
```

### Notas de diseño

* **Separación de responsabilidades**: Los perfiles definen "qué" vectorizar, `profile_fields` especifica "dónde" (content-types/campos), y `vectors` almacena los embeddings.
* **Flexibilidad**: Un perfil puede incluir campos de múltiples content-types. Puedes crear diferentes perfiles para diferentes casos de uso (búsqueda general, recomendaciones, etc.).
* **Cascada**: Al eliminar un perfil, se eliminan automáticamente sus campos asociados (`profile_fields`) y vectores (`vectors`).
* **Locale**: Soporta contenido multiidioma; un mismo content_id + field puede tener múltiples vectores (uno por locale).
* **Metadata**: Campo JSONB flexible para almacenar información adicional (snippet, longitud, hash, timestamps del provider, etc.).
* **Jobs**: Permite rastrear operaciones largas (reindexado completo, sincronización batch) desde la UI.

### Índices vectoriales

* **HNSW** es recomendado para mejor balance velocidad/precisión.
* Parámetros por defecto: `m=16`, `ef_construction=200`. Ajustar según dataset.
* Crear un índice por métrica de distancia que uses (cosine es el más común).
* Para datasets > 1M vectores, considerar tuning de parámetros o IVFFlat.


## API del plugin

Rutas REST propuestas:

* `POST /api/embeddings/query` — ejecuta una búsqueda vectorial. Body:

  ```json
  {
    "vector": [0.1,0.2,...],
    "k": 10,
    "content_type": "api::article.article", // opcional
    "filters": {"category":"books"}, // opcional, mergeable con SQL
    "distance": "cosine" // "l2" | "cosine" | "dot"
  }
  ```