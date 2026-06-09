-- Message edit flag (chat × music plan, ticket 3.3).
-- Dev/test build this via Hibernate schema-management; prod applies this migration.

ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS edited boolean NOT NULL DEFAULT false;
