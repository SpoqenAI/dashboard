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
  const onNewCallRef = useRef<typeof onNewCall | undefined>(undefined);
  const onCallUpdatedRef = useRef<typeof onCallUpdated | undefined>(undefined);

  // Keep latest callbacks without retriggering the connection effect
  useEffect(() => {
    onNewCallRef.current = onNewCall;
  }, [onNewCall]);
  useEffect(() => {
    onCallUpdatedRef.current = onCallUpdated;
  }, [onCallUpdated]);

  useEffect(() => {
    if (!enabled || !userId || pusherRef.current) return;

    try {
      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authEndpoint: '/api/pusher/auth',
        auth: {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      });
      pusherRef.current = pusher;

      pusher.connection.bind('connected', () => setIsConnected(true));
      pusher.connection.bind('disconnected', () => setIsConnected(false));

      const channel = pusher.subscribe(`private-user-${userId}`);
      channel.bind('new-call', (data: CallUpdateEvent) => {
        onNewCallRef.current?.(data);
      });
      channel.bind('call-updated', (data: CallUpdateEvent) => {
        onCallUpdatedRef.current?.(data);
      });
    } catch (error) {
      logger.error(
        'CALL_UPDATES',
        'Failed to initialize Pusher',
        error as Error
      );
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
  }, [enabled, userId]);

  return { isConnected };
}
