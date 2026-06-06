-- UGC moderation: user blocks + reports (App Store Review Guidelines 1.2 / 3.2.1).
-- Dev/test build these via Hibernate schema-management; prod applies this migration.

-- User-to-user blocks. Blocking is one-directional but enforced both ways at read time.
CREATE TABLE public.user_blocks (
    id uuid NOT NULL,
    blocker_id uuid NOT NULL,
    blocked_id uuid NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT pk_user_blocks PRIMARY KEY (id),
    CONSTRAINT uk_user_blocks_pair UNIQUE (blocker_id, blocked_id),
    CONSTRAINT fk_user_blocks_blocker FOREIGN KEY (blocker_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_blocks_blocked FOREIGN KEY (blocked_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_user_blocks_blocker ON public.user_blocks (blocker_id);
CREATE INDEX idx_user_blocks_blocked ON public.user_blocks (blocked_id);

-- Abuse reports against a user / message / post / community, persisted for admin review.
CREATE TABLE public.reports (
    id uuid NOT NULL,
    reporter_id uuid NOT NULL,
    target_type character varying(16) NOT NULL,
    target_id uuid NOT NULL,
    reason character varying(32) NOT NULL,
    details text,
    status character varying(16) DEFAULT 'PENDING' NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT pk_reports PRIMARY KEY (id),
    CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_reports_status_created ON public.reports (status, created_at);
CREATE INDEX idx_reports_reporter ON public.reports (reporter_id);
CREATE INDEX idx_reports_target ON public.reports (target_type, target_id);
