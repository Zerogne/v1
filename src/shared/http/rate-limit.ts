/**
 * Rate limiter interface
 * Allows swapping implementations (in-memory, Redis, etc.)
 */
export interface RateLimiter {
  check(userId: string): Promise<boolean>
  reset(userId: string): Promise<void>
}

/**
 * In-memory token bucket rate limiter
 * Suitable for single-instance deployments
 * 
 * TODO: Replace with Redis-based limiter for distributed deployments
 */
export class InMemoryRateLimiter implements RateLimiter {
  private buckets = new Map<
    string,
    { tokens: number; lastRefill: number }
  >()
  
  constructor(
    private readonly tokensPerInterval: number,
    private readonly intervalMs: number
  ) {}
  
  async check(userId: string): Promise<boolean> {
    const now = Date.now()
    const bucket = this.buckets.get(userId)
    
    if (!bucket) {
      // Initialize bucket with tokens
      this.buckets.set(userId, {
        tokens: this.tokensPerInterval - 1,
        lastRefill: now,
      })
      return true
    }
    
    // Refill tokens if interval has passed
    const timeSinceRefill = now - bucket.lastRefill
    if (timeSinceRefill >= this.intervalMs) {
      bucket.tokens = this.tokensPerInterval - 1
      bucket.lastRefill = now
      return true
    }
    
    // Check if tokens available
    if (bucket.tokens > 0) {
      bucket.tokens--
      return true
    }
    
    return false
  }
  
  async reset(userId: string): Promise<void> {
    this.buckets.delete(userId)
  }
  
  /**
   * Clean up old buckets (call periodically)
   */
  cleanup(maxAgeMs: number = 60 * 60 * 1000): void {
    const now = Date.now()
    for (const [userId, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > maxAgeMs) {
        this.buckets.delete(userId)
      }
    }
  }
}

/**
 * Default rate limiter instance
 * Can be swapped for Redis-based limiter in production
 */
let defaultRateLimiter: RateLimiter | null = null

/**
 * Get or create default rate limiter
 */
export function getRateLimiter(tokensPerMin: number): RateLimiter {
  if (!defaultRateLimiter) {
    defaultRateLimiter = new InMemoryRateLimiter(tokensPerMin, 60 * 1000)
  }
  return defaultRateLimiter
}

/**
 * Set custom rate limiter (for testing or Redis implementation)
 */
export function setRateLimiter(limiter: RateLimiter): void {
  defaultRateLimiter = limiter
}

