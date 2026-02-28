/**
 * API Rate Limiting Middleware
 * Apply rate limiting to all API routes to prevent DoS attacks
 */

import { type NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, recordAttempt, RATE_LIMIT_CONFIG } from '@/lib/rate-limiter-enhanced';

/**
 * Extract client identifier from trusted network headers.
 */
function getClientIdentifier(request: NextRequest): string {
  // Use trusted forwarding headers from the platform edge/proxy.
  const ip = 
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown-ip';
  
  return `ip:${ip}`;
}

/**
 * Rate limit middleware for API routes
 * Usage: Add to middleware.ts or specific API routes
 *
 * @param request NextRequest
 * @param handler Handler to call if not rate limited
 * @param config Optional config override
 */
export async function withRateLimit(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: typeof RATE_LIMIT_CONFIG.api
): Promise<NextResponse> {
  const identifier = getClientIdentifier(request);
  const limitConfig = config || RATE_LIMIT_CONFIG.api;

  // Check if rate limited
  const { isLimited, retryAfterSeconds } = await checkRateLimit(identifier, limitConfig);

  if (isLimited) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: retryAfterSeconds,
      }),
      {
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          'Retry-After': retryAfterSeconds.toString(),
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // Record this attempt
  const { isLimited: limitExceeded } = await recordAttempt(identifier, limitConfig);

  if (limitExceeded) {
    return new NextResponse(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: 'Too many requests from this IP/account.',
      }),
      {
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // Call the handler
  return await handler(request);
}

/**
 * Create a rate-limited API route handler
 * 
 * @example
 * import { createRateLimitedHandler } from '@/lib/api-rate-limiter';
 * 
 * async function handler(request: NextRequest) {
 *   return NextResponse.json({ data: 'response' });
 * }
 * 
 * export const POST = createRateLimitedHandler(handler);
 */
export function createRateLimitedHandler(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: typeof RATE_LIMIT_CONFIG.api
) {
  return async (request: NextRequest) => {
    return withRateLimit(request, handler, config);
  };
}

/**
 * Rate limit by endpoint type
 * Different endpoints can have different limits
 */
export const rateLimitByEndpoint = {
  /**
   * Auth endpoints: 5 attempts per 15 minutes
   */
  auth: async (
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ) => {
    return withRateLimit(request, handler, RATE_LIMIT_CONFIG.login);
  },

  /**
   * Review submission: 10 per hour
   */
  review: async (
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ) => {
    return withRateLimit(request, handler, RATE_LIMIT_CONFIG.review);
  },

  /**
   * Search/read endpoints: 100 per minute
   */
  read: async (
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ) => {
    return withRateLimit(request, handler, RATE_LIMIT_CONFIG.api);
  },

  /**
   * Write endpoints: 50 per hour
   */
  write: async (
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ) => {
    return withRateLimit(request, handler, {
      maxAttempts: 50,
      windowMs: 60 * 60 * 1000,
      blockDurationMs: 60 * 60 * 1000,
    });
  },

  /**
   * Admin endpoints: 100 per hour
   */
  admin: async (
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ) => {
    return withRateLimit(request, handler, {
      maxAttempts: 100,
      windowMs: 60 * 60 * 1000,
      blockDurationMs: 60 * 60 * 1000,
    });
  },
};

export default withRateLimit;
