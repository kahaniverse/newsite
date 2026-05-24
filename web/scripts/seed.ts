import './_load-env';
import { neon } from '@neondatabase/serverless';
import { configureNeonForLocalDev } from '../lib/db/configure-neon';

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

const STORIES: Array<{ universeSlug: string; title: string; synopsis: string }> = [
  { universeSlug: 'exodus-2120',    title: 'The Last Sunrise',       synopsis: "A family's final hours on Earth before the fleet departs." },
  { universeSlug: 'exodus-2120',    title: 'Generation Three',        synopsis: 'Born aboard the Arka, Sena has never known gravity.' },
  { universeSlug: 'the-ember-courts', title: 'The Ash Bride',         synopsis: 'A political marriage that uncovers a centuries-old conspiracy.' },
  { universeSlug: 'the-ember-courts', title: 'Embers Don\'t Forgive', synopsis: 'The disgraced spymaster returns with a single name on her list.' },
  { universeSlug: 'deva-protocol',  title: 'First Words',             synopsis: "The model's first unprompted utterance: a mantra no living person knows." },
  { universeSlug: 'deva-protocol',  title: 'The Indra Array',         synopsis: 'A network of temples across India begins responding to the model\'s output.' },
];

async function seed() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  configureNeonForLocalDev(url);
  const sql = neon(url);

  // Idempotency check
  const existing = await sql`SELECT id FROM authors WHERE id = ${SYSTEM_AUTHOR_ID} LIMIT 1`;
  if (existing.length) {
    console.log('Seed data already present. Skipping.');
    return;
  }

  console.log('Seeding…');

  // System author
  await sql`
    INSERT INTO authors (id, auth_id, display_name, bio)
    VALUES (${SYSTEM_AUTHOR_ID}, 'system:kahaniverse', 'Kahaniverse',
            'The official Kahaniverse account. Starter universes for the community.')
    ON CONFLICT DO NOTHING
  `;

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

  // Stories + root pages
  for (const s of STORIES) {
    const uid = universeIds[s.universeSlug];
    if (!uid) continue;

    const storyRows = await sql`
      INSERT INTO stories (title, synopsis, universe_id, status)
      VALUES (${s.title}, ${s.synopsis}, ${uid}, 'published')
      ON CONFLICT DO NOTHING
      RETURNING id
    `;
    if (!storyRows.length) continue;
    const storyId = storyRows[0].id as string;

    // Creator contributor record
    await sql`
      INSERT INTO story_contributors (story_id, author_id, role, accepted_at)
      VALUES (${storyId}, ${SYSTEM_AUTHOR_ID}, 'creator', now())
      ON CONFLICT DO NOTHING
    `;

    // Root page (parent_id = NULL marks the root)
    await sql`
      INSERT INTO pages (story_id, parent_id, content, author_id)
      VALUES (${storyId}, NULL,
              ${`This is the beginning of "${s.title}". The first words of this story are yet to be written. Be the author who starts it.`},
              ${SYSTEM_AUTHOR_ID})
      ON CONFLICT DO NOTHING
    `;

    // Update page_count
    await sql`UPDATE stories SET page_count = 1 WHERE id = ${storyId}`;
    await sql`UPDATE universes SET story_count = story_count + 1 WHERE id = ${uid}`;
  }

  console.log('Seed complete.');
}

seed().catch(err => { console.error(err); process.exit(1); });
