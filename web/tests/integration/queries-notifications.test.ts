import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { ensureSchema, truncateAll, makeAuthor, makeUniverse, makeStory, makePage, sql } from './db';
import { toggleReaction } from '@/lib/db/queries/reactions';
import {
  notifyNewUniverse, notifyNewStory, notifyNewPage,
  getNotifications, getUnreadCount, markAllRead,
} from '@/lib/db/queries/notifications';

describe('queries/notifications', () => {
  beforeAll(async () => { await ensureSchema(); });
  beforeEach(async () => { await truncateAll(); });

  it('a new story notifies universe followers AND author followers, deduped, excluding the actor', async () => {
    const author    = await makeAuthor();             // creator = actor
    const u         = await makeUniverse(author.id);
    const fAuthor   = await makeAuthor();              // follows the author only
    const fUniverse = await makeAuthor();              // follows the universe only
    const fBoth     = await makeAuthor();              // follows both → exactly ONE notification

    await toggleReaction(fAuthor.id,   'follow', 'author',   author.id);
    await toggleReaction(fUniverse.id, 'follow', 'universe', u.id);
    await toggleReaction(fBoth.id,     'follow', 'author',   author.id);
    await toggleReaction(fBoth.id,     'follow', 'universe', u.id);

    const story = await makeStory(u.id, author.id);
    await notifyNewStory(author.id, story.id, u.id, story.title);

    for (const f of [fAuthor, fUniverse, fBoth]) {
      const list = await getNotifications(f.id);
      expect(list.length).toBe(1);
      expect(list[0]).toMatchObject({ type: 'new_story', entityId: story.id, url: `/stories/${story.id}` });
    }
    expect((await getNotifications(author.id)).length).toBe(0);                 // actor not notified
    const total = await sql`SELECT count(*)::int AS c FROM notifications WHERE type = 'new_story'`;
    expect(total[0].c).toBe(3);                                                // fBoth deduped
  });

  it('a new universe notifies the author\'s followers; a new page notifies the story\'s followers', async () => {
    const author   = await makeAuthor();
    const follower = await makeAuthor();
    await toggleReaction(follower.id, 'follow', 'author', author.id);

    const u = await makeUniverse(author.id);
    await notifyNewUniverse(author.id, u.id, u.slug, 'My Universe');
    expect((await getNotifications(follower.id))[0]).toMatchObject({ type: 'new_universe', url: `/universes/${u.slug}` });

    const story         = await makeStory(u.id, author.id);
    const storyFollower = await makeAuthor();
    await toggleReaction(storyFollower.id, 'follow', 'story', story.id);
    const page = await makePage(story.id, author.id);
    await notifyNewPage(author.id, page.id, story.id, 'A snippet of the page');
    expect((await getNotifications(storyFollower.id))[0]).toMatchObject({ type: 'new_page', url: `/pages/${page.id}` });
  });

  it('unread count tracks new notifications and markAllRead clears them', async () => {
    const author   = await makeAuthor();
    const follower = await makeAuthor();
    await toggleReaction(follower.id, 'follow', 'author', author.id);
    const u = await makeUniverse(author.id);

    await notifyNewUniverse(author.id, u.id, u.slug, 'U');
    expect(await getUnreadCount(follower.id)).toBe(1);
    await markAllRead(follower.id);
    expect(await getUnreadCount(follower.id)).toBe(0);
  });
});
