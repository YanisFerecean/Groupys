CREATE TABLE community_blacklisted_words (
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    word         TEXT NOT NULL,
    CONSTRAINT pk_community_blacklisted_words PRIMARY KEY (community_id, word)
);

CREATE INDEX idx_community_blacklisted_words_community_id
    ON community_blacklisted_words(community_id);
