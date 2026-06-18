import { describe, it, expect } from 'vitest';
import { CacheKeys, TTL } from '@/lib/redis/cache';

// These keys/TTLs are a contract with the spec in CLAUDE.md ("Redis Keys & TTLs").
// If they drift, cache-aside reads and invalidations silently stop matching.
describe('CacheKeys', () => {
  it('featuredUniverses is persona-scoped (defaults to grownup)', () => {
    expect(CacheKeys.featuredUniverses()).toBe('cache:universes:featured:grownup');
    expect(CacheKeys.featuredUniverses('kid')).toBe('cache:universes:featured:kid');
  });

  it('featuredUniversesAll lists every persona key for invalidation', () => {
    expect(CacheKeys.featuredUniversesAll()).toEqual([
      'cache:universes:featured:grownup',
      'cache:universes:featured:kid',
    ]);
  });

  it('storyListPage embeds the page number', () => {
    expect(CacheKeys.storyListPage(3)).toBe('cache:stories:page:3');
  });

  it('authorProfile embeds the author id', () => {
    expect(CacheKeys.authorProfile('abc')).toBe('cache:author:abc');
  });

  it('reactionLock composes uid:type:tid', () => {
    expect(CacheKeys.reactionLock('u1', 'love', 't1')).toBe('lock:reaction:u1:love:t1');
  });

  it('passwordReset prefixes the hash', () => {
    expect(CacheKeys.passwordReset('deadbeef')).toBe('pwreset:deadbeef');
  });
});

describe('TTL', () => {
  it('matches the documented durations (seconds)', () => {
    expect(TTL.featuredUniverses).toBe(300);
    expect(TTL.storyPage).toBe(120);
    expect(TTL.authorProfile).toBe(600);
    expect(TTL.reactionLock).toBe(1);
    expect(TTL.passwordReset).toBe(900);
  });
});
