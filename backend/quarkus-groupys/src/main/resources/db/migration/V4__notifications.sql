-- Push notifications: device tokens, per-user prefs, retention state, de-dupe ledger.
-- Dev/test build these via Hibernate schema-management; prod applies this migration.

-- Expo push tokens (multi-device per user).
CREATE TABLE public.device_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    expo_token text NOT NULL,
    platform character varying(16),
    created_at timestamp(6) with time zone NOT NULL,
    last_used_at timestamp(6) with time zone,
    CONSTRAINT pk_device_tokens PRIMARY KEY (id),
    CONSTRAINT fk_device_tokens_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX idx_device_tokens_expo_token ON public.device_tokens (expo_token);
CREATE INDEX idx_device_tokens_user_id ON public.device_tokens (user_id);

-- Per-user notification preferences (category toggles + quiet hours).
CREATE TABLE public.notification_prefs (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    matches_enabled boolean DEFAULT true NOT NULL,
    messages_enabled boolean DEFAULT true NOT NULL,
    community_enabled boolean DEFAULT true NOT NULL,
    hot_takes_enabled boolean DEFAULT true NOT NULL,
    retention_enabled boolean DEFAULT true NOT NULL,
    quiet_start_minute integer,
    quiet_end_minute integer,
    timezone character varying(64),
    CONSTRAINT pk_notification_prefs PRIMARY KEY (id),
    CONSTRAINT fk_notification_prefs_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX idx_notification_prefs_user_id ON public.notification_prefs (user_id);

-- Daily hot-take streaks.
CREATE TABLE public.hot_take_streaks (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    current_streak integer DEFAULT 0 NOT NULL,
    longest_streak integer DEFAULT 0 NOT NULL,
    last_answer_date date,
    CONSTRAINT pk_hot_take_streaks PRIMARY KEY (id),
    CONSTRAINT fk_hot_take_streaks_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX idx_hot_take_streaks_user_id ON public.hot_take_streaks (user_id);

-- Profile views (counts only feed the teaser).
CREATE TABLE public.profile_views (
    id uuid NOT NULL,
    viewer_id uuid NOT NULL,
    viewed_id uuid NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT pk_profile_views PRIMARY KEY (id),
    CONSTRAINT fk_profile_views_viewer FOREIGN KEY (viewer_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_profile_views_viewed FOREIGN KEY (viewed_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_profile_views_viewed_created ON public.profile_views (viewed_id, created_at);
CREATE INDEX idx_profile_views_viewer_id ON public.profile_views (viewer_id);

-- De-dupe ledger for scheduled / one-shot notifications.
CREATE TABLE public.notification_logs (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    type character varying(48) NOT NULL,
    ref_key character varying(128) NOT NULL,
    sent_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT pk_notification_logs PRIMARY KEY (id),
    CONSTRAINT uq_notification_logs_dedupe UNIQUE (user_id, type, ref_key)
);
CREATE INDEX idx_notification_logs_user_type ON public.notification_logs (user_id, type);
