-- Scheduled position-only listening parties (chat x music plan, ticket 6.2).

CREATE TABLE IF NOT EXISTS public.listening_parties (
    id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    host_id uuid NOT NULL,
    start_at timestamp(6) with time zone NOT NULL,
    track_payload jsonb NOT NULL,
    status varchar(16) NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT listening_parties_pkey PRIMARY KEY (id),
    CONSTRAINT fk_listening_party_conversation
        FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_listening_party_host
        FOREIGN KEY (host_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_listening_party_due
    ON public.listening_parties (status, start_at);
CREATE INDEX IF NOT EXISTS idx_listening_party_conversation
    ON public.listening_parties (conversation_id, start_at DESC);
