/**
 * Enhanced Rate Limiting Implementation - Production Ready
 * Supports Redis with in-memory fallback
 * Protects APIs from DoS and brute force attacks
 */

// Redis import - optional, only used if REDIS_URL is set
let createRedisClient: any = null;
let RedisClientType: any = null;

try {
  const redis = require('redis');
  createRedisClient = redis.createClient;
  RedisClientType = redis.RedisClientType;
} catch (e) {
  // Redis module not installed - will use in-memory fallback
}

/**
 * Rate limit configuration
 */
export const RATE_LIMIT_CONFIG = {
  verification: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
  },
  signup: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour
  },
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 20 * 60 * 1000, // 20 minutes
  },
  review: {
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 2 * 60 * 60 * 1000, // 2 hours
  },
  report: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 4 * 60 * 60 * 1000, // 4 hours
  },
  api: {
    maxAttempts: 100,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 10 * 60 * 1000, // 10 minutes
  },
};

/**
 * In-memory fallback for rate limiting
 * Used when Redis is unavailable
 */
interface RateLimitRecord {
  attempts: number;
  blockedUntil: number;
  firstAttemptTime: number;
}

const inMemoryStore = new Map<string, RateLimitRecord>();

/**
 * Redis client for distributed rate limiting
 * Lazy-initialized on first use
 */
let redisClient: any = null;
let redisReady = false;

/**
 * Initialize Redis client
 */
async function initRedis(): Promise<any> {
  // Skip if already initialized
  if (redisReady) return redisClient;
  
  // Skip if no Redis URL provided (use fallback)
  if (!process.env.REDIS_URL) {
    console.warn(
      'REDIS_URL not set. Using in-memory rate limiting. ' +
      'For production, set REDIS_URL to use distributed rate limiting.'
    );
    redisReady = true;
    return null;
  }

  try {
    redisClient = createRedisClient({
      url: process.env.REDIS_URL,
    });

    redisClient.on('error', (error: any) => {
      console.error('Redis connection error:', error);
      redisReady = false;
      redisClient = null;
    });

    await redisClient.connect();
    redisReady = true;
    console.log('Redis rate limiting initialized');
    return redisClient;
  } catch (error: any) {
    console.warn('Failed to initialize Redis, falling back to in-memory rate limiting:', error instanceof Error ? error.message : String(error));
    redisReady = true;
    return null;
  }
}

/**
 * Check if identifier is rate limited
 * @param identifier - Email, IP, or user ID
 * @param config - Rate limit configuration
 * @returns { isLimited, remainingAttempts, retryAfterSeconds }
 */
export async function checkRateLimit(
  identifier: string,
  config: typeof RATE_LIMIT_CONFIG.verification
): Promise<{
  isLimited: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
}> {
  const redis = await initRedis();
  
  if (redis) {
    return await checkRateLimitRedis(redis, identifier, config);
  } else {
    return checkRateLimitMemory(identifier, config);
  }
}

/**
 * Record an attempt
 * @param identifier - Email, IP, or user ID
 * @param config - Rate limit configuration
 * @returns { isLimited, retryAfterSeconds }
 */
export async function recordAttempt(
  identifier: string,
  config: typeof RATE_LIMIT_CONFIG.verification
): Promise<{
  isLimited: boolean;
  retryAfterSeconds: number;
}> {
  const redis = await initRedis();
  
  if (redis) {
    return await recordAttemptRedis(redis, identifier, config);
  } else {
    return recordAttemptMemory(identifier, config);
  }
}

/**
 * Reset rate limit for identifier
 * @param identifier - Email, IP, or user ID
 */
export async function resetRateLimit(identifier: string): Promise<void> {
  const redis = await initRedis();
  
  if (redis) {
    const key = `ratelimit:${identifier}`;
    await redis.del(key);
  } else {
    inMemoryStore.delete(identifier);
  }
}

// ============ Redis Implementation ============

async function checkRateLimitRedis(
  redis: any,
  identifier: string,
  config: typeof RATE_LIMIT_CONFIG.verification
): Promise<{
  isLimited: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
}> {
  const key = `ratelimit:${identifier}`;
  const blockedKey = `ratelimit:blocked:${identifier}`;

  // Check if blocked
  const blocked = await redis.get(blockedKey);
  if (blocked) {
    const ttl = await redis.ttl(blockedKey);
    const retryAfterSeconds = Math.max(ttl, 1);
    return {
      isLimited: true,
      remainingAttempts: 0,
      retryAfterSeconds,
    };
  }

  // Get current attempts
  const attempts = parseInt((await redis.get(key)) || '0');
  const remaining = Math.max(config.maxAttempts - attempts, 0);

  return {
    isLimited: false,
    remainingAttempts: remaining,
    retryAfterSeconds: 0,
  };
}

async function recordAttemptRedis(
  redis: any,
  identifier: string,
  config: typeof RATE_LIMIT_CONFIG.verification
): Promise<{
  isLimited: boolean;
  retryAfterSeconds: number;
}> {
  const key = `ratelimit:${identifier}`;
  const blockedKey = `ratelimit:blocked:${identifier}`;

  // Check if already blocked
  const isBlocked = await redis.exists(blockedKey);
  if (isBlocked) {
    const ttl = await redis.ttl(blockedKey);
    return {
      isLimited: true,
      retryAfterSeconds: Math.max(ttl, 1),
    };
  }

  // Increment attempts
  const attempts = await redis.incr(key);

  // Set expiration on first attempt
  if (attempts === 1) {
    await redis.expire(key, Math.ceil(config.windowMs / 1000));
  }

  // Check if limit exceeded
  if (attempts > config.maxAttempts) {
    // Block the identifier
    await redis.setEx(
      blockedKey,
      Math.ceil(config.blockDurationMs / 1000),
      'blocked'
    );

    return {
      isLimited: true,
      retryAfterSeconds: Math.ceil(config.blockDurationMs / 1000),
    };
  }

  return {
    isLimited: false,
    retryAfterSeconds: 0,
  };
}

// ============ In-Memory Fallback ============

function checkRateLimitMemory(
  identifier: string,
  config: typeof RATE_LIMIT_CONFIG.verification
): {
  isLimited: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const record = inMemoryStore.get(identifier);

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
    inMemoryStore.delete(identifier);
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

function recordAttemptMemory(
  identifier: string,
  config: typeof RATE_LIMIT_CONFIG.verification
): {
  isLimited: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  let record = inMemoryStore.get(identifier);

  // Create new record if doesn't exist
  if (!record) {
    record = {
      attempts: 0,
      blockedUntil: 0,
      firstAttemptTime: now,
    };
  }

  // Check if blocked
  if (now < record.blockedUntil) {
    const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return {
      isLimited: true,
      retryAfterSeconds,
    };
  }

  // Check if window has expired
  if (now - record.firstAttemptTime > config.windowMs) {
    record = {
      attempts: 0,
      blockedUntil: 0,
      firstAttemptTime: now,
    };
  }

  // Increment attempts
  record.attempts++;

  // Check if limit exceeded
  if (record.attempts > config.maxAttempts) {
    record.blockedUntil = now + config.blockDurationMs;
    inMemoryStore.set(identifier, record);

    return {
      isLimited: true,
      retryAfterSeconds: Math.ceil(config.blockDurationMs / 1000),
    };
  }

  inMemoryStore.set(identifier, record);

  return {
    isLimited: false,
    retryAfterSeconds: 0,
  };
}

/**
 * Clean up expired in-memory records (for in-memory mode)
 * Should be called periodically (e.g., every minute)
 */
export function cleanupExpiredRecords(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];

  inMemoryStore.forEach((record, key) => {
    // Delete if past window and not blocked
    if (now - record.firstAttemptTime > 24 * 60 * 60 * 1000) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => inMemoryStore.delete(key));

  if (keysToDelete.length > 0) {
    console.log(`Cleaned up ${keysToDelete.length} expired rate limit records`);
  }
}

export default {
  checkRateLimit,
  recordAttempt,
  resetRateLimit,
  cleanupExpiredRecords,
  RATE_LIMIT_CONFIG,
};
