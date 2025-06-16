# Testing Paddle Webhooks with ngrok

## Quick Setup

1. **Install ngrok** (if not already installed):
   ```bash
   brew install ngrok  # macOS
   # or download from https://ngrok.com/download
   ```

2. **Start your Next.js app**:
   ```bash
   npm run dev
   # Make sure it's running on http://localhost:3000
   ```

3. **Run the ngrok setup script**:
   ```bash
   ./scripts/setup-ngrok.sh
   ```

4. **Copy the webhook URL** from ngrok output (looks like `https://abc123.ngrok-free.app`)

5. **Add webhook URL to Paddle**:
   - Go to Paddle Dashboard → Developer Tools → Notifications
   - Add destination URL: `https://your-ngrok-url.ngrok-free.app/api/webhooks/paddle`
   - Select events: `subscription.created`, `subscription.updated`, `subscription.canceled`

## Testing

Once set up, any subscription events in Paddle will be sent to your local webhook endpoint. Check your Next.js console for logs and your Supabase database for the data.

## Important Notes

- ngrok URL changes each time you restart (unless you have a paid plan)
- Remember to update the webhook URL in Paddle dashboard when ngrok restarts
- Keep the ngrok terminal open while testing 