/**
 * Utilities for managing payment flow state and debugging onboarding issues
 */

import { logger } from './logger';

// Payment processing state constants
export const PAYMENT_PROCESSING_KEY = 'spoqen_payment_processing';
export const PAYMENT_DEBUG_KEY = 'spoqen_payment_debug';

// Helper functions for payment state management
export const PaymentFlowUtils = {
  /**
   * Mark payment processing as started
   */
  startPaymentProcessing(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(PAYMENT_PROCESSING_KEY, 'true');
      sessionStorage.setItem(PAYMENT_DEBUG_KEY, JSON.stringify({
        startTime: Date.now(),
        startUrl: window.location.href,
        userAgent: navigator.userAgent.substring(0, 100) // Truncated for privacy
      }));
    }
  },

  /**
   * Check if payment processing is currently active
   */
  isPaymentProcessing(): boolean {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(PAYMENT_PROCESSING_KEY) === 'true';
  },

  /**
   * Complete payment processing and clean up state
   */
  completePaymentProcessing(): void {
    if (typeof window !== 'undefined') {
      const debugData = sessionStorage.getItem(PAYMENT_DEBUG_KEY);
      if (debugData) {
        try {
          const data = JSON.parse(debugData);
          const duration = Date.now() - data.startTime;
          
          logger.info('PAYMENT_FLOW', 'Payment processing completed', {
            duration,
            startUrl: data.startUrl,
            endUrl: window.location.href
          });
        } catch (error) {
          logger.warn('PAYMENT_FLOW', 'Failed to parse payment debug data', {
            debugData
          });
        }
      }
      
      sessionStorage.removeItem(PAYMENT_PROCESSING_KEY);
      sessionStorage.removeItem(PAYMENT_DEBUG_KEY);
    }
  },

  /**
   * Get payment processing debug information
   */
  getDebugInfo(): { isProcessing: boolean; duration?: number; startUrl?: string } {
    if (typeof window === 'undefined') {
      return { isProcessing: false };
    }

    const isProcessing = this.isPaymentProcessing();
    if (!isProcessing) {
      return { isProcessing: false };
    }

    try {
      const debugData = sessionStorage.getItem(PAYMENT_DEBUG_KEY);
      if (debugData) {
        const data = JSON.parse(debugData);
        return {
          isProcessing: true,
          duration: Date.now() - data.startTime,
          startUrl: data.startUrl
        };
      }
    } catch (error) {
      logger.warn('PAYMENT_FLOW', 'Failed to get payment debug info', { error });
    }

    return { isProcessing: true };
  },

  /**
   * Force clear payment processing state (for error recovery)
   */
  clearPaymentState(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(PAYMENT_PROCESSING_KEY);
      sessionStorage.removeItem(PAYMENT_DEBUG_KEY);
      logger.info('PAYMENT_FLOW', 'Payment state manually cleared');
    }
  }
}; 