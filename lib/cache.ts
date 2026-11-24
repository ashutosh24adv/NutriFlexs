/**
 * High-performance, memory-safe caching utility for read-heavy static public data.
 * Drastically reduces trans-Atlantic WAN round-trip latency to Neon PostgreSQL.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  tags?: string[];
}

const globalForAppCache = globalThis as unknown as {
  nutriflexsMemoryCache: Map<string, CacheEntry<any>> | undefined;
};

const cache =
  globalForAppCache.nutriflexsMemoryCache ?? new Map<string, CacheEntry<any>>();

if (process.env.NODE_ENV !== "production") {
  globalForAppCache.nutriflexsMemoryCache = cache;
}

/**
 * Retrieves a value from the in-memory cache if not expired.
 */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Stores a value in the in-memory cache with a TTL (default: 60 seconds).
 */
export function setCached<T>(
  key: string,
  data: T,
  ttlSeconds: number = 60,
  tags?: string[]
): void {
  // Bound memory usage: remove oldest items if map exceeds 500 items
  if (cache.size > 500) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }

  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
    tags,
  });
}

/**
 * Invalidates cache entries matching a tag or key prefix.
 */
export function invalidateCacheByTag(tag: string): void {
  for (const [key, entry] of cache.entries()) {
    if (entry.tags && entry.tags.includes(tag)) {
      cache.delete(key);
    }
  }
}

/**
 * Invalidates cache entries matching a key prefix.
 */
export function invalidateCacheByPrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Clears the entire memory cache.
 */
export function clearAllMemoryCache(): void {
  cache.clear();
}
