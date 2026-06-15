-- In-app notifications: a follower is notified when a followed entity gains new
-- child content. author → new universe/story · universe → new story · story → new page.
-- (Pages are not followable, so there is no page-level notification.)

CREATE TYPE notification_type AS ENUM ('new_universe', 'new_story', 'new_page');

CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES authors(id) ON DELETE CASCADE,  -- the follower
  actor_id     UUID REFERENCES authors(id) ON DELETE SET NULL,          -- who created the content
  type         notification_type NOT NULL,
  source_type  TEXT NOT NULL,        -- the followed entity: 'author' | 'universe' | 'story'
  source_id    UUID NOT NULL,
  entity_id    UUID NOT NULL,        -- the newly created entity
  title        TEXT NOT NULL,        -- entity title / snippet for display
  url          TEXT NOT NULL,        -- deep link to the new content
  read         BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_recipient_idx ON notifications (recipient_id, created_at DESC);
CREATE INDEX notifications_unread_idx    ON notifications (recipient_id) WHERE read = false;
