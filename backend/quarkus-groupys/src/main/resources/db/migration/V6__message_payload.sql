-- Structured message payloads (chat × music plan, ticket 0.1).
-- Lets a chat message carry a typed card payload (track/album/playlist/etc.) alongside text.
-- Dev/test build this via Hibernate schema-management; prod applies this migration.

ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS payload jsonb;
