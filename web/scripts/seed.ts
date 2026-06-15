import './_load-env';
import { neon } from '@neondatabase/serverless';
import { configureNeonForLocalDev } from '../lib/db/configure-neon';
import { STORY_CONCEPT_CONTENT } from '../lib/db/queries/pages';

const SYSTEM_AUTHOR_ID = '00000000-0000-0000-0000-000000000001';

const UNIVERSES = [
  {
    slug: 'exodus-2120', name: 'Exodus 2120',
    concept: 'The world is ending. Some of humanity escapes on generational starships bound for new planetary systems. These are the stories of those who did — and those left behind. Explore themes of survival, identity, and what it means to be human when everything familiar is lost.',
    cover_image: '/images/exodus.jpeg', era: 'Far Future', world: 'Sol System & Beyond',
    genres: ['scienceFiction'],
  },
  {
    slug: 'the-ember-courts', name: 'The Ember Courts',
    concept: 'Seven noble houses compete for dominion over a dying empire where magic is currency and secrets are weapons. Alliances shift like smoke, and every throne is built on someone else\'s ashes.',
    cover_image: '/images/kaali.jpeg', era: 'Medieval Fantasy', world: 'Vaelthar',
    genres: ['fantasy'],
  },
  {
    slug: 'deva-protocol', name: 'Deva Protocol',
    concept: 'Ancient Hindu cosmology collides with near-future AI. When a startup\'s language model begins quoting forgotten Vedic texts, a researcher must decide if the machine has awakened — or if someone is using it as a weapon.',
    cover_image: '/images/lockdown.jpeg', era: '2047', world: 'Mumbai & the Digital Plane',
    genres: ['scienceFiction'],
  },
];

// Sample community authors so the carousels and "Authors to follow" panel are
// populated. avatar_image holds a stable pravatar URL; swap for real uploads
// once available. follow/love counts seed the follow_count-DESC ordering.
const AUTHORS = [
  { authId: 'seed:meera-rao',      displayName: 'Meera Rao',      bio: 'Sci-fi novelist obsessed with generation ships and the people who never see the destination.', followCount: 8420, loveCount: 19200 },
  { authId: 'seed:arjun-sethi',    displayName: 'Arjun Sethi',    bio: 'Writes quiet stories about loud futures. Former aerospace engineer.',                          followCount: 6110, loveCount: 14300 },
  { authId: 'seed:lila-fontaine',  displayName: 'Lila Fontaine',  bio: 'Court intrigue, slow poison, faster betrayals. Fantasy is just politics with better lighting.',  followCount: 5375, loveCount: 16850 },
  { authId: 'seed:vikram-nair',    displayName: 'Vikram Nair',    bio: 'Mythology meets machine learning. Asking what the old gods would make of our new ones.',          followCount: 4290, loveCount: 9800  },
  { authId: 'seed:sana-qureshi',   displayName: 'Sana Qureshi',   bio: 'Short, sharp speculative fiction. If it does not unsettle you a little, I have not finished it.',  followCount: 3640, loveCount: 8120  },
];

const STORIES: Array<{ universeSlug: string; title: string; synopsis: string; authorAuthId: string }> = [
  { universeSlug: 'exodus-2120',    title: 'The Last Sunrise',       synopsis: "A family's final hours on Earth before the fleet departs.",                          authorAuthId: 'seed:meera-rao' },
  { universeSlug: 'exodus-2120',    title: 'Generation Three',        synopsis: 'Born aboard the Arka, Sena has never known gravity.',                                authorAuthId: 'seed:arjun-sethi' },
  { universeSlug: 'the-ember-courts', title: 'The Ash Bride',         synopsis: 'A political marriage that uncovers a centuries-old conspiracy.',                     authorAuthId: 'seed:lila-fontaine' },
  { universeSlug: 'the-ember-courts', title: 'Embers Don\'t Forgive', synopsis: 'The disgraced spymaster returns with a single name on her list.',                    authorAuthId: 'seed:lila-fontaine' },
  { universeSlug: 'deva-protocol',  title: 'First Words',             synopsis: "The model's first unprompted utterance: a mantra no living person knows.",            authorAuthId: 'seed:vikram-nair' },
  { universeSlug: 'deva-protocol',  title: 'The Indra Array',         synopsis: 'A network of temples across India begins responding to the model\'s output.',         authorAuthId: 'seed:sana-qureshi' },
];

async function seed() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  configureNeonForLocalDev(url);
  const sql = neon(url);

  console.log('Seeding… (idempotent — safe to re-run)');

  // System author. is_seed = true so its starter universes are cleanable.
  await sql`
    INSERT INTO authors (id, auth_id, display_name, bio, is_seed)
    VALUES (${SYSTEM_AUTHOR_ID}, 'system:kahaniverse', 'Kahaniverse',
            'The official Kahaniverse account. Starter universes for the community.', true)
    ON CONFLICT (auth_id) DO NOTHING
  `;

  // Community authors — resolved into a auth_id → id map for story attribution.
  const authorIds: Record<string, string> = { 'system:kahaniverse': SYSTEM_AUTHOR_ID };
  for (const a of AUTHORS) {
    const avatar = `https://i.pravatar.cc/240?u=${encodeURIComponent(a.authId)}`;
    await sql`
      INSERT INTO authors (auth_id, display_name, bio, avatar_image, follow_count, love_count, is_seed)
      VALUES (${a.authId}, ${a.displayName}, ${a.bio}, ${avatar}, ${a.followCount}, ${a.loveCount}, true)
      ON CONFLICT (auth_id) DO NOTHING
    `;
    const r = await sql`SELECT id FROM authors WHERE auth_id = ${a.authId} LIMIT 1`;
    authorIds[a.authId] = r[0].id as string;
  }

  // Universes
  const universeIds: Record<string, string> = {};
  for (const u of UNIVERSES) {
    const rows = await sql`
      INSERT INTO universes (slug, name, concept, cover_image, era, world, genres, creator_id)
      VALUES (${u.slug}, ${u.name}, ${u.concept}, ${u.cover_image},
              ${u.era}, ${u.world}, ${u.genres as unknown as string[]}, ${SYSTEM_AUTHOR_ID})
      ON CONFLICT (slug) DO NOTHING
      RETURNING id
    `;
    if (rows.length) universeIds[u.slug] = rows[0].id as string;
    else {
      const r = await sql`SELECT id FROM universes WHERE slug = ${u.slug}`;
      universeIds[u.slug] = r[0].id as string;
    }
  }

  // Stories + root pages, each attributed to a community author.
  for (const s of STORIES) {
    const uid      = universeIds[s.universeSlug];
    const authorId = authorIds[s.authorAuthId] ?? SYSTEM_AUTHOR_ID;
    if (!uid) continue;

    // Idempotency: stories have no natural unique key, so skip if one with the
    // same title already exists in this universe (keeps re-runs from dup'ing).
    const dupe = await sql`
      SELECT id FROM stories WHERE universe_id = ${uid} AND title = ${s.title} LIMIT 1
    `;
    if (dupe.length) continue;

    const storyRows = await sql`
      INSERT INTO stories (title, synopsis, universe_id, status)
      VALUES (${s.title}, ${s.synopsis}, ${uid}, 'published')
      RETURNING id
    `;
    const storyId = storyRows[0].id as string;

    // Creator contributor record
    await sql`
      INSERT INTO story_contributors (story_id, author_id, role, accepted_at)
      VALUES (${storyId}, ${authorId}, 'creator', now())
      ON CONFLICT DO NOTHING
    `;

    // Concept root (page 0): the structural anchor whose children are the
    // "Beginnings" (page 1). It is not an authored page itself, so it does not
    // count toward page_count — a freshly seeded story has 0 pages until an
    // author adds the first beginning.
    await sql`
      INSERT INTO pages (story_id, parent_id, content, author_id)
      VALUES (${storyId}, NULL, ${STORY_CONCEPT_CONTENT}, ${authorId})
      ON CONFLICT DO NOTHING
    `;

    await sql`UPDATE stories SET page_count = 0 WHERE id = ${storyId}`;
    await sql`UPDATE universes SET story_count = story_count + 1 WHERE id = ${uid}`;
  }

  // Drop e2e test authors (display_name 'e2e-*') that pollute the authors list.
  // Skip any that created a universe/page — universes.creator_id & pages.author_id
  // are ON DELETE RESTRICT, so deleting those would error (and nuke real test data).
  const purged = await sql`DELETE FROM authors a WHERE a.display_name LIKE 'e2e-%' AND NOT EXISTS (SELECT 1 FROM universes u WHERE u.creator_id = a.id) AND NOT EXISTS (SELECT 1 FROM pages p WHERE p.author_id = a.id) RETURNING a.id`;
  if (purged.length) console.log(`Removed ${purged.length} e2e test author(s).`);

  console.log('Seed complete.');
}

seed().catch(err => { console.error(err); process.exit(1); });
