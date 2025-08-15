#!/bin/bash

echo "🧪 Testing development environment setup..."

# Test Node.js
echo "📋 Testing Node.js..."
node_version=$(node --version)
echo "Node.js version: $node_version"
[[ $node_version == v18* ]] || { echo "❌ Node.js 18.x required"; exit 1; }
echo "✅ Node.js version check passed"

# Test npm
echo "📋 Testing npm..."
npm --version || { echo "❌ npm not found"; exit 1; }
echo "✅ npm check passed"

# Test Docker
echo "📋 Testing Docker..."
docker --version || { echo "❌ Docker not installed"; exit 1; }
docker-compose --version || { echo "❌ Docker Compose not installed"; exit 1; }
echo "✅ Docker check passed"

# Test Git
echo "📋 Testing Git..."
git --version || { echo "❌ Git not installed"; exit 1; }
echo "✅ Git check passed"

# Test project structure
echo "📋 Testing project structure..."
required_dirs=("frontend" "backend" "database" "docs" "scripts" ".github" ".vscode")
for dir in "${required_dirs[@]}"; do
    if [ ! -d "$dir" ]; then
        echo "❌ Missing directory: $dir"
        exit 1
    fi
done
echo "✅ Project structure check passed"

# Test configuration files
echo "📋 Testing configuration files..."
required_files=(".gitignore" ".env.example" "package.json" ".eslintrc.js" ".prettierrc")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing file: $file"
        exit 1
    fi
done
echo "✅ Configuration files check passed"

# Test package.json files
echo "📋 Testing package.json files..."
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Missing frontend/package.json"
    exit 1
fi
if [ ! -f "backend/package.json" ]; then
    echo "❌ Missing backend/package.json"
    exit 1
fi
echo "✅ Package.json files check passed"

# Test TypeScript configurations
echo "📋 Testing TypeScript configurations..."
if [ ! -f "frontend/tsconfig.json" ]; then
    echo "❌ Missing frontend/tsconfig.json"
    exit 1
fi
if [ ! -f "backend/tsconfig.json" ]; then
    echo "❌ Missing backend/tsconfig.json"
    exit 1
fi
echo "✅ TypeScript configurations check passed"

# Test VS Code configuration
echo "📋 Testing VS Code configuration..."
if [ ! -f ".vscode/settings.json" ]; then
    echo "❌ Missing .vscode/settings.json"
    exit 1
fi
if [ ! -f ".vscode/extensions.json" ]; then
    echo "❌ Missing .vscode/extensions.json"
    exit 1
fi
echo "✅ VS Code configuration check passed"

echo ""
echo "🎉 Environment setup test passed!"
echo "✅ All required tools and configurations are in place"
echo ""
echo "You can now:"
echo "1. Run 'npm run setup' to install dependencies"
echo "2. Start development with 'npm run dev'"