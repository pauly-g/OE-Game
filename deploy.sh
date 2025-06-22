#!/bin/bash

# Order Editing Game - Deployment Script
echo "🎮 Starting deployment of Order Editing Game..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Build the project locally first
echo "🔨 Building project locally..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix build errors before deploying."
    exit 1
fi

echo "✅ Build successful!"

# Test the build locally
echo "🧪 Testing build locally..."
echo "Starting preview server... (Press Ctrl+C to continue with deployment)"
npm run preview &
PREVIEW_PID=$!

# Wait for user input
read -p "Test the game at http://localhost:4173 and press Enter to continue with deployment..."

# Kill preview server
kill $PREVIEW_PID 2>/dev/null

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

if [ $? -eq 0 ]; then
    echo "🎉 Deployment successful!"
    echo ""
    echo "📋 Post-deployment checklist:"
    echo "1. Set environment variables in Vercel dashboard"
    echo "2. Configure custom domain in Vercel"
    echo "3. Add domain to Firebase authorized domains"
    echo "4. Test HubSpot integration"
    echo "5. Test game functionality"
    echo ""
    echo "📖 See DEPLOYMENT_GUIDE.md for detailed instructions"
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi 