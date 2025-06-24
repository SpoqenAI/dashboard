#!/bin/bash

# Simple ngrok setup for testing VAPI webhooks
# Make sure your Next.js app is running on port 3000 first

set -e

echo "Setting up ngrok for VAPI webhook testing..."

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
  echo "❌ ngrok is not installed."
  echo "📥 Install it from: https://ngrok.com/download"
  echo "💡 Or run: brew install ngrok (on macOS)"
  exit 1
fi

# Start ngrok tunnel to port 3000
echo "🚀 Starting ngrok tunnel to localhost:3000..."

echo "📝 Your VAPI webhook URL will look like: https://<random>.ngrok-free.app/api/vapi-webhook"
echo "   Paste this URL into the VAPI dashboard → Assistant → Server URL"

echo "⚠️  IMPORTANT: If you use a non-default VAPI_WEBHOOK_SECRET, be sure to set the same value in the VAPI dashboard."

echo "🔴 Press Ctrl+C to stop the tunnel"

ngrok http 3000 