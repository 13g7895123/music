#!/bin/bash

echo "🚀 Setting up YouTube Music Player development environment..."

# Check Node.js version
echo "📋 Checking Node.js version..."
node_version=$(node --version)
echo "Node.js version: $node_version"

if [[ $node_version != v18* ]]; then
    echo "❌ Node.js 18.x is required. Current version: $node_version"
    echo "Please install Node.js 18.x LTS from https://nodejs.org/"
    exit 1
fi

# Check npm version
echo "📋 Checking npm version..."
npm --version || { echo "❌ npm not found"; exit 1; }

# Check Docker
echo "📋 Checking Docker..."
docker --version || { echo "❌ Docker not installed"; exit 1; }
docker-compose --version || { echo "❌ Docker Compose not installed"; exit 1; }

# Check Git
echo "📋 Checking Git..."
git --version || { echo "❌ Git not installed"; exit 1; }

echo "✅ All prerequisites are installed!"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Copy environment file
echo "🔧 Setting up environment variables..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from .env.example"
    echo "⚠️  Please update .env with your actual configuration values"
else
    echo "ℹ️  .env file already exists"
fi

# Generate Prisma client
echo "🗄️  Setting up database client..."
cd backend
npx prisma generate
cd ..

# Set up Git hooks
echo "🔗 Setting up Git hooks..."
npx husky install

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Update .env file with your configuration"
echo "2. Start Docker services: npm run docker:up"
echo "3. Run database migrations: cd backend && npm run db:migrate"
echo "4. Start development servers: npm run dev"
echo ""
echo "For more information, see README.md"