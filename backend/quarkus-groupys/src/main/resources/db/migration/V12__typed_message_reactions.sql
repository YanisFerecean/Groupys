-- Typed emoji / track reactions (chat x music plan, ticket 4.5).

CREATE TABLE IF NOT EXISTS public.message_reactions (
    id uuid NOT NULL,
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reaction_type varchar(16) NOT NULL DEFAULT 'emoji',
    reaction_key varchar(255) NOT NULL,
    emoji varchar(16),
    track_payload jsonb,
    created_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT message_reactions_pkey PRIMARY KEY (id),
    CONSTRAINT fk_message_reaction_message
        FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE,
    CONSTRAINT fk_message_reaction_user
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

ALTER TABLE public.message_reactions
    ADD COLUMN IF NOT EXISTS reaction_type varchar(16) DEFAULT 'emoji',
    ADD COLUMN IF NOT EXISTS reaction_key varchar(255),
    ADD COLUMN IF NOT EXISTS track_payload jsonb;

UPDATE public.message_reactions
SET reaction_type = COALESCE(reaction_type, 'emoji'),
    reaction_key = COALESCE(reaction_key, emoji)
WHERE reaction_type IS NULL OR reaction_key IS NULL;

ALTER TABLE public.message_reactions
    ALTER COLUMN reaction_type SET NOT NULL,
    ALTER COLUMN reaction_key SET NOT NULL,
    ALTER COLUMN emoji DROP NOT NULL;

ALTER TABLE public.message_reactions DROP CONSTRAINT IF EXISTS uk_message_reaction;
ALTER TABLE public.message_reactions DROP CONSTRAINT IF EXISTS uk_message_reaction_value;
ALTER TABLE public.message_reactions
    ADD CONSTRAINT uk_message_reaction_value
    UNIQUE (message_id, user_id, reaction_type, reaction_key);

CREATE INDEX IF NOT EXISTS idx_message_reaction_message
    ON public.message_reactions (message_id);
