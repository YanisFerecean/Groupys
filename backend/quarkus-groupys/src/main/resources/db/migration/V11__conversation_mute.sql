-- Per-participant conversation mute expiry (chat x music plan, ticket 3.6).

ALTER TABLE public.conversation_participants
    ADD COLUMN IF NOT EXISTS muted_until timestamp(6) with time zone;
