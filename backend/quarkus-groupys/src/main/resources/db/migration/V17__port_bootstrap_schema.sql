-- Port SchemaBootstrapService DDL into Flyway so the prod schema matches the
-- JPA entities BEFORE Hibernate's boot-time `validate` runs. The bootstrap
-- service observes StartupEvent, which fires *after* the SessionFactory is
-- built, so under `HIBERNATE_SCHEMA_STRATEGY=validate` it can never satisfy
-- validation (boot fails first on the missing column). These statements own
-- the schema now; the bootstrap service is left in place only for the
-- conditional pgvector columns it manages at runtime.
--
-- Every statement is idempotent (IF NOT/EXISTS) so it is safe whether or not a
-- pre-Flyway bootstrap run already applied any of it to an environment.

-- Music snapshot split
ALTER TABLE music_source_snapshot ADD COLUMN IF NOT EXISTS object_key text;
ALTER TABLE music_source_snapshot ADD COLUMN IF NOT EXISTS payload_size_bytes bigint;
ALTER TABLE music_source_snapshot ADD COLUMN IF NOT EXISTS checksum varchar(64);

-- Apple Music hard-cutover
ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_music_user_token varchar(1024);
ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_music_connected_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_music_subscription_active boolean NOT NULL DEFAULT false;

ALTER TABLE artists ADD COLUMN IF NOT EXISTS apple_music_id varchar(64);
CREATE UNIQUE INDEX IF NOT EXISTS idx_artists_apple_music_id ON artists (apple_music_id);

ALTER TABLE albums ADD COLUMN IF NOT EXISTS apple_music_id varchar(64);
CREATE UNIQUE INDEX IF NOT EXISTS idx_albums_apple_music_id ON albums (apple_music_id);

ALTER TABLE tracks ADD COLUMN IF NOT EXISTS apple_music_id varchar(64);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tracks_apple_music_id ON tracks (apple_music_id);

ALTER TABLE genres ADD COLUMN IF NOT EXISTS apple_genre_id varchar(64);
CREATE UNIQUE INDEX IF NOT EXISTS idx_genres_apple_genre_id ON genres (apple_genre_id);

-- Apple Music hard-cutover — drop legacy Spotify columns (idempotent)
ALTER TABLE users DROP COLUMN IF EXISTS spotify_access_token;
ALTER TABLE users DROP COLUMN IF EXISTS spotify_refresh_token;
ALTER TABLE users DROP COLUMN IF EXISTS spotify_token_expiry;

-- Hot takes
CREATE TABLE IF NOT EXISTS hot_takes (
    id uuid PRIMARY KEY,
    question text NOT NULL,
    week_label varchar(20) NOT NULL,
    created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS hot_take_answers (
    id uuid PRIMARY KEY,
    hot_take_id uuid NOT NULL REFERENCES hot_takes(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    answer text NOT NULL,
    image_url text,
    music_type varchar(20),
    answered_at timestamptz NOT NULL,
    UNIQUE (hot_take_id, user_id)
);

ALTER TABLE hot_takes ADD COLUMN IF NOT EXISTS answer_type VARCHAR(20);
UPDATE hot_takes SET answer_type = 'ARTIST' WHERE answer_type IS NULL;
ALTER TABLE hot_takes ALTER COLUMN answer_type SET NOT NULL;
ALTER TABLE hot_takes ALTER COLUMN answer_type SET DEFAULT 'ARTIST';
ALTER TABLE hot_take_answers ADD COLUMN IF NOT EXISTS show_on_widget BOOLEAN;
UPDATE hot_take_answers SET show_on_widget = FALSE WHERE show_on_widget IS NULL;
ALTER TABLE hot_take_answers ALTER COLUMN show_on_widget SET NOT NULL;
ALTER TABLE hot_take_answers ALTER COLUMN show_on_widget SET DEFAULT FALSE;
ALTER TABLE hot_takes ADD COLUMN IF NOT EXISTS answer_count INT NOT NULL DEFAULT 1;
ALTER TABLE hot_take_answers ADD COLUMN IF NOT EXISTS music_type TEXT;
ALTER TABLE hot_take_answers ALTER COLUMN music_type TYPE TEXT;

-- Chat/feed read-model columns
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at timestamptz;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_preview text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS match_id uuid REFERENCES user_matches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at_desc ON conversations (last_message_at DESC);

ALTER TABLE posts ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS like_count bigint NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS dislike_count bigint NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS comment_count bigint NOT NULL DEFAULT 0;

ALTER TABLE comments ADD COLUMN IF NOT EXISTS like_count bigint NOT NULL DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS dislike_count bigint NOT NULL DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS reply_count bigint NOT NULL DEFAULT 0;

ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS unread_count integer NOT NULL DEFAULT 0;

-- Embedding metadata columns can exist even when the vector extension is
-- unavailable. The vector(768) columns + HNSW indexes stay in
-- SchemaBootstrapService because they are conditional on extension support and
-- are not Hibernate-mapped (so they do not participate in schema validation).
ALTER TABLE user_taste_profile ADD COLUMN IF NOT EXISTS embedding_status varchar(32) NOT NULL DEFAULT 'NONE';
ALTER TABLE user_taste_profile ADD COLUMN IF NOT EXISTS embedding_model varchar(64);
ALTER TABLE user_taste_profile ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;
ALTER TABLE community_taste_profile ADD COLUMN IF NOT EXISTS embedding_status varchar(32) NOT NULL DEFAULT 'NONE';
ALTER TABLE community_taste_profile ADD COLUMN IF NOT EXISTS embedding_model varchar(64);
ALTER TABLE community_taste_profile ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;
