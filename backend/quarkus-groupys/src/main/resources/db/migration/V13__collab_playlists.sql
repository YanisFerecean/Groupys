-- Server-built collaborative playlists for conversation threads (chat x music plan, ticket 6.1).

CREATE TABLE IF NOT EXISTS public.collab_playlists (
    id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    message_id uuid,
    created_by uuid NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT collab_playlists_pkey PRIMARY KEY (id),
    CONSTRAINT uk_collab_playlist_conversation UNIQUE (conversation_id),
    CONSTRAINT uk_collab_playlist_message UNIQUE (message_id),
    CONSTRAINT fk_collab_playlist_conversation
        FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_collab_playlist_message
        FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE SET NULL,
    CONSTRAINT fk_collab_playlist_creator
        FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.collab_playlist_tracks (
    id uuid NOT NULL,
    playlist_id uuid NOT NULL,
    added_by uuid NOT NULL,
    track_key varchar(255) NOT NULL,
    track_payload jsonb NOT NULL,
    position integer NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT collab_playlist_tracks_pkey PRIMARY KEY (id),
    CONSTRAINT uk_collab_playlist_track UNIQUE (playlist_id, track_key),
    CONSTRAINT fk_collab_playlist_track_playlist
        FOREIGN KEY (playlist_id) REFERENCES public.collab_playlists(id) ON DELETE CASCADE,
    CONSTRAINT fk_collab_playlist_track_user
        FOREIGN KEY (added_by) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_collab_playlist_track_order
    ON public.collab_playlist_tracks (playlist_id, position);
