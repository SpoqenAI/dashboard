// Simple event emitter for real-time call updates
// This allows the webhook to notify connected clients about new calls

import { logger } from '@/lib/logger';

interface CallUpdateEvent {
  type: 'new-call' | 'call-updated' | 'connected' | 'heartbeat';
  callId: string;
  userId: string;
  timestamp: string;
  callData?: {
    id: string;
    summary?: string;
    analysis?: any;
    endedReason?: string;
    transcript?: string;
    recordingUrl?: string;
    phoneNumber?: string;
    callerName?: string;
    createdAt: string;
    startedAt?: string;
    endedAt?: string;
    cost?: number;
    durationSeconds: number;
  };
}

class CallEventEmitter {
  private listeners: Map<string, Set<(event: CallUpdateEvent) => void>> =
    new Map();

  // Subscribe to call updates for a specific user
  subscribe(userId: string, callback: (event: CallUpdateEvent) => void) {
    if (!this.listeners.has(userId)) {
      this.listeners.set(userId, new Set());
    }
    this.listeners.get(userId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const userListeners = this.listeners.get(userId);
      if (userListeners) {
        userListeners.delete(callback);
        if (userListeners.size === 0) {
          this.listeners.delete(userId);
        }
      }
    };
  }

  // Emit event to all subscribers of a user
  emit(userId: string, event: CallUpdateEvent) {
    const userListeners = this.listeners.get(userId);
    if (userListeners) {
      userListeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          logger.error(
            'CALL_EVENTS',
            'Error in call event listener',
            error instanceof Error ? error : new Error(String(error))
          );
        }
      });
    }
  }

  // Get number of active listeners (for monitoring)
  getListenerCount(): number {
    let total = 0;
    this.listeners.forEach(userListeners => {
      total += userListeners.size;
    });
    return total;
  }
}

// Global instance for the application
export const callEventEmitter = new CallEventEmitter();
export type { CallUpdateEvent };
