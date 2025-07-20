import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { logger } from '@/lib/logger';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Runtime safeguard to ensure admin functions are only called from server contexts
 * @param functionName - Name of the function being called for logging
 * @param moduleName - Name of the module for logging context
 */
export function validateServerContext(
  functionName: string,
  moduleName: string
): void {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    const error = new Error(
      `Security violation: ${functionName} called from client-side code. ` +
        'Admin functions must only be used in server contexts.'
    );
    logger.error(
      `${moduleName.toUpperCase()}_SECURITY`,
      'Admin function called from client context',
      error,
      { functionName }
    );
    throw error;
  }

  // Check for required server environment variables
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const error = new Error(
      `Security violation: ${functionName} requires server environment. ` +
        'Missing SUPABASE_SERVICE_ROLE_KEY indicates this is not a proper server context.'
    );
    logger.error(
      `${moduleName.toUpperCase()}_SECURITY`,
      'Admin function called without server environment',
      error,
      { functionName }
    );
    throw error;
  }

  // Log usage for audit trail
  logger.info(
    `${moduleName.toUpperCase()}_ADMIN`,
    `Admin function called: ${functionName}`,
    {
      functionName,
      serverContext: true,
    }
  );
}
