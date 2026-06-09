-- Pinned conversation messages (chat x music plan, ticket 3.4).

CREATE TABLE IF NOT EXISTS public.conversation_pins (
    id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    message_id uuid NOT NULL,
    pinned_by uuid NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT conversation_pins_pkey PRIMARY KEY (id),
    CONSTRAINT uk_conversation_pin UNIQUE (conversation_id, message_id),
    CONSTRAINT fk_conversation_pin_conversation
        FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_conversation_pin_message
        FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE,
    CONSTRAINT fk_conversation_pin_user
        FOREIGN KEY (pinned_by) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversation_pin_conv
    ON public.conversation_pins (conversation_id);
