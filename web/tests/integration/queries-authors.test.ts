import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { ensureSchema, truncateAll } from './db';
import { createAuthor, getAuthorByAuthId, getAuthorById, updateAuthor } from '@/lib/db/queries/authors';

describe('queries/authors', () => {
  beforeAll(async () => { await ensureSchema(); });
  beforeEach(async () => { await truncateAll(); });

  it('createAuthor + getAuthorByAuthId round-trip', async () => {
    const created = await createAuthor({
      authId:      'email:alice@example.com',
      displayName: 'Alice',
      avatarImage: 'https://cdn.example/a.png',
    });
    expect(created.displayName).toBe('Alice');

    const found = await getAuthorByAuthId('email:alice@example.com');
    expect(found?.id).toBe(created.id);
  });

  it('omits dob from the public Author shape', async () => {
    const created = await createAuthor({ authId: 'email:b@x.com', displayName: 'B' });
    const found = await getAuthorById(created.id);
    expect(found).toBeTruthy();
    // Type-level guarantee + runtime: no dob in the projected interface.
    expect((found as Record<string, unknown>).dob).toBeUndefined();
  });

  it('updateAuthor leaves untouched fields alone', async () => {
    const a = await createAuthor({ authId: 'email:c@x.com', displayName: 'Cara' });
    const updated = await updateAuthor(a.id, { bio: 'a bio' });
    expect(updated?.displayName).toBe('Cara');
    expect(updated?.bio).toBe('a bio');
  });
});
