# Strapi Plugin Embeddings

Un plugin para **Strapi v5** que integra **embeddings de IA y búsqueda semántica** usando OpenAI y pgvector.

## ¿Qué hace?

Este plugin permite:

- **Generar embeddings**: Convierte el contenido de tus tipos de contenido en Strapi a vectores numéricos mediante la API de OpenAI
- **Búsqueda semántica**: Realiza búsquedas por similitud semántica, no solo coincidencias exactas
- **Gestión de perfiles**: Configura qué campos y tipos de contenido deben ser convertidos a embeddings
- **Procesamiento en background**: Sistema de trabajos asincronos para generar y actualizar embeddings

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

### Requiere:

- Strapi v5
- PostgreSQL con pgvector instalado
- Clave API de OpenAI

## Documentación de la API

Puedes consultar la documentación completa de la API en: https://atercates.github.io/strapi-plugin-embeddings

## Licencia

MIT
