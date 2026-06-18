import { sql } from '@/lib/db/client';
import { Author, AuthorTier } from '@/lib/types';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

function rowToAuthor(row: Record<string, unknown>): Author {
  return {
    id:          row.id as string,
    displayName: row.display_name as string,
    bio:         row.bio as string | undefined,
    avatarImage: row.avatar_image as string | undefined,
    followCount: Number(row.follow_count),
    loveCount:   Number(row.love_count),
    tier:        (row.tier as AuthorTier | undefined) ?? 'reader',
    emailVerified: row.email_verified === true,
    createdAt:   (row.created_at as Date).toISOString(),
  };
}

// Raise an author to at least `tier`. Monotonic: the WHERE clause leans on the
// `author_tier` enum's declared order so this never demotes anyone who already
// stands higher. Best-effort — callers shouldn't fail a creation if this does,
// so it swallows and logs errors.
export async function promoteTier(authorId: string, tier: AuthorTier): Promise<void> {
  try {
    await sql`
      UPDATE authors
      SET tier = ${tier}::author_tier, updated_at = now()
      WHERE id = ${authorId} AND tier < ${tier}::author_tier
    `;
  } catch (e) {
    console.error(`promoteTier(${authorId}, ${tier}) failed`, e);
  }
}

export async function getAuthorByAuthId(authId: string): Promise<Author | null> {
  const rows = await sql`SELECT * FROM authors WHERE auth_id = ${authId} LIMIT 1`;
  return rows.length ? rowToAuthor(rows[0]) : null;
}

export async function getAuthorById(id: string): Promise<Author | null> {
  const rows = await sql`SELECT * FROM authors WHERE id = ${id} LIMIT 1`;
  return rows.length ? rowToAuthor(rows[0]) : null;
}

export async function getAuthorByEmail(email: string): Promise<(Author & { passwordHash?: string }) | null> {
  // auth_id stores email for credential users
  const rows = await sql`SELECT * FROM authors WHERE auth_id = ${`email:${email}`} LIMIT 1`;
  if (!rows.length) return null;
  return { ...rowToAuthor(rows[0]), passwordHash: rows[0].password_hash as string | undefined };
}

export async function getAuthors(
  { page = 1, limit = 20, exclude }: { page?: number; limit?: number; exclude?: string | null },
) {
  const offset = (page - 1) * limit;
  // `exclude` drops a single author (the signed-in user) so they never appear in
  // their own "authors to follow" lists.
  const rows = exclude
    ? await sql`
        SELECT * FROM authors WHERE id <> ${exclude}
        ORDER BY follow_count DESC, created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    : await sql`
        SELECT * FROM authors
        ORDER BY follow_count DESC, created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
  const countRows = exclude
    ? await sql`SELECT COUNT(*) AS total FROM authors WHERE id <> ${exclude}`
    : await sql`SELECT COUNT(*) AS total FROM authors`;
  return { data: rows.map(rowToAuthor), total: Number(countRows[0].total) };
}

export async function createAuthor(data: {
  authId:       string;
  displayName:  string;
  avatarImage?: string;
  passwordHash?: string;
}): Promise<Author> {
  const rows = await sql`
    INSERT INTO authors (auth_id, display_name, avatar_image)
    VALUES (${data.authId}, ${data.displayName}, ${data.avatarImage ?? null})
    RETURNING *
  `;
  return rowToAuthor(rows[0]);
}

export async function updateAuthor(
  id: string,
  data: Partial<{ displayName: string; bio: string; avatarImage: string }>
): Promise<Author | null> {
  const rows = await sql`
    UPDATE authors SET
      display_name = COALESCE(${data.displayName ?? null}, display_name),
      bio          = COALESCE(${data.bio ?? null}, bio),
      avatar_image = COALESCE(${data.avatarImage ?? null}, avatar_image)
    WHERE id = ${id}
    RETURNING *
  `;
  return rows.length ? rowToAuthor(rows[0]) : null;
}

/**
 * Create a fully anonymous account: no email, no password — only a SHA-256 hash
 * of a one-time recovery code (the caller shows the plaintext code once and
 * never stores it). The auth_id is a random opaque `anon:<uuid>`, so nothing in
 * the row maps back to a real person. Returns the new author plus its auth_id
 * (needed to mint the session, since anon accounts have no email to key on).
 */
export async function createAnonAuthor(data: {
  displayName:  string;
  recoveryHash: string;
}): Promise<Author & { authId: string }> {
  const authId = `anon:${randomUUID()}`;
  const rows = await sql`
    INSERT INTO authors (auth_id, display_name, recovery_hash)
    VALUES (${authId}, ${data.displayName}, ${data.recoveryHash})
    RETURNING *
  `;
  return { ...rowToAuthor(rows[0]), authId };
}

/** Resolve an account by the SHA-256 hash of its recovery code (login path). */
export async function getAuthorByRecoveryHash(
  recoveryHash: string,
): Promise<(Author & { authId: string }) | null> {
  const rows = await sql`
    SELECT * FROM authors WHERE recovery_hash = ${recoveryHash} LIMIT 1
  `;
  if (!rows.length) return null;
  return { ...rowToAuthor(rows[0]), authId: rows[0].auth_id as string };
}

export async function verifyPassword(email: string, password: string): Promise<Author | null> {
  const rows = await sql`
    SELECT * FROM authors WHERE auth_id = ${`email:${email}`} LIMIT 1
  `;
  if (!rows.length) return null;
  const hash = rows[0].password_hash as string | null;
  if (!hash) return null;
  const valid = await bcrypt.compare(password, hash);
  return valid ? rowToAuthor(rows[0]) : null;
}
