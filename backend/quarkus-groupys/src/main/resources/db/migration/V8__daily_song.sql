-- Ephemeral daily-song status (chat × music plan, ticket 5.2).
-- Dev/test build this via Hibernate schema-management; prod applies this migration.

CREATE TABLE IF NOT EXISTS public.daily_song (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT pk_daily_song PRIMARY KEY (id),
    CONSTRAINT uk_daily_song_user UNIQUE (user_id),
    CONSTRAINT fk_daily_song_user FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_daily_song_expires ON public.daily_song (expires_at);
