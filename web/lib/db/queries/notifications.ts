import { sql } from '@/lib/db/client';

export type NotificationType = 'new_universe' | 'new_story' | 'new_page';

export interface NotificationRow {
  id:         string;
  type:       NotificationType;
  sourceType: 'author' | 'universe' | 'story';
  sourceId:   string;
  entityId:   string;
  title:      string;
  url:        string;
  read:       boolean;
  createdAt:  string;
  actorId:    string | null;
  actorName:  string | null;
  actorAvatar:string | null;
}

// ── Fan-out: insert one notification per follower (excluding the actor) ──────
// Each is a single bulk INSERT ... SELECT over the reactions table, so it stays
// well within the function time limit even with many followers (no cron needed).

// A new universe notifies the followers of its creator (author follow).
export async function notifyNewUniverse(
  actorId: string, universeId: string, slug: string, name: string,
): Promise<void> {
  await sql`
    INSERT INTO notifications (recipient_id, actor_id, type, source_type, source_id, entity_id, title, url)
    SELECT r.reactor_id, ${actorId}::uuid, 'new_universe'::notification_type,
           'author', ${actorId}::uuid, ${universeId}::uuid, ${name}, ${`/universes/${slug}`}
    FROM reactions r
    WHERE r.reaction_type = 'follow'
      AND r.author_id = ${actorId}::uuid
      AND r.reactor_id <> ${actorId}::uuid
  `;
}

// A new story notifies followers of its universe AND followers of its creator,
// deduped so a follower of both gets a single notification.
export async function notifyNewStory(
  actorId: string, storyId: string, universeId: string, title: string,
): Promise<void> {
  await sql`
    INSERT INTO notifications (recipient_id, actor_id, type, source_type, source_id, entity_id, title, url)
    SELECT DISTINCT ON (r.reactor_id)
           r.reactor_id, ${actorId}::uuid, 'new_story'::notification_type,
           CASE WHEN r.universe_id IS NOT NULL THEN 'universe' ELSE 'author' END,
           COALESCE(r.universe_id, r.author_id),
           ${storyId}::uuid, ${title}, ${`/stories/${storyId}`}
    FROM reactions r
    WHERE r.reaction_type = 'follow'
      AND (r.universe_id = ${universeId}::uuid OR r.author_id = ${actorId}::uuid)
      AND r.reactor_id <> ${actorId}::uuid
    ORDER BY r.reactor_id, (r.universe_id IS NOT NULL) DESC
  `;
}

// A new page notifies the followers of its story.
export async function notifyNewPage(
  actorId: string, pageId: string, storyId: string, title: string,
): Promise<void> {
  await sql`
    INSERT INTO notifications (recipient_id, actor_id, type, source_type, source_id, entity_id, title, url)
    SELECT r.reactor_id, ${actorId}::uuid, 'new_page'::notification_type,
           'story', ${storyId}::uuid, ${pageId}::uuid, ${title}, ${`/pages/${pageId}`}
    FROM reactions r
    WHERE r.reaction_type = 'follow'
      AND r.story_id = ${storyId}::uuid
      AND r.reactor_id <> ${actorId}::uuid
  `;
}

// ── Reads ────────────────────────────────────────────────────────────────
export async function getNotifications(recipientId: string, limit = 30): Promise<NotificationRow[]> {
  const rows = await sql`
    SELECT n.id, n.type, n.source_type, n.source_id, n.entity_id, n.title, n.url, n.read, n.created_at,
           n.actor_id, a.display_name AS actor_name, a.avatar_image AS actor_avatar
    FROM notifications n
    LEFT JOIN authors a ON a.id = n.actor_id
    WHERE n.recipient_id = ${recipientId}::uuid
    ORDER BY n.created_at DESC
    LIMIT ${limit}
  `;
  return rows.map(r => ({
    id:          r.id as string,
    type:        r.type as NotificationType,
    sourceType:  r.source_type as NotificationRow['sourceType'],
    sourceId:    r.source_id as string,
    entityId:    r.entity_id as string,
    title:       r.title as string,
    url:         r.url as string,
    read:        r.read as boolean,
    createdAt:   r.created_at as string,
    actorId:     (r.actor_id as string | null) ?? null,
    actorName:   (r.actor_name as string | null) ?? null,
    actorAvatar: (r.actor_avatar as string | null) ?? null,
  }));
}

export async function getUnreadCount(recipientId: string): Promise<number> {
  const rows = await sql`
    SELECT count(*)::int AS c FROM notifications
    WHERE recipient_id = ${recipientId}::uuid AND read = false
  `;
  return rows[0].c as number;
}

export async function markAllRead(recipientId: string): Promise<void> {
  await sql`
    UPDATE notifications SET read = true
    WHERE recipient_id = ${recipientId}::uuid AND read = false
  `;
}
