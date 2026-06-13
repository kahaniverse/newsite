import { sql } from '@/lib/db/client';
import { ReactionType, TargetType } from '@/lib/types';

async function findReactionId(
  reactorId: string,
  reactionType: ReactionType,
  targetType: TargetType,
  targetId: string,
): Promise<string | null> {
  const rt = `${reactionType}` as const;
  let rows;
  switch (targetType) {
    case 'universe':
      rows = await sql`
        SELECT id FROM reactions
        WHERE reactor_id = ${reactorId}
          AND reaction_type = ${rt}::reaction_type
          AND universe_id = ${targetId}::uuid
        LIMIT 1`;
      break;
    case 'story':
      rows = await sql`
        SELECT id FROM reactions
        WHERE reactor_id = ${reactorId}
          AND reaction_type = ${rt}::reaction_type
          AND story_id = ${targetId}::uuid
        LIMIT 1`;
      break;
    case 'page':
      rows = await sql`
        SELECT id FROM reactions
        WHERE reactor_id = ${reactorId}
          AND reaction_type = ${rt}::reaction_type
          AND page_id = ${targetId}::uuid
        LIMIT 1`;
      break;
    case 'author':
      rows = await sql`
        SELECT id FROM reactions
        WHERE reactor_id = ${reactorId}
          AND reaction_type = ${rt}::reaction_type
          AND author_id = ${targetId}::uuid
        LIMIT 1`;
      break;
  }
  return rows.length ? (rows[0].id as string) : null;
}

async function insertReaction(
  reactorId: string,
  reactionType: ReactionType,
  targetType: TargetType,
  targetId: string,
): Promise<void> {
  const rt = `${reactionType}` as const;
  switch (targetType) {
    case 'universe':
      await sql`
        INSERT INTO reactions (reactor_id, reaction_type, universe_id)
        VALUES (${reactorId}, ${rt}::reaction_type, ${targetId}::uuid)`;
      return;
    case 'story':
      await sql`
        INSERT INTO reactions (reactor_id, reaction_type, story_id)
        VALUES (${reactorId}, ${rt}::reaction_type, ${targetId}::uuid)`;
      return;
    case 'page':
      await sql`
        INSERT INTO reactions (reactor_id, reaction_type, page_id)
        VALUES (${reactorId}, ${rt}::reaction_type, ${targetId}::uuid)`;
      return;
    case 'author':
      await sql`
        INSERT INTO reactions (reactor_id, reaction_type, author_id)
        VALUES (${reactorId}, ${rt}::reaction_type, ${targetId}::uuid)`;
      return;
  }
}

async function bumpCounter(
  targetType: TargetType,
  targetId: string,
  reactionType: ReactionType,
  delta: 1 | -1,
): Promise<void> {
  if (delta === 1) {
    switch (targetType) {
      case 'universe':
        if (reactionType === 'love')    await sql`UPDATE universes SET love_count    = love_count    + 1 WHERE id = ${targetId}::uuid`;
        if (reactionType === 'follow')  await sql`UPDATE universes SET follow_count  = follow_count  + 1 WHERE id = ${targetId}::uuid`;
        if (reactionType === 'view')    await sql`UPDATE universes SET view_count    = view_count    + 1 WHERE id = ${targetId}::uuid`;
        return;
      case 'story':
        if (reactionType === 'love')    await sql`UPDATE stories SET love_count    = love_count    + 1 WHERE id = ${targetId}::uuid`;
        if (reactionType === 'follow')  await sql`UPDATE stories SET follow_count  = follow_count  + 1 WHERE id = ${targetId}::uuid`;
        if (reactionType === 'view')    await sql`UPDATE stories SET view_count    = view_count    + 1 WHERE id = ${targetId}::uuid`;
        return;
      case 'page':
        if (reactionType === 'love')    await sql`UPDATE pages SET love_count = love_count + 1 WHERE id = ${targetId}::uuid`;
        if (reactionType === 'view')    await sql`UPDATE pages SET view_count = view_count + 1 WHERE id = ${targetId}::uuid`;
        return;
      case 'author':
        if (reactionType === 'love')    await sql`UPDATE authors SET love_count   = love_count   + 1 WHERE id = ${targetId}::uuid`;
        if (reactionType === 'follow')  await sql`UPDATE authors SET follow_count = follow_count + 1 WHERE id = ${targetId}::uuid`;
        return;
    }
  } else {
    switch (targetType) {
      case 'universe':
        if (reactionType === 'love')    await sql`UPDATE universes SET love_count    = GREATEST(0, love_count    - 1) WHERE id = ${targetId}::uuid`;
        if (reactionType === 'follow')  await sql`UPDATE universes SET follow_count  = GREATEST(0, follow_count  - 1) WHERE id = ${targetId}::uuid`;
        if (reactionType === 'view')    await sql`UPDATE universes SET view_count    = GREATEST(0, view_count    - 1) WHERE id = ${targetId}::uuid`;
        return;
      case 'story':
        if (reactionType === 'love')    await sql`UPDATE stories SET love_count    = GREATEST(0, love_count    - 1) WHERE id = ${targetId}::uuid`;
        if (reactionType === 'follow')  await sql`UPDATE stories SET follow_count  = GREATEST(0, follow_count  - 1) WHERE id = ${targetId}::uuid`;
        if (reactionType === 'view')    await sql`UPDATE stories SET view_count    = GREATEST(0, view_count    - 1) WHERE id = ${targetId}::uuid`;
        return;
      case 'page':
        if (reactionType === 'love')    await sql`UPDATE pages SET love_count = GREATEST(0, love_count - 1) WHERE id = ${targetId}::uuid`;
        if (reactionType === 'view')    await sql`UPDATE pages SET view_count = GREATEST(0, view_count - 1) WHERE id = ${targetId}::uuid`;
        return;
      case 'author':
        if (reactionType === 'love')    await sql`UPDATE authors SET love_count   = GREATEST(0, love_count   - 1) WHERE id = ${targetId}::uuid`;
        if (reactionType === 'follow')  await sql`UPDATE authors SET follow_count = GREATEST(0, follow_count - 1) WHERE id = ${targetId}::uuid`;
        return;
    }
  }
}

export async function toggleReaction(
  reactorId:    string,
  reactionType: ReactionType,
  targetType:   TargetType,
  targetId:     string,
): Promise<'added' | 'removed'> {
  const existingId = await findReactionId(reactorId, reactionType, targetType, targetId);

  if (existingId) {
    await sql`DELETE FROM reactions WHERE id = ${existingId}::uuid`;
    await bumpCounter(targetType, targetId, reactionType, -1);
    return 'removed';
  }

  await insertReaction(reactorId, reactionType, targetType, targetId);
  await bumpCounter(targetType, targetId, reactionType, 1);
  return 'added';
}

// A view is counted at most once per (viewer, target): the first time a signed-in
// user opens an individual item we insert a 'view' reaction row and bump the
// denormalized counter. Repeat visits and refreshes find the existing row and
// no-op, so the count reflects unique viewers — and merely seeing an entity in a
// list (which never calls this) leaves its count untouched.
export async function recordViewOnce(
  reactorId:  string,
  targetType: TargetType,
  targetId:   string,
): Promise<'added' | 'noop'> {
  if (targetType === 'author') return 'noop'; // authors have no view_count
  const existingId = await findReactionId(reactorId, 'view', targetType, targetId);
  if (existingId) return 'noop';
  await insertReaction(reactorId, 'view', targetType, targetId);
  await bumpCounter(targetType, targetId, 'view', 1);
  return 'added';
}

export async function getUserReactions(
  reactorId: string,
  targetIds: string[],
): Promise<Array<{ targetId: string; type: ReactionType }>> {
  if (!targetIds.length) return [];
  const rows = await sql`
    SELECT reaction_type,
           COALESCE(universe_id, story_id, page_id, author_id)::text AS target_id
    FROM reactions
    WHERE reactor_id = ${reactorId}
      AND COALESCE(universe_id, story_id, page_id, author_id) = ANY(${targetIds}::uuid[])
  `;
  return rows.map(r => ({ targetId: r.target_id as string, type: r.reaction_type as ReactionType }));
}
