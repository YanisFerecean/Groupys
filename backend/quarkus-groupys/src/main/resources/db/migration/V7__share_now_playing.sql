-- Now-playing presence sharing toggle (chat × music plan, ticket 1.1).
-- Dev/test build this via Hibernate schema-management; prod applies this migration.

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS share_now_playing boolean NOT NULL DEFAULT true;
