import { useEffect, useRef, useState } from 'react';
import Pusher from 'pusher-js';
import { logger } from '@/lib/logger';
import type { CallUpdateEvent } from '@/lib/events';

interface UseCallUpdatesOptions {
  enabled?: boolean;
  userId?: string;
  onNewCall?: (event: CallUpdateEvent) => void;
  onCallUpdated?: (event: CallUpdateEvent) => void;
}

export function useCallUpdates({
  enabled = true,
  userId,
  onNewCall,
  onCallUpdated,
}: UseCallUpdatesOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const pusherRef = useRef<Pusher | null>(null);

  useEffect(() => {
    if (!enabled || !userId || pusherRef.current) return;

    try {
      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      });
      pusherRef.current = pusher;

      pusher.connection.bind('connected', () => setIsConnected(true));
      pusher.connection.bind('disconnected', () => setIsConnected(false));

      const channel = pusher.subscribe(`user-${userId}`);
      channel.bind('new-call', (data: CallUpdateEvent) => {
        if (onNewCall) onNewCall(data);
      });
      channel.bind('call-updated', (data: CallUpdateEvent) => {
        if (onCallUpdated) onCallUpdated(data);
      });
    } catch (error) {
      logger.error('CALL_UPDATES', 'Failed to initialize Pusher', error as Error);
    }

    return () => {
      if (pusherRef.current) {
        try {
          pusherRef.current.disconnect();
        } catch {}
        pusherRef.current = null;
      }
      setIsConnected(false);
    };
  }, [enabled, userId, onNewCall, onCallUpdated]);

  return { isConnected };
}
