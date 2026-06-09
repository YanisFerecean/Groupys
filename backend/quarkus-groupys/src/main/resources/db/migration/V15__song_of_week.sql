-- Weekly community song poll, reaction-style votes, and pinned winner recap (ticket 6.4).

CREATE TABLE IF NOT EXISTS public.song_of_week_polls (
    id uuid NOT NULL,
    community_id uuid NOT NULL,
    week_start date NOT NULL,
    status varchar(16) NOT NULL,
    winner_candidate_id uuid,
    recap text,
    pinned_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone NOT NULL,
    closed_at timestamp(6) with time zone,
    CONSTRAINT song_of_week_polls_pkey PRIMARY KEY (id),
    CONSTRAINT uk_song_week_community UNIQUE (community_id, week_start),
    CONSTRAINT fk_song_week_community
        FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.song_of_week_candidates (
    id uuid NOT NULL,
    poll_id uuid NOT NULL,
    submitted_by uuid NOT NULL,
    track_key varchar(255) NOT NULL,
    track_payload jsonb NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT song_of_week_candidates_pkey PRIMARY KEY (id),
    CONSTRAINT uk_song_week_candidate_track UNIQUE (poll_id, track_key),
    CONSTRAINT fk_song_week_candidate_poll
        FOREIGN KEY (poll_id) REFERENCES public.song_of_week_polls(id) ON DELETE CASCADE,
    CONSTRAINT fk_song_week_candidate_user
        FOREIGN KEY (submitted_by) REFERENCES public.users(id) ON DELETE CASCADE
);

ALTER TABLE public.song_of_week_polls
    ADD CONSTRAINT fk_song_week_winner
    FOREIGN KEY (winner_candidate_id) REFERENCES public.song_of_week_candidates(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.song_of_week_votes (
    id uuid NOT NULL,
    poll_id uuid NOT NULL,
    candidate_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT song_of_week_votes_pkey PRIMARY KEY (id),
    CONSTRAINT uk_song_week_vote UNIQUE (poll_id, user_id),
    CONSTRAINT fk_song_week_vote_poll
        FOREIGN KEY (poll_id) REFERENCES public.song_of_week_polls(id) ON DELETE CASCADE,
    CONSTRAINT fk_song_week_vote_candidate
        FOREIGN KEY (candidate_id) REFERENCES public.song_of_week_candidates(id) ON DELETE CASCADE,
    CONSTRAINT fk_song_week_vote_user
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_song_week_status ON public.song_of_week_polls (status, week_start);
CREATE INDEX IF NOT EXISTS idx_song_week_candidate_poll ON public.song_of_week_candidates (poll_id, created_at);
CREATE INDEX IF NOT EXISTS idx_song_week_vote_candidate ON public.song_of_week_votes (candidate_id);
