'use client';

import { useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import type { CallUpdateEvent } from '@/lib/events';

// Type for dynamically imported Pusher instance
type PusherInstance = {
  subscribe: (channelName: string) => {
    bind: (event: string, callback: (data: CallUpdateEvent) => void) => void;
    unbind: (event: string) => void;
  };
  unsubscribe: (channelName: string) => void;
  channel: (channelName: string) => {
    bind: (event: string, callback: (data: CallUpdateEvent) => void) => void;
    unbind: (event: string) => void;
  } | null;
  disconnect: () => void;
  connection: {
    bind: (event: string, callback: () => void) => void;
  };
};

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
  const pusherRef = useRef<PusherInstance | null>(null);
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
    // Cleanup previous channel if it exists (always run cleanup first)
    if (pusherRef.current && currentChannelRef.current) {
      try {
        const channel = pusherRef.current.channel(currentChannelRef.current);
        if (channel) {
          channel.unbind('new-call');
          channel.unbind('call-updated');
        }
        pusherRef.current.unsubscribe(currentChannelRef.current);
      } catch (error) {
        logger.error(
          'CALL_UPDATES',
          'Failed to cleanup previous channel',
          error as Error
        );
      }
      currentChannelRef.current = null;
    }

    // Early return after cleanup if not enabled or no userId
    if (!enabled || !userId) return;

    // Initialize Pusher connection if it doesn't exist
    if (!pusherRef.current) {
      // Dynamic import to avoid SSR bundle inclusion
      import('pusher-js')
        .then(({ default: Pusher }) => {
          if (isUnmountedRef.current) return; // Component unmounted during import

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

            // Subscribe to channel after Pusher is initialized
            if (userId) {
              const channelName = `private-user-${userId}`;
              const channel = pusher.subscribe(channelName);
              currentChannelRef.current = channelName;

              channel.bind('new-call', (data: CallUpdateEvent) => {
                onNewCallRef.current?.(data);
              });
              channel.bind('call-updated', (data: CallUpdateEvent) => {
                onCallUpdatedRef.current?.(data);
              });
            }
          } catch (error) {
            logger.error(
              'CALL_UPDATES',
              'Failed to initialize Pusher',
              error as Error
            );
          }
        })
        .catch(error => {
          logger.error(
            'CALL_UPDATES',
            'Failed to load Pusher library',
            error as Error
          );
        });
      return; // Exit early since initialization is async
    }

    // Subscribe to new private channel (only if Pusher is already initialized)
    if (pusherRef.current) {
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
          logger.error(
            'CALL_UPDATES',
            'Failed to disconnect Pusher',
            error as Error
          );
        }
        pusherRef.current = null;
      }
      currentChannelRef.current = null;
      setIsConnected(false);
    };
  }, []);

  return { isConnected };
}
