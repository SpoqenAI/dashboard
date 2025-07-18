import { useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import type { CallUpdateEvent } from '@/lib/events';

interface UseCallUpdatesOptions {
  enabled?: boolean;
  onNewCall?: (event: CallUpdateEvent) => void;
  onCallUpdated?: (event: CallUpdateEvent) => void;
}

export function useCallUpdates({
  enabled = true,
  onNewCall,
  onCallUpdated,
}: UseCallUpdatesOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<CallUpdateEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const connect = () => {
    if (!enabled || eventSourceRef.current) return;

    try {
      const eventSource = new EventSource('/api/sse/call-updates');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
        logger.info('CALL_UPDATES', 'SSE connection established');
      };

      eventSource.onmessage = event => {
        try {
          const raw = JSON.parse(event.data) as { type: string };

          // Type guard for connection/heartbeat events
          if (raw.type === 'connected' || raw.type === 'heartbeat') {
            // Connection/heartbeat messages - just log
            return;
          }

          // Now assert as CallUpdateEvent for other types
          const data = raw as CallUpdateEvent;
          setLastEvent(data);

          // Call appropriate handler
          if (data.type === 'new-call' && onNewCall) {
            onNewCall(data);
          } else if (data.type === 'call-updated' && onCallUpdated) {
            onCallUpdated(data);
          }

          logger.info('CALL_UPDATES', 'Received call update event', {
            type: data.type,
            callId: data.callId,
          });
        } catch (error) {
          logger.error(
            'CALL_UPDATES',
            'Error parsing SSE message',
            error as Error
          );
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();
        eventSourceRef.current = null;

        // Exponential backoff for reconnection
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttempts.current),
          30000
        );
        reconnectAttempts.current++;

        logger.warn('CALL_UPDATES', 'SSE connection error, reconnecting', {
          attempt: reconnectAttempts.current,
          delayMs: delay,
        });

        reconnectTimeoutRef.current = setTimeout(() => {
          if (enabled) {
            connect();
          }
        }, delay);
      };
    } catch (error) {
      logger.error(
        'CALL_UPDATES',
        'Failed to create SSE connection',
        error as Error
      );
    }
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  };

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    lastEvent,
    connect,
    disconnect,
  };
}
