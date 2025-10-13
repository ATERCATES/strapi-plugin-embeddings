#!/bin/bash

# Quick development setup script for strapi-plugin-embeddings

set -e

echo "🚀 Starting development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start PostgreSQL with pgvector
echo "📦 Starting PostgreSQL with pgvector..."
docker compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Build plugin if needed
if [ ! -d "strapi-plugin-embeddings/dist" ]; then
    echo "🔨 Building plugin..."
    cd strapi-plugin-embeddings
    npm install
    npm run build
    cd ..
fi

# Start test app
echo "🎯 Starting Strapi test app..."
cd test-app

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing test app dependencies..."
    npm install
fi

echo ""
echo "✅ Development environment ready!"
echo ""
echo "📝 Next steps:"
echo "   1. Set your OPENAI_API_KEY in test-app/.env"
echo "   2. Open http://localhost:1337/admin to create admin user"
echo "   3. Test API endpoints at http://localhost:1337/api/embeddings"
echo ""
echo "💡 For plugin development:"
echo "   Terminal 1: cd strapi-plugin-embeddings && npm run watch"
echo "   Terminal 2: cd test-app && npm run develop"
echo ""

# Start in develop mode
npm run develop
