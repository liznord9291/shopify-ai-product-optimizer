// Simple in-memory rate limiter for OpenAI API calls
// In production, consider using Redis for distributed rate limiting

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60 * 60 * 1000) { // 100 requests per hour
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    
    // Clean up expired entries every 10 minutes
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    if (!entry || now >= entry.resetTime) {
      // New window or expired entry
      this.limits.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  getRemainingRequests(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry || Date.now() >= entry.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - entry.count);
  }

  getResetTime(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry || Date.now() >= entry.resetTime) {
      return Date.now();
    }
    return entry.resetTime;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now >= entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}

// Global rate limiter instances
export const openaiRateLimiter = new RateLimiter(
  parseInt(process.env.OPENAI_RATE_LIMIT || '50'), // 50 requests per hour by default
  60 * 60 * 1000 // 1 hour window
);

export const bulkAnalysisLimiter = new RateLimiter(
  parseInt(process.env.BULK_ANALYSIS_LIMIT || '5'), // 5 bulk analyses per hour
  60 * 60 * 1000 // 1 hour window
);

export function getRateLimitIdentifier(session: any): string {
  // Use shop domain as identifier for rate limiting
  return session.shop || 'anonymous';
}

export function checkRateLimit(identifier: string, type: 'openai' | 'bulk' = 'openai'): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const limiter = type === 'bulk' ? bulkAnalysisLimiter : openaiRateLimiter;
  
  return {
    allowed: limiter.isAllowed(identifier),
    remaining: limiter.getRemainingRequests(identifier),
    resetTime: limiter.getResetTime(identifier)
  };
} 