/**
 * Rate Limiting Middleware for API Routes
 * Use this to protect API endpoints from abuse
 */

import { json } from "@remix-run/node";
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS, type RateLimitConfig } from "./security";

/**
 * Apply rate limiting to a request
 * Returns null if allowed, or a Response object with 429 status if rate limited
 */
export async function applyRateLimit(
  request: Request,
  config: RateLimitConfig = RATE_LIMITS.API_DEFAULT
): Promise<Response | null> {
  const identifier = getRateLimitIdentifier(request);
  const { allowed, resetTime } = checkRateLimit(identifier, config);
  
  if (!allowed) {
    const resetDate = new Date(resetTime);
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
    
    return json(
      {
        error: 'Too many requests',
        message: `Rate limit exceeded. Please try again after ${resetDate.toISOString()}`,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetDate.toISOString(),
        },
      }
    );
  }
  
  // Request is allowed - you can optionally add rate limit headers to the response
  // This is handled in the route itself
  return null;
}

/**
 * Get rate limit headers for successful responses
 */
export function getRateLimitHeaders(
  request: Request,
  config: RateLimitConfig = RATE_LIMITS.API_DEFAULT
): Record<string, string> {
  const identifier = getRateLimitIdentifier(request);
  const { remaining, resetTime } = checkRateLimit(identifier, config);
  
  return {
    'X-RateLimit-Limit': String(config.maxRequests),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': new Date(resetTime).toISOString(),
  };
}
