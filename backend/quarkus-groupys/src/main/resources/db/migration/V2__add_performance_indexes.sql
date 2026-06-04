-- Performance optimization indexes
-- Migration: V2__add_performance_indexes
-- Description: Add indexes on high-traffic columns to improve query performance

-- HotTake indexes for time-based queries
CREATE INDEX IF NOT EXISTS idx_hottake_weeklabel ON hot_takes(weeklabel);
CREATE INDEX IF NOT EXISTS idx_hottake_createdat ON hot_takes(createdat);

-- HotTakeAnswer indexes for user activity lookups
CREATE INDEX IF NOT EXISTS idx_hottakeanswer_userid_answeredat ON hot_take_answers(user_id, answeredat);

-- AlbumRating indexes for album lookups and user ratings
CREATE INDEX IF NOT EXISTS idx_albumrating_albumid_createdat ON album_ratings(album_id, createdat);
CREATE INDEX IF NOT EXISTS idx_albumrating_userid_score ON album_ratings(user_id, score);

-- PostMedia collection table index for post media ordering
CREATE INDEX IF NOT EXISTS idx_postmedia_postid_sortorder ON post_media(post_id, sort_order);
