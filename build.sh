#!/bin/bash

# Build script for DocGen

set -e  # Exit on error

echo "🔨 Building DocGen..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this from the project root."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Run TypeScript compiler check
echo "🔍 Type checking..."
npm run typecheck
echo ""

# Build the project
echo "📦 Building..."
npm run build
echo ""

# Check build output
if [ ! -d "dist" ]; then
    echo "❌ Build failed: dist/ directory not created"
    exit 1
fi

if [ ! -f "dist/cli/index.js" ]; then
    echo "❌ Build failed: CLI entry point not found"
    exit 1
fi

echo "✅ Build complete!"
echo ""
echo "📚 DocGen is ready to use:"
echo "  node dist/cli/index.js --help"
echo ""
echo "Or make it globally available:"
echo "  npm link"
echo ""
