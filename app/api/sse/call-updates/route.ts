import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callEventEmitter } from '@/lib/events';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  // Verify authentication
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = user.id;

  // Create SSE response
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const encoder = new TextEncoder();
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: 'connected', timestamp: new Date().toISOString() });

      // Subscribe to call updates for this user
      const unsubscribe = callEventEmitter.subscribe(userId, (event) => {
        send(event);
      });

      // Keep connection alive with periodic heartbeat
      const heartbeat = setInterval(() => {
        send({ type: 'heartbeat', timestamp: new Date().toISOString() });
      }, 30000); // Every 30 seconds

      // Cleanup on connection close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe();
        logger.info('SSE', 'Client disconnected', {
          userId: logger.maskUserId(userId),
          activeListeners: callEventEmitter.getListenerCount(),
        });
      });

      logger.info('SSE', 'Client connected for call updates', {
        userId: logger.maskUserId(userId),
        activeListeners: callEventEmitter.getListenerCount(),
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}