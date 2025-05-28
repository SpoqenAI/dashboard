#!/bin/bash
set -euo pipefail

# Development Setup Script for Spoqen Dashboard
# This script ensures consistent port configuration for email verification

echo "🚀 Setting up Spoqen Dashboard development environment..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found. Please create it first."
    exit 1
fi

# Check if NEXT_PUBLIC_DEV_PORT is set
if ! grep -q "^NEXT_PUBLIC_DEV_PORT=" .env.local; then
    echo "📝 Adding NEXT_PUBLIC_DEV_PORT to .env.local..."
    echo "NEXT_PUBLIC_DEV_PORT=3000" >> .env.local
else
    echo "✅ NEXT_PUBLIC_DEV_PORT already configured"
fi

# Check if Supabase environment variables are set
if ! grep -q "^NEXT_PUBLIC_SUPABASE_URL=" .env.local; then
    echo "⚠️  Warning: NEXT_PUBLIC_SUPABASE_URL not found in .env.local"
    echo "   Please add your Supabase project URL"
fi

if ! grep -q "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local; then
    echo "⚠️  Warning: NEXT_PUBLIC_SUPABASE_ANON_KEY not found in .env.local"
    echo "   Please add your Supabase anonymous key"
fi

echo ""
echo "🎯 Development Tips:"
echo "   1. Always use the same port for development (3000)"
echo "   2. If you change ports, clear browser storage and restart"
echo "   3. Email verification links are tied to the origin they were created from"
echo ""
echo "✅ Development environment setup complete!"
echo "   Run 'npm run dev' to start the development server" 