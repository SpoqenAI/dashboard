import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generic retry function for handling network requests with exponential backoff
 * @param operation - The async operation to retry
 * @param maxRetries - Maximum number of retry attempts (default: 2)
 * @param baseDelay - Base delay in milliseconds (default: 500)
 * @returns Promise that resolves with the operation result
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 500
): Promise<T> {
  let attempts = 0;

  while (true) {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      if (attempts >= maxRetries) {
        throw error instanceof Error
          ? error
          : new Error('Operation failed after retries');
      }

      // Calculate exponential backoff delay
      const delayMs = baseDelay * Math.pow(2, attempts);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      attempts += 1;
    }
  }
}
