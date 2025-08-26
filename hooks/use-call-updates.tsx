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
  const currentChannelRef = useRef<string | null>(null);
  const isUnmountedRef = useRef(false);
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
    if (!enabled || !userId) return;

    // Cleanup previous channel if it exists
    if (pusherRef.current && currentChannelRef.current) {
      try {
        const channel = pusherRef.current.channel(currentChannelRef.current);
        if (channel) {
          channel.unbind('new-call');
          channel.unbind('call-updated');
        }
        pusherRef.current.unsubscribe(currentChannelRef.current);
      } catch (error) {
        logger.error('CALL_UPDATES', 'Failed to cleanup previous channel', error as Error);
      }
      currentChannelRef.current = null;
    }

    // Initialize Pusher connection if it doesn't exist
    if (!pusherRef.current) {
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

        pusher.connection.bind('connected', () => {
          if (!isUnmountedRef.current) {
            setIsConnected(true);
          }
        });
        pusher.connection.bind('disconnected', () => {
          if (!isUnmountedRef.current) {
            setIsConnected(false);
          }
        });
      } catch (error) {
        logger.error(
          'CALL_UPDATES',
          'Failed to initialize Pusher',
          error as Error
        );
        return;
      }
    }

    // Subscribe to new private channel
    try {
      const channelName = `private-user-${userId}`;
      const channel = pusherRef.current.subscribe(channelName);
      currentChannelRef.current = channelName;

      channel.bind('new-call', (data: CallUpdateEvent) => {
        onNewCallRef.current?.(data);
      });
      channel.bind('call-updated', (data: CallUpdateEvent) => {
        onCallUpdatedRef.current?.(data);
      });
    } catch (error) {
      logger.error(
        'CALL_UPDATES',
        'Failed to subscribe to channel',
        error as Error
      );
    }
  }, [enabled, userId]);

  // Separate cleanup effect for component unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      if (pusherRef.current) {
        try {
          pusherRef.current.disconnect();
        } catch (error) {
          logger.error('CALL_UPDATES', 'Failed to disconnect Pusher', error as Error);
        }
        pusherRef.current = null;
      }
      currentChannelRef.current = null;
      setIsConnected(false);
    };
  }, []);

  return { isConnected };
}
