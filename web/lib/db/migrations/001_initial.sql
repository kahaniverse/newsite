-- ============================================================
-- Kahaniverse — Initial Schema Migration
-- Apply via: npm run db:migrate
-- ============================================================

-- ENUMS
CREATE TYPE reaction_type    AS ENUM ('love', 'follow', 'view');
CREATE TYPE genre            AS ENUM (
  'fantasy','scienceFiction','romance','thriller',
  'horror','mystery','adventure','historical','literary','other'
);
CREATE TYPE story_status     AS ENUM ('draft','published','completed','abandoned');
CREATE TYPE contributor_role AS ENUM ('creator','coAuthor','fanContributor');

-- AUTHORS
CREATE TABLE authors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id       TEXT UNIQUE NOT NULL,
  display_name  VARCHAR(64) NOT NULL,
  bio           VARCHAR(500),
  avatar_image  TEXT,
  dob           DATE,
  password_hash TEXT,                       -- only set for credential users
  follow_count  BIGINT NOT NULL DEFAULT 0,
  love_count    BIGINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_authors_auth_id      ON authors(auth_id);
CREATE INDEX idx_authors_display_name ON authors(LOWER(display_name));

-- UNIVERSES
CREATE TABLE universes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(64) UNIQUE NOT NULL
                  CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name            VARCHAR(64) UNIQUE NOT NULL,
  concept         VARCHAR(2000) NOT NULL,
  cover_image     TEXT NOT NULL,
  era             VARCHAR(64),
  world           VARCHAR(64),
  genres          genre[] DEFAULT '{}',
  creator_id      UUID NOT NULL REFERENCES authors(id) ON DELETE RESTRICT,
  love_count      BIGINT NOT NULL DEFAULT 0,
  follow_count    BIGINT NOT NULL DEFAULT 0,
  view_count      BIGINT NOT NULL DEFAULT 0,
  story_count     INT NOT NULL DEFAULT 0,
  character_count INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_universes_creator ON universes(creator_id);
CREATE INDEX idx_universes_genres  ON universes USING GIN(genres);

-- CHARACTERS
CREATE TABLE characters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(128) NOT NULL,
  image       TEXT NOT NULL,
  description VARCHAR(500),
  universe_id UUID NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
  creator_id  UUID NOT NULL REFERENCES authors(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_characters_universe ON characters(universe_id);
CREATE INDEX idx_characters_creator  ON characters(creator_id);

-- STORIES
CREATE TABLE stories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        VARCHAR(128) NOT NULL,
  synopsis     VARCHAR(500) NOT NULL,
  cover_image  TEXT,
  genre_tags   genre[] DEFAULT '{}',
  status       story_status NOT NULL DEFAULT 'draft',
  universe_id  UUID NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
  love_count   BIGINT NOT NULL DEFAULT 0,
  follow_count BIGINT NOT NULL DEFAULT 0,
  view_count   BIGINT NOT NULL DEFAULT 0,
  page_count   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(title, universe_id)
);
CREATE INDEX idx_stories_universe   ON stories(universe_id);
CREATE INDEX idx_stories_status     ON stories(status);
CREATE INDEX idx_stories_genre_tags ON stories USING GIN(genre_tags);

-- STORY CONTRIBUTORS
CREATE TABLE story_contributors (
  story_id    UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  role        contributor_role NOT NULL DEFAULT 'coAuthor',
  accepted_at TIMESTAMPTZ,
  PRIMARY KEY (story_id, author_id)
);
CREATE INDEX idx_contrib_author ON story_contributors(author_id);

-- STORY CHARACTERS
CREATE TABLE story_characters (
  story_id     UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  PRIMARY KEY (story_id, character_id)
);

-- PAGES (branching tree; NULL parent_id = root page of the story)
CREATE TABLE pages (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id           UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  parent_id          UUID REFERENCES pages(id) ON DELETE CASCADE,
  content            TEXT NOT NULL CHECK (char_length(content) <= 10000),
  illustration       TEXT,
  disallow_next      BOOLEAN NOT NULL DEFAULT false,
  disallow_alternate BOOLEAN NOT NULL DEFAULT false,
  author_id          UUID NOT NULL REFERENCES authors(id) ON DELETE RESTRICT,
  love_count         BIGINT NOT NULL DEFAULT 0,
  view_count         BIGINT NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pages_story  ON pages(story_id);
CREATE INDEX idx_pages_parent ON pages(parent_id);
-- exactly one root page per story
CREATE UNIQUE INDEX idx_pages_root_per_story ON pages(story_id) WHERE parent_id IS NULL;

-- REACTIONS (polymorphic — exactly one target column non-null)
CREATE TABLE reactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reactor_id    UUID NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  reaction_type reaction_type NOT NULL,
  universe_id   UUID REFERENCES universes(id) ON DELETE CASCADE,
  story_id      UUID REFERENCES stories(id)   ON DELETE CASCADE,
  page_id       UUID REFERENCES pages(id)     ON DELETE CASCADE,
  author_id     UUID REFERENCES authors(id)   ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reactions_exactly_one_target CHECK (
    ((universe_id IS NOT NULL)::int +
     (story_id    IS NOT NULL)::int +
     (page_id     IS NOT NULL)::int +
     (author_id   IS NOT NULL)::int) = 1
  )
);
-- partial unique indexes treat NULLs as absent so a user can react once per target
CREATE UNIQUE INDEX uq_reactions_universe ON reactions(reactor_id, reaction_type, universe_id) WHERE universe_id IS NOT NULL;
CREATE UNIQUE INDEX uq_reactions_story    ON reactions(reactor_id, reaction_type, story_id)    WHERE story_id    IS NOT NULL;
CREATE UNIQUE INDEX uq_reactions_page     ON reactions(reactor_id, reaction_type, page_id)     WHERE page_id     IS NOT NULL;
CREATE UNIQUE INDEX uq_reactions_author   ON reactions(reactor_id, reaction_type, author_id)   WHERE author_id   IS NOT NULL;

CREATE INDEX idx_reactions_reactor  ON reactions(reactor_id);
CREATE INDEX idx_reactions_story    ON reactions(story_id);
CREATE INDEX idx_reactions_universe ON reactions(universe_id);
CREATE INDEX idx_reactions_page     ON reactions(page_id);
CREATE INDEX idx_reactions_author_target ON reactions(author_id);

-- UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_authors_updated    BEFORE UPDATE ON authors    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_universes_updated  BEFORE UPDATE ON universes  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_stories_updated    BEFORE UPDATE ON stories    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_pages_updated      BEFORE UPDATE ON pages      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_characters_updated BEFORE UPDATE ON characters FOR EACH ROW EXECUTE FUNCTION set_updated_at();
