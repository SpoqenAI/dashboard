#!/bin/bash

# Simple ngrok setup for testing Paddle webhooks
# Make sure your Next.js app is running on port 3000 first

echo "Setting up ngrok for Paddle webhook testing..."

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed."
    echo "📥 Install it from: https://ngrok.com/download"
    echo "💡 Or run: brew install ngrok (on macOS)"
    exit 1
fi

# Start ngrok tunnel to port 3000
echo "🚀 Starting ngrok tunnel to localhost:3000..."
echo "📝 Your webhook URL will be: https://[random].ngrok-free.app/api/webhooks/paddle"
echo ""
echo "⚠️  IMPORTANT: Copy the https URL and add it to your Paddle dashboard:"
echo "   Dashboard → Developer Tools → Notifications → Destination URLs"
echo ""
echo "🔴 Press Ctrl+C to stop the tunnel"
echo ""

# Start ngrok (this will block until stopped)
ngrok http 3000 