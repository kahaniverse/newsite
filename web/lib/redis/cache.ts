import { redis } from './client';

export const TTL = {
  featuredUniverses: 300,   // 5 min
  storyPage:         120,   // 2 min
  authorProfile:     600,   // 10 min
  reactionLock:      1,     // 1 s
  passwordReset:     900,   // 15 min
  emailVerify:       86400, // 24 h
  signupSignin:      120,   // 2 min — one-time auto-login grant after signup
} as const;

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const val = await redis.get<T>(key);
    return val ?? null;
  } catch {
    return null;
  }
}

export async function setCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, value);
  } catch {
    // cache failures are non-fatal
  }
}

export async function invalidateCache(keys: string[]): Promise<void> {
  try {
    if (keys.length) await redis.del(...keys);
  } catch {
    // non-fatal
  }
}

/**
 * Best-effort dedup lock. Returns true if the caller may proceed.
 * Acquires `key` with NX so concurrent duplicates (Redis up, key present)
 * return false. Fails open: if Redis is unreachable, returns true so a Redis
 * outage degrades into "no dedup" rather than breaking the operation.
 */
export async function acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
  try {
    const res = await redis.set(key, '1', { nx: true, ex: ttlSeconds });
    return res === 'OK';
  } catch (err) {
    console.error('[lock] Redis unavailable — proceeding without dedup lock:', err);
    return true;
  }
}

export const CacheKeys = {
  // Persona-scoped: the Kid list (mature hidden) and Grown-up list are distinct
  // payloads. Mutations invalidate every persona via featuredUniversesAll().
  featuredUniverses:  (persona: string = 'grownup') => `cache:universes:featured:${persona}`,
  featuredUniversesAll:       () => ['grownup', 'kid'].map(p => `cache:universes:featured:${p}`),
  storyListPage:   (n: number) => `cache:stories:page:${n}`,
  authorProfile:    (id: string) => `cache:author:${id}`,
  reactionLock:    (uid: string, type: string, tid: string) =>
                    `lock:reaction:${uid}:${type}:${tid}`,
  passwordReset:   (hash: string) => `pwreset:${hash}`,
  emailVerify:     (hash: string) => `emailverify:${hash}`,
  signupSignin:    (hash: string) => `signupsignin:${hash}`,
};
