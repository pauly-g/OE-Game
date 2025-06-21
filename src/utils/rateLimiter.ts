/**
 * Rate Limiter Utility
 * 
 * Provides client-side rate limiting to prevent abuse and spam submissions.
 * This is a first line of defense - server-side rate limiting should also be implemented.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
  lastAttempt: number;
}

class RateLimiter {
  private storage: Map<string, RateLimitEntry> = new Map();
  private readonly cleanupInterval: number = 60000; // Cleanup every minute

  constructor() {
    // Periodic cleanup of old entries
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  /**
   * Check if an action is rate limited
   * @param key Unique identifier for the action (e.g., userId + action type)
   * @param maxAttempts Maximum attempts allowed in the time window
   * @param windowMs Time window in milliseconds
   * @returns Object with allowed status and retry information
   */
  checkRateLimit(
    key: string, 
    maxAttempts: number, 
    windowMs: number
  ): { allowed: boolean; retryAfter?: number; attemptsRemaining?: number } {
    const now = Date.now();
    const entry = this.storage.get(key);

    if (!entry) {
      // First attempt
      this.storage.set(key, {
        count: 1,
        windowStart: now,
        lastAttempt: now
      });
      return { 
        allowed: true, 
        attemptsRemaining: maxAttempts - 1 
      };
    }

    // Check if we're in a new time window
    if (now - entry.windowStart >= windowMs) {
      // Reset for new window
      this.storage.set(key, {
        count: 1,
        windowStart: now,
        lastAttempt: now
      });
      return { 
        allowed: true, 
        attemptsRemaining: maxAttempts - 1 
      };
    }

    // We're in the same window
    if (entry.count >= maxAttempts) {
      const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000);
      return { 
        allowed: false, 
        retryAfter 
      };
    }

    // Increment count
    entry.count++;
    entry.lastAttempt = now;
    this.storage.set(key, entry);

    return { 
      allowed: true, 
      attemptsRemaining: maxAttempts - entry.count 
    };
  }

  /**
   * Clean up old entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    for (const [key, entry] of this.storage.entries()) {
      if (now - entry.lastAttempt > maxAge) {
        this.storage.delete(key);
      }
    }
  }

  /**
   * Reset rate limit for a specific key (use carefully)
   */
  reset(key: string): void {
    this.storage.delete(key);
  }

  /**
   * Get current status for a key without incrementing
   */
  getStatus(key: string, maxAttempts: number, windowMs: number): {
    attemptsUsed: number;
    attemptsRemaining: number;
    windowTimeRemaining: number;
  } {
    const now = Date.now();
    const entry = this.storage.get(key);

    if (!entry || now - entry.windowStart >= windowMs) {
      return {
        attemptsUsed: 0,
        attemptsRemaining: maxAttempts,
        windowTimeRemaining: 0
      };
    }

    return {
      attemptsUsed: entry.count,
      attemptsRemaining: Math.max(0, maxAttempts - entry.count),
      windowTimeRemaining: Math.max(0, entry.windowStart + windowMs - now)
    };
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Predefined rate limits for common actions
export const RATE_LIMITS = {
  SCORE_SUBMISSION: {
    maxAttempts: 3,
    windowMs: 30000, // 30 seconds
    key: (userId: string) => `score_submission:${userId}`
  },
  AUTHENTICATION: {
    maxAttempts: 5,
    windowMs: 300000, // 5 minutes
    key: (identifier: string) => `auth:${identifier}`
  },
  FORM_SUBMISSION: {
    maxAttempts: 10,
    windowMs: 60000, // 1 minute
    key: (userId: string) => `form:${userId}`
  }
} as const;

/**
 * Helper function to check score submission rate limit
 */
export const checkScoreSubmissionLimit = (userId: string) => {
  const limit = RATE_LIMITS.SCORE_SUBMISSION;
  return rateLimiter.checkRateLimit(
    limit.key(userId), 
    limit.maxAttempts, 
    limit.windowMs
  );
};

/**
 * Helper function to check authentication rate limit
 */
export const checkAuthLimit = (identifier: string) => {
  const limit = RATE_LIMITS.AUTHENTICATION;
  return rateLimiter.checkRateLimit(
    limit.key(identifier), 
    limit.maxAttempts, 
    limit.windowMs
  );
};

/**
 * Helper function to check form submission rate limit
 */
export const checkFormSubmissionLimit = (userId: string) => {
  const limit = RATE_LIMITS.FORM_SUBMISSION;
  return rateLimiter.checkRateLimit(
    limit.key(userId), 
    limit.maxAttempts, 
    limit.windowMs
  );
}; 