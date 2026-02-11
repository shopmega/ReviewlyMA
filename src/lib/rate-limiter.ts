/**
 * Rate Limiting Implementation
 * TIER 3 FEATURE: Protects verification endpoints from DoS attacks
 * 
 * Tracks failed attempts and blocks after threshold
 * Uses in-memory store (consider Redis for production scale)
 */

interface RateLimitRecord {
  attempts: number;
  blockedUntil: number;
  firstAttemptTime: number;
}

// In-memory store (in production, use Redis)
const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Configuration for different endpoints
 */
export const RATE_LIMIT_CONFIG = {
  verification: {
    maxAttempts: 5,          // Max 5 attempts
    windowMs: 15 * 60 * 1000, // Per 15 minutes
    blockDurationMs: 30 * 60 * 1000, // Block for 30 minutes after limit
  },
  signup: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000,  // Per hour
    blockDurationMs: 60 * 60 * 1000,
  },
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 20 * 60 * 1000,
  },
  review: {
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000, // Per hour
    blockDurationMs: 2 * 60 * 60 * 1000, // Block for 2 hours
  },
  report: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000,
    blockDurationMs: 4 * 60 * 60 * 1000,
  },
};

/**
 * Check if identifier is rate limited
 * @param identifier - Email, IP, or user ID to rate limit
 * @param config - Rate limit configuration
 * @returns { isLimited, remainingAttempts, retryAfterSeconds }
 */
export function checkRateLimit(
  identifier: string,
  config: typeof RATE_LIMIT_CONFIG.verification
): {
  isLimited: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  // Check if currently blocked
  if (record && now < record.blockedUntil) {
    const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return {
      isLimited: true,
      remainingAttempts: 0,
      retryAfterSeconds,
    };
  }

  // Check if window has expired
  if (record && now - record.firstAttemptTime > config.windowMs) {
    // Window expired, reset
    rateLimitStore.delete(identifier);
    return {
      isLimited: false,
      remainingAttempts: config.maxAttempts,
      retryAfterSeconds: 0,
    };
  }

  return {
    isLimited: false,
    remainingAttempts: record ? config.maxAttempts - record.attempts : config.maxAttempts,
    retryAfterSeconds: 0,
  };
}

/**
 * Record an attempt for rate limiting
 * @param identifier - Email, IP, or user ID
 * @param config - Rate limit configuration
 * @returns { isLimited, retryAfterSeconds } - Whether limit was reached
 */
export function recordAttempt(
  identifier: string,
  config: typeof RATE_LIMIT_CONFIG.verification
): { isLimited: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  // If no record, create new one
  if (!record) {
    rateLimitStore.set(identifier, {
      attempts: 1,
      blockedUntil: 0,
      firstAttemptTime: now,
    });
    return { isLimited: false, retryAfterSeconds: 0 };
  }

  // Check if window expired
  if (now - record.firstAttemptTime > config.windowMs) {
    // Reset and start new window
    rateLimitStore.set(identifier, {
      attempts: 1,
      blockedUntil: 0,
      firstAttemptTime: now,
    });
    return { isLimited: false, retryAfterSeconds: 0 };
  }

  // Increment attempts
  record.attempts += 1;

  // Check if limit exceeded
  if (record.attempts > config.maxAttempts) {
    // Block this identifier
    const blockedUntil = now + config.blockDurationMs;
    record.blockedUntil = blockedUntil;
    const retryAfterSeconds = Math.ceil(config.blockDurationMs / 1000);

    return {
      isLimited: true,
      retryAfterSeconds,
    };
  }

  return { isLimited: false, retryAfterSeconds: 0 };
}

/**
 * Clear rate limit for identifier (after successful verification)
 */
export function clearRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Get current rate limit status (for debugging)
 */
export function getRateLimitStatus(identifier: string): RateLimitRecord | null {
  return rateLimitStore.get(identifier) || null;
}

/**
 * Clean up expired records (call periodically)
 * Prevents memory leak in long-running processes
 */
export function cleanupExpiredRecords(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, record] of rateLimitStore.entries()) {
    // Remove if window has expired and not currently blocked
    if (now - record.firstAttemptTime > 24 * 60 * 60 * 1000 && now > record.blockedUntil) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }

  return cleaned;
}

// Cleanup every hour in production
if (typeof window === 'undefined') {
  // Server-side only
  setInterval(() => {
    const cleaned = cleanupExpiredRecords();
    if (cleaned > 0) {
      console.log(`[Rate Limiter] Cleaned up ${cleaned} expired records`);
    }
  }, 60 * 60 * 1000);
}
