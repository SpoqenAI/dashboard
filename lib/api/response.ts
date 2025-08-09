import { NextResponse } from 'next/server';

/**
 * Mandatory security headers required by team guidelines.
 */
export const MANDATORY_SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

/**
 * Ensures the provided NextResponse includes the mandatory security headers.
 */
export function withSecurityHeaders<T>(
  response: NextResponse<T>
): NextResponse<T> {
  for (const [key, value] of Object.entries(MANDATORY_SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

/**
 * Convenience wrapper around NextResponse.json that applies mandatory security headers.
 */
export function secureJson(data: unknown, init?: ResponseInit): NextResponse {
  const res = NextResponse.json(data, init);
  return withSecurityHeaders(res);
}
