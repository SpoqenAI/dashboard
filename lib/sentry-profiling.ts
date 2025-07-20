import * as Sentry from '@sentry/nextjs';

/**
 * Utility functions for Sentry profiling
 *
 * These functions help you profile specific code paths in your application
 * to identify performance bottlenecks and optimize slow operations.
 */

/**
 * Profile a function execution with Sentry
 *
 * @param name - The name of the span for profiling
 * @param fn - The function to profile
 * @returns Promise<T> - The result of the function execution
 */
export async function profileFunction<T>(
  name: string,
  fn: () => Promise<T> | T
): Promise<T> {
  return Sentry.startSpan(
    {
      name,
      op: 'function',
    },
    () => fn()
  );
}

/**
 * Profile a database operation
 *
 * @param operation - The database operation name (e.g., 'query', 'insert', 'update')
 * @param table - The table name being operated on
 * @param fn - The database operation function
 * @returns Promise<T> - The result of the database operation
 */
export async function profileDatabaseOperation<T>(
  operation: string,
  table: string,
  fn: () => Promise<T> | T
): Promise<T> {
  return Sentry.startSpan(
    {
      name: `${operation} ${table}`,
      op: 'db',
    },
    () => fn()
  );
}

/**
 * Profile an API call
 *
 * @param method - The HTTP method (GET, POST, etc.)
 * @param url - The API endpoint URL
 * @param fn - The API call function
 * @returns Promise<T> - The result of the API call
 */
export async function profileApiCall<T>(
  method: string,
  url: string,
  fn: () => Promise<T> | T
): Promise<T> {
  return Sentry.startSpan(
    {
      name: `${method} ${url}`,
      op: 'http.client',
    },
    () => fn()
  );
}

/**
 * Profile a React component render
 *
 * @param componentName - The name of the component being profiled
 * @param fn - The component render function
 * @returns T - The result of the component render
 */
export function profileComponentRender<T>(
  componentName: string,
  fn: () => T
): T {
  return Sentry.startSpan(
    {
      name: `render ${componentName}`,
      op: 'ui.render',
    },
    () => {
      return fn();
    }
  );
}

/**
 * Example usage in your application:
 *
 * // Profile a database query
 * const users = await profileDatabaseOperation('query', 'users', async () => {
 *   return await supabase.from('users').select('*');
 * });
 *
 * // Profile an API call
 * const data = await profileApiCall('GET', '/api/users', async () => {
 *   return await fetch('/api/users').then(res => res.json());
 * });
 *
 * // Profile a complex function
 * const result = await profileFunction('processUserData', async () => {
 *   // Your complex processing logic here
 *   return processedData;
 * });
 *
 * // Profile a React component render
 * const renderedComponent = profileComponentRender('UserProfile', () => {
 *   return <UserProfile user={user} />;
 * });
 */
