-- This file allow to write SQL commands that will be emitted in test and dev.
-- The commands are commented as their support depends of the database
-- insert into myentity (id, field) values(1, 'field-1');
-- insert into myentity (id, field) values(2, 'field-2');
-- insert into myentity (id, field) values(3, 'field-3');
-- alter sequence myentity_seq restart with 4;

-- Functional indexes for case-insensitive user search (LOWER() + LIKE bypasses standard B-tree indexes)
CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_users_display_name_lower ON users (LOWER(display_name));

-- Functional index for case-insensitive community name search
CREATE INDEX IF NOT EXISTS idx_communities_name_lower ON communities (LOWER(name));