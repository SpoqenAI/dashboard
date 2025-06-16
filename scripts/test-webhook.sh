#!/bin/bash

# Test script for Paddle webhook endpoint
# This script sends a mock webhook payload to test your endpoint locally

echo "Testing Paddle webhook endpoint..."

# Sample subscription.created payload
PAYLOAD='{
  "event_type": "subscription.created",
  "data": {
    "id": "sub_test_123456789",
    "status": "active",
    "customer_id": "ctm_test_123456789",
    "items": [
      {
        "price": {
          "id": "pri_test_123456789"
        },
        "quantity": 1
      }
    ],
    "custom_data": {
      "user_id": "test-user-id-replace-this"
    },
    "cancel_at_period_end": false,
    "current_period_start": "2025-01-01T00:00:00Z",
    "current_period_end": "2025-02-01T00:00:00Z",
    "ended_at": null,
    "canceled_at": null,
    "trial_dates": null
  }
}'

# Send test webhook (without signature verification for local testing)
curl -X POST http://localhost:3000/api/webhooks/paddle \
  -H "Content-Type: application/json" \
  -H "Paddle-Signature: test-signature-for-local-testing" \
  -d "$PAYLOAD"

echo -e "\n\nWebhook test completed!"
echo "Check your Next.js console for processing logs."
echo "Check your Supabase database for the test subscription data." 