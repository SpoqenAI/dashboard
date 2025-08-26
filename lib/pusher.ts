import PusherServer from 'pusher';

// Runtime validation for required environment variables
const requiredEnvVars = {
  PUSHER_APP_ID: process.env.PUSHER_APP_ID,
  NEXT_PUBLIC_PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY,
  PUSHER_SECRET: process.env.PUSHER_SECRET,
  NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
};

// Check for missing environment variables and throw descriptive errors
for (const [varName, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${varName}. ` +
      `Please ensure this variable is set in your environment configuration.`
    );
  }
}

// Global singleton pattern to avoid re-instantiation in Next.js dev mode
declare global {
  var __pusher: PusherServer | undefined;
}

// Create or retrieve the singleton Pusher instance
function getPusherInstance(): PusherServer {
  if (!globalThis.__pusher) {
    globalThis.__pusher = new PusherServer({
      appId: requiredEnvVars.PUSHER_APP_ID,
      key: requiredEnvVars.NEXT_PUBLIC_PUSHER_KEY,
      secret: requiredEnvVars.PUSHER_SECRET,
      cluster: requiredEnvVars.NEXT_PUBLIC_PUSHER_CLUSTER,
      useTLS: true,
    });
  }
  return globalThis.__pusher;
}

export const pusher = getPusherInstance();
