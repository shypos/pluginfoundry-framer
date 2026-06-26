import express from "express";

export class MemoryCacheLayer {
  private memoryMap = new Map<string, { value: any; expiry: number }>();

  get(key: string): any | null {
    const cached = this.memoryMap.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expiry) {
      this.memoryMap.delete(key);
      return null;
    }
    return cached.value;
  }

  set(key: string, value: any, ttlMs: number = 15 * 60 * 1000) {
    this.memoryMap.set(key, { value, expiry: Date.now() + ttlMs });
  }

  invalidateStore(storeId: string) {
    let count = 0;
    for (const key of this.memoryMap.keys()) {
      if (key.startsWith(`store:${storeId}:`)) {
        this.memoryMap.delete(key);
        count++;
      }
    }
    console.log(`[Cache Layer] Invalidated ${count} key-stores for store ID: '${storeId}'`);
  }
}

export const cacheLayer = new MemoryCacheLayer();

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

/**
 * Standard API Rate Limiter
 */
export function rateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 100;

  const tracker = rateLimitMap.get(ip) || { count: 0, windowStart: now };
  if (now - tracker.windowStart > windowMs) {
    tracker.count = 1;
    tracker.windowStart = now;
  } else {
    tracker.count++;
  }
  rateLimitMap.set(ip, tracker);

  if (tracker.count > maxRequests) {
    return res.status(429).json({ error: "Too many requests. Limit is 100 requests per minute." });
  }
  next();
}
