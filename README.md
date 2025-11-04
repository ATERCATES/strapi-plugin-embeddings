# Strapi Plugin Embeddings

Un plugin para **Strapi v5** que integra **embeddings de IA y búsqueda semántica** usando OpenAI y pgvector.

## ¿Qué hace?

Este plugin permite:

- **Generar embeddings**: Convierte el contenido de tus tipos de contenido en Strapi a vectores numéricos mediante la API de OpenAI
- **Búsqueda semántica**: Realiza búsquedas por similitud semántica, no solo coincidencias exactas
- **Gestión de perfiles**: Configura qué campos y tipos de contenido deben ser convertidos a embeddings
- **Procesamiento en background**: Sistema de trabajos asincronos para generar y actualizar embeddings
- **Monitoreo y logging**: Registro completo de todas las operaciones para debugging y auditoría

### Configuración inicial

1. **Instalar el plugin**:
```bash
npm i strapi-plugin-embeddings
```

2. **Archivo `config/plugins.ts` o `config/plugins.js`**:
```typescript
embeddings: {
  enabled: true,
},
```

3. **Variables de entorno (`.env`)**:
```
OPENAI_API_KEY=sk-...
DATABASE_CLIENT=postgres
```

4. **El plugin se configura a través del panel de administración de Strapi**.

## Características principales

### 📊 Admin Panel
- Interfaz React intuitiva para gestionar perfiles de embeddings
- Visualización de trabajos en progreso
- Historial de logs de operaciones
- Estadísticas de vectores generados

### 🔍 Búsqueda Semántica
- Búsquedas basadas en similitud vectorial
- Indexación HNSW para rendimiento optimizado en grandes volúmenes
- Soporte para búsquedas por relevancia

### ⚙️ Configuración
- Perfiles personalizables por tipo de contenido
- Selección de campos específicos para embeddings
- Sincronización automática o manual

### 🗄️ Base de datos
- Utiliza PostgreSQL con extensión pgvector
- Almacenamiento eficiente de vectores (1536 dimensiones)
- Índices optimizados para búsquedas rápidas

## Stack tecnológico

- **Backend**: Node.js, TypeScript, Strapi v5
- **Frontend**: React 18, TypeScript, Strapi Design System
- **Base de datos**: PostgreSQL + pgvector
- **IA**: OpenAI API para generación de embeddings

## Instalación y uso

Requiere:
- Strapi v5
- PostgreSQL con pgvector instalado
- Clave API de OpenAI

## Licencia

MIT
