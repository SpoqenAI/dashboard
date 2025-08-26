import PusherServer from 'pusher';

// Global singleton pattern to avoid re-instantiation in Next.js dev mode
declare global {
  var __pusher: PusherServer | undefined;
}

// Lazy validation and initialization of Pusher instance
function getPusherInstance(): PusherServer {
  if (!globalThis.__pusher) {
    // Runtime validation for required environment variables (only when needed)
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

    // Type-safe environment variables after validation with server-only fallbacks
    const pusherEnv: {
      PUSHER_APP_ID: string;
      NEXT_PUBLIC_PUSHER_KEY: string;
      PUSHER_SECRET: string;
      NEXT_PUBLIC_PUSHER_CLUSTER: string;
    } = {
      PUSHER_APP_ID: requiredEnvVars.PUSHER_APP_ID as string,
      NEXT_PUBLIC_PUSHER_KEY: requiredEnvVars.NEXT_PUBLIC_PUSHER_KEY as string,
      PUSHER_SECRET: requiredEnvVars.PUSHER_SECRET as string,
      NEXT_PUBLIC_PUSHER_CLUSTER: (process.env.PUSHER_CLUSTER ||
        requiredEnvVars.NEXT_PUBLIC_PUSHER_CLUSTER) as string,
    };

    globalThis.__pusher = new PusherServer({
      appId: pusherEnv.PUSHER_APP_ID,
      key: pusherEnv.NEXT_PUBLIC_PUSHER_KEY,
      secret: pusherEnv.PUSHER_SECRET,
      cluster: pusherEnv.NEXT_PUBLIC_PUSHER_CLUSTER,
      useTLS: true,
    });
  }
  return globalThis.__pusher;
}

// Export a getter function instead of immediate initialization
export const pusher = new Proxy({} as PusherServer, {
  get(target, prop) {
    const instance = getPusherInstance();
    return instance[prop as keyof PusherServer];
  },
});
