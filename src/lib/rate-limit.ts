import { env } from '@/env'
import { redis } from '@/lib/redis'
import { Ratelimit } from '@upstash/ratelimit'

export interface RateLimiterOptions {
  maxRequests: number
  windowMs: number
  maxStoreSize: number
  cleanupIntervalMs: number
}

type RateLimitStoreRecord = {
  count: number
  resetTime: number
}

function createInMemoryLimiter(maxRequests: number, windowMs: number, maxStoreSize: number, cleanupIntervalMs: number) {
  const store = new Map<string, RateLimitStoreRecord>()
  let lastCleanup = Date.now()

  function cleanup(): void {
    const now = Date.now()
    if (now - lastCleanup < cleanupIntervalMs) return

    lastCleanup = now

    for (const [key, record] of store.entries()) {
      if (now > record.resetTime) {
        store.delete(key)
      }
    }

    if (store.size > maxStoreSize) {
      const entries = Array.from(store.entries())
      entries.sort((a, b) => a[1].resetTime - b[1].resetTime)
      const toRemove = entries.slice(0, store.size - maxStoreSize)
      for (const [key] of toRemove) {
        store.delete(key)
      }
    }
  }

  function check(key: string): boolean {
    cleanup()

    const now = Date.now()
    const record = store.get(key)

    if (!record || now > record.resetTime) {
      store.set(key, { count: 1, resetTime: now + windowMs })
      return true
    }

    if (record.count >= maxRequests) {
      return false
    }

    record.count++
    return true
  }

  return { check }
}

export function createRateLimiter(options?: Partial<RateLimiterOptions>) {
  const maxRequests = options?.maxRequests ?? 5
  const windowMs = options?.windowMs ?? 60_000
  const maxStoreSize = options?.maxStoreSize ?? 1000
  const cleanupIntervalMs = options?.cleanupIntervalMs ?? 5 * 60_000

  const inMemory = createInMemoryLimiter(maxRequests, windowMs, maxStoreSize, cleanupIntervalMs)

  const useRedis = env.NODE_ENV === 'production'
  const windowSec = Math.max(1, Math.floor(windowMs / 1000))
  const upstashLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, `${windowSec} s`),
  })

  async function check(key: string): Promise<boolean> {
    if (!useRedis) return inMemory.check(key)
    try {
      const { success } = await upstashLimiter.limit(key)
      return success
    } catch (error) {
      console.error('Redis rate limit error, falling back to in-memory:', error)
      return inMemory.check(key)
    }
  }

  return { check }
}

// Default limiter (5 req/min)
const defaultLimiter = createRateLimiter()

export async function checkRateLimit(key: string): Promise<boolean> {
  return defaultLimiter.check(key)
}
