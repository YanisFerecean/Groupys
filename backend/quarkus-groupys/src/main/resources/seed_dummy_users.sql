-- =============================================================================
-- Dummy user seed — 50 users with varied music taste profiles
-- Run via:  docker exec -i groupys-db psql -U app -d db -f - < seed_dummy_users.sql
-- Safe to re-run: uses ON CONFLICT DO NOTHING / DO UPDATE everywhere.
-- =============================================================================

-- ─── Genres (insert by name; use whatever ID already exists) ─────────────────
INSERT INTO genres (name, deezer_id) VALUES
  ('Hip-Hop',     132),
  ('R&B',         165),
  ('Pop',         132),
  ('Rock',        152),
  ('Indie',       85),
  ('Electronic',  106),
  ('Jazz',        129),
  ('Trap',        116),
  ('Afrobeats',   464),
  ('Latin',       197),
  ('Country',     6),
  ('Alternative', 85)
ON CONFLICT (name) DO NOTHING;

-- ─── Artists (IDs in the 9_000_000 range won't clash with real Deezer data) ──
INSERT INTO artists (id, name, spotify_id, popularity_score, genres_enriched) VALUES
  (9000001,'The Weeknd',       'seed_weeknd',     0.98,false),
  (9000002,'Drake',            'seed_drake',      0.97,false),
  (9000003,'Kendrick Lamar',   'seed_kendrick',   0.96,false),
  (9000004,'Travis Scott',     'seed_travis',     0.94,false),
  (9000005,'J. Cole',          'seed_jcole',      0.93,false),
  (9000006,'Future',           'seed_future',     0.91,false),
  (9000007,'Lil Baby',         'seed_lilbaby',    0.90,false),
  (9000008,'Playboi Carti',    'seed_carti',      0.88,false),
  (9000009,'21 Savage',        'seed_21savage',   0.89,false),
  (9000010,'Metro Boomin',     'seed_metro',      0.87,false),
  (9000011,'Frank Ocean',      'seed_frank',      0.95,false),
  (9000012,'SZA',              'seed_sza',        0.94,false),
  (9000013,'Doja Cat',         'seed_doja',       0.92,false),
  (9000014,'Tyler The Creator','seed_tyler',      0.93,false),
  (9000015,'Steve Lacy',       'seed_stevelacy',  0.88,false),
  (9000016,'Taylor Swift',     'seed_taylor',     0.99,false),
  (9000017,'Olivia Rodrigo',   'seed_olivia',     0.94,false),
  (9000018,'Dua Lipa',         'seed_dualipa',    0.93,false),
  (9000019,'Harry Styles',     'seed_harry',      0.92,false),
  (9000020,'Ariana Grande',    'seed_ariana',     0.95,false),
  (9000021,'Arctic Monkeys',   'seed_arctic',     0.91,false),
  (9000022,'Tame Impala',      'seed_tame',       0.90,false),
  (9000023,'Phoebe Bridgers',  'seed_phoebe',     0.87,false),
  (9000024,'Bon Iver',         'seed_boniver',    0.85,false),
  (9000025,'Vampire Weekend',  'seed_vampire',    0.83,false),
  (9000026,'Disclosure',       'seed_disclosure', 0.86,false),
  (9000027,'Fred again..',     'seed_fredagain',  0.88,false),
  (9000028,'Four Tet',         'seed_fourtet',    0.84,false),
  (9000029,'Burna Boy',        'seed_burna',      0.92,false),
  (9000030,'Bad Bunny',        'seed_badbunny',   0.96,false)
ON CONFLICT (id) DO NOTHING;

-- ─── Seed user staging table ──────────────────────────────────────────────────
CREATE TEMP TABLE _su (
  idx          INT PRIMARY KEY,
  username     TEXT,
  display_name TEXT,
  cc           CHAR(2),
  bio          TEXT
);

INSERT INTO _su VALUES
  (1,'zara_sounds',   'Zara',   'US','Chasing bass drops and good vibes.'),
  (2,'marcus_vibe',   'Marcus', 'US','Hip-hop head. Always got a playlist ready.'),
  (3,'soph_indie',    'Sophie', 'GB','Indie girl. Coffee and guitar solos.'),
  (4,'jay_trap',      'Jay',    'US','Trap music is life. No skips.'),
  (5,'elena_groove',  'Elena',  'FR','French electronic scene obsessive.'),
  (6,'noel_uk',       'Noel',   'GB','UK indie forever. Glastonbury veteran.'),
  (7,'priya_rnb',     'Priya',  'IN','R&B and soul is my entire personality.'),
  (8,'felix_elec',    'Felix',  'DE','Techno, house, and late nights.'),
  (9,'amara_afro',    'Amara',  'NG','Afrobeats put me on. Burna or nothing.'),
  (10,'carlos_latin', 'Carlos', 'MX','Latin vibes only. Reggaeton + salsa.'),
  (11,'luna_pop',     'Luna',   'US','Pop music is art, fight me.'),
  (12,'hassan_hip',   'Hassan', 'NG','Nigerian rap and Afrobeats daily.'),
  (13,'claire_indie', 'Claire', 'GB','Big on bedroom pop and sad girl hours.'),
  (14,'dom_trap',     'Dom',    'US','Off-white 808s and heartbreak.'),
  (15,'yuki_jazz',    'Yuki',   'JP','Jazz piano player. Miles Davis disciple.'),
  (16,'brie_pop',     'Brie',   'US','Taylor Swift biggest advocate.'),
  (17,'kwame_afro',   'Kwame',  'GH','Afrobeats from Accra to everywhere.'),
  (18,'tom_rock',     'Tom',    'GB','Classic rock and modern indie hybrid.'),
  (19,'nia_rnb',      'Nia',    'US','SZA saved my life, not joking.'),
  (20,'alex_elec',    'Alex',   'DE','Modular synths and club nights.'),
  (21,'mia_country',  'Mia',    'US','Country music and long drives.'),
  (22,'sam_alt',      'Sam',    'AU','Alternative and art rock explorer.'),
  (23,'jade_rnb',     'Jade',   'GB','Late night R&B and wine.'),
  (24,'leo_trap',     'Leo',    'US','Dark trap, dark moods, dark drops.'),
  (25,'iris_pop',     'Iris',   'FR','Pop maximalism enjoyer.'),
  (26,'oscar_indie',  'Oscar',  'GB','Shoegaze and indie folk connoisseur.'),
  (27,'fatou_afro',   'Fatou',  'SN','Dakar raised, Afrobeats soul.'),
  (28,'nina_jazz',    'Nina',   'FR','Jazz fusion and bossa nova.'),
  (29,'ryo_elec',     'Ryo',    'JP','Japanese city pop and ambient.'),
  (30,'chloe_pop',    'Chloe',  'US','Pop hooks are an art form.'),
  (31,'dante_hip',    'Dante',  'US','Kendrick on repeat since 2012.'),
  (32,'eva_indie',    'Eva',    'GB','Alt-folk and rainy day playlists.'),
  (33,'max_rock',     'Max',    'DE','Metal to shoegaze pipeline.'),
  (34,'zoe_rnb',      'Zoe',    'US','R&B discoveries every Sunday.'),
  (35,'kai_elec',     'Kai',    'KR','K-pop and electronic crossover.'),
  (36,'ada_afro',     'Ada',    'NG','Afrobeats dance floor curator.'),
  (37,'luca_pop',     'Luca',   'IT','Italian indie pop and aperitivo.'),
  (38,'ines_latin',   'Ines',   'MX','Latinx music across all decades.'),
  (39,'rex_trap',     'Rex',    'US','Trap and drill enthusiast.'),
  (40,'maya_indie',   'Maya',   'AU','Bush walking with Tame Impala on.'),
  (41,'ben_rock',     'Ben',    'GB','Post-punk and new wave forever.'),
  (42,'sora_elec',    'Sora',   'JP','Lo-fi electronic producer in spare time.'),
  (43,'temi_afro',    'Temi',   'NG','Lagos born, Afrobeats raised.'),
  (44,'ava_pop',      'Ava',    'US','Pure pop perfection seeker.'),
  (45,'jude_hip',     'Jude',   'US','Old school hip-hop meets new school.'),
  (46,'lena_indie',   'Lena',   'DE','Indie rock and hiking playlists.'),
  (47,'omar_hip',     'Omar',   'EG','Cairo rap and hip-hop fusion.'),
  (48,'nadia_rnb',    'Nadia',  'US','SZA, Frank, and late-night R&B.'),
  (49,'finn_rock',    'Finn',   'IE','Irish rock, sea, and sadness.'),
  (50,'mika_elec',    'Mika',   'SE','Scandinavian electronic and minimal.');

-- Insert users (ON CONFLICT to make it re-runnable)
INSERT INTO users (id, clerk_id, username, display_name, bio, country_code,
                   discovery_visible, recommendation_opt_out, date_joined, last_seen_at)
SELECT
  gen_random_uuid(),
  'seed_clerk_' || idx,
  username, display_name, bio, cc,
  true, false,
  NOW() - (random() * INTERVAL '180 days'),
  NOW() - (random() * INTERVAL '3 days')
FROM _su
ON CONFLICT (username) DO UPDATE
  SET clerk_id     = EXCLUDED.clerk_id,
      display_name = EXCLUDED.display_name,
      bio          = EXCLUDED.bio,
      country_code = EXCLUDED.country_code;

-- ─── Artist preference staging ────────────────────────────────────────────────
CREATE TEMP TABLE _sap (
  username  TEXT,
  artist_id BIGINT,
  rank_pos  INT
);

INSERT INTO _sap VALUES
-- u01 zara_sounds (r&b / trap / pop)
('zara_sounds',9000001,1),('zara_sounds',9000012,2),('zara_sounds',9000013,3),
('zara_sounds',9000014,4),('zara_sounds',9000011,5),('zara_sounds',9000002,6),
('zara_sounds',9000004,7),('zara_sounds',9000007,8),('zara_sounds',9000010,9),
('zara_sounds',9000006,10),
-- u02 marcus_vibe (hip-hop / trap)
('marcus_vibe',9000002,1),('marcus_vibe',9000003,2),('marcus_vibe',9000005,3),
('marcus_vibe',9000004,4),('marcus_vibe',9000006,5),('marcus_vibe',9000007,6),
('marcus_vibe',9000009,7),('marcus_vibe',9000010,8),('marcus_vibe',9000001,9),
('marcus_vibe',9000008,10),
-- u03 soph_indie (indie / alternative)
('soph_indie',9000021,1),('soph_indie',9000022,2),('soph_indie',9000023,3),
('soph_indie',9000024,4),('soph_indie',9000025,5),('soph_indie',9000015,6),
('soph_indie',9000014,7),('soph_indie',9000011,8),('soph_indie',9000018,9),
('soph_indie',9000019,10),
-- u04 jay_trap (trap / hip-hop)
('jay_trap',9000004,1),('jay_trap',9000008,2),('jay_trap',9000006,3),
('jay_trap',9000009,4),('jay_trap',9000010,5),('jay_trap',9000007,6),
('jay_trap',9000002,7),('jay_trap',9000001,8),('jay_trap',9000003,9),
('jay_trap',9000005,10),
-- u05 elena_groove (electronic / pop)
('elena_groove',9000026,1),('elena_groove',9000027,2),('elena_groove',9000028,3),
('elena_groove',9000022,4),('elena_groove',9000018,5),('elena_groove',9000013,6),
('elena_groove',9000020,7),('elena_groove',9000019,8),('elena_groove',9000017,9),
('elena_groove',9000016,10),
-- u06 noel_uk (indie / electronic / r&b)
('noel_uk',9000021,1),('noel_uk',9000022,2),('noel_uk',9000025,3),
('noel_uk',9000023,4),('noel_uk',9000024,5),('noel_uk',9000026,6),
('noel_uk',9000028,7),('noel_uk',9000015,8),('noel_uk',9000011,9),
('noel_uk',9000012,10),
-- u07 priya_rnb (r&b / pop)
('priya_rnb',9000012,1),('priya_rnb',9000011,2),('priya_rnb',9000014,3),
('priya_rnb',9000015,4),('priya_rnb',9000013,5),('priya_rnb',9000001,6),
('priya_rnb',9000002,7),('priya_rnb',9000020,8),('priya_rnb',9000018,9),
('priya_rnb',9000016,10),
-- u08 felix_elec (electronic / indie / r&b)
('felix_elec',9000026,1),('felix_elec',9000027,2),('felix_elec',9000028,3),
('felix_elec',9000022,4),('felix_elec',9000021,5),('felix_elec',9000024,6),
('felix_elec',9000015,7),('felix_elec',9000018,8),('felix_elec',9000013,9),
('felix_elec',9000012,10),
-- u09 amara_afro (afrobeats / hip-hop)
('amara_afro',9000029,1),('amara_afro',9000030,2),('amara_afro',9000002,3),
('amara_afro',9000001,4),('amara_afro',9000004,5),('amara_afro',9000006,6),
('amara_afro',9000010,7),('amara_afro',9000009,8),('amara_afro',9000007,9),
('amara_afro',9000003,10),
-- u10 carlos_latin (latin / afrobeats / pop)
('carlos_latin',9000030,1),('carlos_latin',9000029,2),('carlos_latin',9000013,3),
('carlos_latin',9000020,4),('carlos_latin',9000018,5),('carlos_latin',9000016,6),
('carlos_latin',9000002,7),('carlos_latin',9000001,8),('carlos_latin',9000006,9),
('carlos_latin',9000004,10),
-- u11 luna_pop (pop / r&b)
('luna_pop',9000016,1),('luna_pop',9000020,2),('luna_pop',9000017,3),
('luna_pop',9000018,4),('luna_pop',9000013,5),('luna_pop',9000019,6),
('luna_pop',9000012,7),('luna_pop',9000001,8),('luna_pop',9000011,9),
('luna_pop',9000015,10),
-- u12 hassan_hip (afrobeats / hip-hop)
('hassan_hip',9000029,1),('hassan_hip',9000002,2),('hassan_hip',9000003,3),
('hassan_hip',9000004,4),('hassan_hip',9000006,5),('hassan_hip',9000007,6),
('hassan_hip',9000010,7),('hassan_hip',9000009,8),('hassan_hip',9000005,9),
('hassan_hip',9000001,10),
-- u13 claire_indie (indie / electronic / r&b)
('claire_indie',9000023,1),('claire_indie',9000024,2),('claire_indie',9000022,3),
('claire_indie',9000021,4),('claire_indie',9000025,5),('claire_indie',9000026,6),
('claire_indie',9000028,7),('claire_indie',9000011,8),('claire_indie',9000012,9),
('claire_indie',9000015,10),
-- u14 dom_trap (trap / hip-hop)
('dom_trap',9000008,1),('dom_trap',9000004,2),('dom_trap',9000006,3),
('dom_trap',9000009,4),('dom_trap',9000010,5),('dom_trap',9000007,6),
('dom_trap',9000002,7),('dom_trap',9000001,8),('dom_trap',9000005,9),
('dom_trap',9000003,10),
-- u15 yuki_jazz (jazz / r&b / indie)
('yuki_jazz',9000011,1),('yuki_jazz',9000015,2),('yuki_jazz',9000014,3),
('yuki_jazz',9000012,4),('yuki_jazz',9000013,5),('yuki_jazz',9000022,6),
('yuki_jazz',9000021,7),('yuki_jazz',9000024,8),('yuki_jazz',9000026,9),
('yuki_jazz',9000023,10),
-- u16 brie_pop (pop / r&b)
('brie_pop',9000016,1),('brie_pop',9000017,2),('brie_pop',9000020,3),
('brie_pop',9000018,4),('brie_pop',9000019,5),('brie_pop',9000013,6),
('brie_pop',9000012,7),('brie_pop',9000001,8),('brie_pop',9000011,9),
('brie_pop',9000015,10),
-- u17 kwame_afro (afrobeats / hip-hop)
('kwame_afro',9000029,1),('kwame_afro',9000030,2),('kwame_afro',9000002,3),
('kwame_afro',9000003,4),('kwame_afro',9000004,5),('kwame_afro',9000006,6),
('kwame_afro',9000009,7),('kwame_afro',9000010,8),('kwame_afro',9000001,9),
('kwame_afro',9000005,10),
-- u18 tom_rock (rock / indie / electronic)
('tom_rock',9000021,1),('tom_rock',9000025,2),('tom_rock',9000022,3),
('tom_rock',9000023,4),('tom_rock',9000024,5),('tom_rock',9000026,6),
('tom_rock',9000027,7),('tom_rock',9000011,8),('tom_rock',9000015,9),
('tom_rock',9000014,10),
-- u19 nia_rnb (r&b / pop)
('nia_rnb',9000012,1),('nia_rnb',9000011,2),('nia_rnb',9000014,3),
('nia_rnb',9000015,4),('nia_rnb',9000013,5),('nia_rnb',9000001,6),
('nia_rnb',9000020,7),('nia_rnb',9000002,8),('nia_rnb',9000018,9),
('nia_rnb',9000017,10),
-- u20 alex_elec (electronic / indie / r&b)
('alex_elec',9000027,1),('alex_elec',9000026,2),('alex_elec',9000028,3),
('alex_elec',9000022,4),('alex_elec',9000018,5),('alex_elec',9000013,6),
('alex_elec',9000012,7),('alex_elec',9000024,8),('alex_elec',9000021,9),
('alex_elec',9000015,10),
-- u21 mia_country (country / pop / indie)
('mia_country',9000016,1),('mia_country',9000017,2),('mia_country',9000020,3),
('mia_country',9000019,4),('mia_country',9000018,5),('mia_country',9000023,6),
('mia_country',9000024,7),('mia_country',9000025,8),('mia_country',9000022,9),
('mia_country',9000021,10),
-- u22 sam_alt (indie / alternative / electronic)
('sam_alt',9000022,1),('sam_alt',9000021,2),('sam_alt',9000025,3),
('sam_alt',9000023,4),('sam_alt',9000024,5),('sam_alt',9000026,6),
('sam_alt',9000028,7),('sam_alt',9000011,8),('sam_alt',9000015,9),
('sam_alt',9000014,10),
-- u23 jade_rnb (r&b / pop / hip-hop)
('jade_rnb',9000012,1),('jade_rnb',9000011,2),('jade_rnb',9000013,3),
('jade_rnb',9000014,4),('jade_rnb',9000015,5),('jade_rnb',9000001,6),
('jade_rnb',9000002,7),('jade_rnb',9000020,8),('jade_rnb',9000017,9),
('jade_rnb',9000016,10),
-- u24 leo_trap (trap / hip-hop)
('leo_trap',9000004,1),('leo_trap',9000008,2),('leo_trap',9000010,3),
('leo_trap',9000006,4),('leo_trap',9000009,5),('leo_trap',9000007,6),
('leo_trap',9000002,7),('leo_trap',9000003,8),('leo_trap',9000001,9),
('leo_trap',9000005,10),
-- u25 iris_pop (pop / r&b / electronic)
('iris_pop',9000016,1),('iris_pop',9000018,2),('iris_pop',9000020,3),
('iris_pop',9000019,4),('iris_pop',9000017,5),('iris_pop',9000013,6),
('iris_pop',9000012,7),('iris_pop',9000001,8),('iris_pop',9000011,9),
('iris_pop',9000026,10),
-- u26 oscar_indie (indie / electronic / r&b)
('oscar_indie',9000021,1),('oscar_indie',9000022,2),('oscar_indie',9000024,3),
('oscar_indie',9000023,4),('oscar_indie',9000025,5),('oscar_indie',9000028,6),
('oscar_indie',9000015,7),('oscar_indie',9000011,8),('oscar_indie',9000026,9),
('oscar_indie',9000027,10),
-- u27 fatou_afro (afrobeats / pop)
('fatou_afro',9000029,1),('fatou_afro',9000030,2),('fatou_afro',9000013,3),
('fatou_afro',9000002,4),('fatou_afro',9000004,5),('fatou_afro',9000006,6),
('fatou_afro',9000010,7),('fatou_afro',9000001,8),('fatou_afro',9000020,9),
('fatou_afro',9000009,10),
-- u28 nina_jazz (jazz / r&b / electronic)
('nina_jazz',9000011,1),('nina_jazz',9000015,2),('nina_jazz',9000014,3),
('nina_jazz',9000012,4),('nina_jazz',9000013,5),('nina_jazz',9000022,6),
('nina_jazz',9000024,7),('nina_jazz',9000023,8),('nina_jazz',9000026,9),
('nina_jazz',9000028,10),
-- u29 ryo_elec (electronic / indie / r&b)
('ryo_elec',9000028,1),('ryo_elec',9000026,2),('ryo_elec',9000027,3),
('ryo_elec',9000022,4),('ryo_elec',9000024,5),('ryo_elec',9000021,6),
('ryo_elec',9000015,7),('ryo_elec',9000011,8),('ryo_elec',9000012,9),
('ryo_elec',9000013,10),
-- u30 chloe_pop (pop / r&b)
('chloe_pop',9000016,1),('chloe_pop',9000020,2),('chloe_pop',9000018,3),
('chloe_pop',9000017,4),('chloe_pop',9000019,5),('chloe_pop',9000013,6),
('chloe_pop',9000001,7),('chloe_pop',9000012,8),('chloe_pop',9000011,9),
('chloe_pop',9000015,10),
-- u31 dante_hip (hip-hop / r&b)
('dante_hip',9000003,1),('dante_hip',9000002,2),('dante_hip',9000005,3),
('dante_hip',9000004,4),('dante_hip',9000001,5),('dante_hip',9000006,6),
('dante_hip',9000009,7),('dante_hip',9000010,8),('dante_hip',9000007,9),
('dante_hip',9000011,10),
-- u32 eva_indie (indie / r&b / electronic)
('eva_indie',9000023,1),('eva_indie',9000024,2),('eva_indie',9000021,3),
('eva_indie',9000022,4),('eva_indie',9000025,5),('eva_indie',9000027,6),
('eva_indie',9000026,7),('eva_indie',9000011,8),('eva_indie',9000012,9),
('eva_indie',9000015,10),
-- u33 max_rock (rock / indie / electronic)
('max_rock',9000021,1),('max_rock',9000022,2),('max_rock',9000025,3),
('max_rock',9000023,4),('max_rock',9000024,5),('max_rock',9000027,6),
('max_rock',9000026,7),('max_rock',9000011,8),('max_rock',9000015,9),
('max_rock',9000014,10),
-- u34 zoe_rnb (r&b / pop)
('zoe_rnb',9000012,1),('zoe_rnb',9000011,2),('zoe_rnb',9000014,3),
('zoe_rnb',9000015,4),('zoe_rnb',9000013,5),('zoe_rnb',9000001,6),
('zoe_rnb',9000020,7),('zoe_rnb',9000018,8),('zoe_rnb',9000017,9),
('zoe_rnb',9000016,10),
-- u35 kai_elec (electronic / r&b / indie)
('kai_elec',9000027,1),('kai_elec',9000026,2),('kai_elec',9000028,3),
('kai_elec',9000022,4),('kai_elec',9000018,5),('kai_elec',9000013,6),
('kai_elec',9000024,7),('kai_elec',9000021,8),('kai_elec',9000015,9),
('kai_elec',9000012,10),
-- u36 ada_afro (afrobeats / hip-hop / pop)
('ada_afro',9000029,1),('ada_afro',9000030,2),('ada_afro',9000013,3),
('ada_afro',9000002,4),('ada_afro',9000004,5),('ada_afro',9000001,6),
('ada_afro',9000006,7),('ada_afro',9000010,8),('ada_afro',9000020,9),
('ada_afro',9000009,10),
-- u37 luca_pop (pop / r&b)
('luca_pop',9000016,1),('luca_pop',9000020,2),('luca_pop',9000017,3),
('luca_pop',9000018,4),('luca_pop',9000019,5),('luca_pop',9000013,6),
('luca_pop',9000012,7),('luca_pop',9000011,8),('luca_pop',9000015,9),
('luca_pop',9000001,10),
-- u38 ines_latin (latin / afrobeats / pop)
('ines_latin',9000030,1),('ines_latin',9000029,2),('ines_latin',9000013,3),
('ines_latin',9000020,4),('ines_latin',9000018,5),('ines_latin',9000016,6),
('ines_latin',9000001,7),('ines_latin',9000002,8),('ines_latin',9000004,9),
('ines_latin',9000006,10),
-- u39 rex_trap (trap / hip-hop)
('rex_trap',9000004,1),('rex_trap',9000008,2),('rex_trap',9000006,3),
('rex_trap',9000010,4),('rex_trap',9000009,5),('rex_trap',9000007,6),
('rex_trap',9000002,7),('rex_trap',9000001,8),('rex_trap',9000003,9),
('rex_trap',9000005,10),
-- u40 maya_indie (indie / r&b / electronic)
('maya_indie',9000022,1),('maya_indie',9000021,2),('maya_indie',9000023,3),
('maya_indie',9000024,4),('maya_indie',9000025,5),('maya_indie',9000028,6),
('maya_indie',9000026,7),('maya_indie',9000015,8),('maya_indie',9000011,9),
('maya_indie',9000012,10),
-- u41 ben_rock (rock / indie / r&b)
('ben_rock',9000021,1),('ben_rock',9000025,2),('ben_rock',9000022,3),
('ben_rock',9000024,4),('ben_rock',9000023,5),('ben_rock',9000027,6),
('ben_rock',9000026,7),('ben_rock',9000011,8),('ben_rock',9000014,9),
('ben_rock',9000015,10),
-- u42 sora_elec (electronic / indie / pop)
('sora_elec',9000026,1),('sora_elec',9000027,2),('sora_elec',9000028,3),
('sora_elec',9000022,4),('sora_elec',9000024,5),('sora_elec',9000021,6),
('sora_elec',9000018,7),('sora_elec',9000013,8),('sora_elec',9000012,9),
('sora_elec',9000015,10),
-- u43 temi_afro (afrobeats / hip-hop)
('temi_afro',9000029,1),('temi_afro',9000030,2),('temi_afro',9000002,3),
('temi_afro',9000003,4),('temi_afro',9000004,5),('temi_afro',9000001,6),
('temi_afro',9000006,7),('temi_afro',9000007,8),('temi_afro',9000009,9),
('temi_afro',9000010,10),
-- u44 ava_pop (pop / r&b)
('ava_pop',9000016,1),('ava_pop',9000020,2),('ava_pop',9000018,3),
('ava_pop',9000017,4),('ava_pop',9000019,5),('ava_pop',9000013,6),
('ava_pop',9000012,7),('ava_pop',9000001,8),('ava_pop',9000011,9),
('ava_pop',9000015,10),
-- u45 jude_hip (hip-hop / r&b)
('jude_hip',9000003,1),('jude_hip',9000002,2),('jude_hip',9000005,3),
('jude_hip',9000004,4),('jude_hip',9000001,5),('jude_hip',9000011,6),
('jude_hip',9000014,7),('jude_hip',9000012,8),('jude_hip',9000013,9),
('jude_hip',9000006,10),
-- u46 lena_indie (indie / electronic / r&b)
('lena_indie',9000021,1),('lena_indie',9000022,2),('lena_indie',9000023,3),
('lena_indie',9000024,4),('lena_indie',9000025,5),('lena_indie',9000026,6),
('lena_indie',9000027,7),('lena_indie',9000011,8),('lena_indie',9000015,9),
('lena_indie',9000012,10),
-- u47 omar_hip (hip-hop / afrobeats)
('omar_hip',9000002,1),('omar_hip',9000003,2),('omar_hip',9000005,3),
('omar_hip',9000004,4),('omar_hip',9000029,5),('omar_hip',9000001,6),
('omar_hip',9000006,7),('omar_hip',9000007,8),('omar_hip',9000009,9),
('omar_hip',9000010,10),
-- u48 nadia_rnb (r&b / pop)
('nadia_rnb',9000012,1),('nadia_rnb',9000011,2),('nadia_rnb',9000015,3),
('nadia_rnb',9000013,4),('nadia_rnb',9000014,5),('nadia_rnb',9000001,6),
('nadia_rnb',9000020,7),('nadia_rnb',9000018,8),('nadia_rnb',9000017,9),
('nadia_rnb',9000022,10),
-- u49 finn_rock (rock / indie / electronic)
('finn_rock',9000021,1),('finn_rock',9000022,2),('finn_rock',9000025,3),
('finn_rock',9000024,4),('finn_rock',9000023,5),('finn_rock',9000028,6),
('finn_rock',9000026,7),('finn_rock',9000011,8),('finn_rock',9000015,9),
('finn_rock',9000014,10),
-- u50 mika_elec (electronic / indie / r&b)
('mika_elec',9000027,1),('mika_elec',9000026,2),('mika_elec',9000028,3),
('mika_elec',9000022,4),('mika_elec',9000024,5),('mika_elec',9000018,6),
('mika_elec',9000013,7),('mika_elec',9000021,8),('mika_elec',9000012,9),
('mika_elec',9000015,10);

-- Bulk insert artist preferences
INSERT INTO user_artist_preference
  (id, user_id, artist_id, source, source_window, rank_position,
   raw_score, normalized_score, confidence, is_explicit, first_seen_at, last_seen_at)
SELECT
  gen_random_uuid(),
  u.id,
  ap.artist_id,
  'SPOTIFY_TOP_ARTISTS',
  'MEDIUM_TERM',
  ap.rank_pos,
  GREATEST(0.10, 0.95 - (ap.rank_pos - 1) * 0.045),
  GREATEST(0.10, 0.95 - (ap.rank_pos - 1) * 0.045),
  1.0,
  false,
  NOW(),
  NOW()
FROM _sap ap
JOIN users u ON u.username = ap.username
ON CONFLICT ON CONSTRAINT uk_user_artist_pref DO UPDATE
  SET normalized_score = EXCLUDED.normalized_score,
      raw_score        = EXCLUDED.raw_score,
      last_seen_at     = EXCLUDED.last_seen_at;

-- ─── Genre preference staging ─────────────────────────────────────────────────
CREATE TEMP TABLE _sgp (
  username   TEXT,
  genre_name TEXT,
  rank_pos   INT
);

INSERT INTO _sgp VALUES
('zara_sounds','R&B',1),('zara_sounds','Hip-Hop',2),('zara_sounds','Trap',3),('zara_sounds','Pop',4),
('marcus_vibe','Hip-Hop',1),('marcus_vibe','Trap',2),('marcus_vibe','Pop',3),('marcus_vibe','R&B',4),
('soph_indie','Indie',1),('soph_indie','Alternative',2),('soph_indie','Rock',3),('soph_indie','R&B',4),
('jay_trap','Trap',1),('jay_trap','Hip-Hop',2),('jay_trap','Pop',3),('jay_trap','R&B',4),
('elena_groove','Electronic',1),('elena_groove','Pop',2),('elena_groove','R&B',3),('elena_groove','Indie',4),
('noel_uk','Indie',1),('noel_uk','Alternative',2),('noel_uk','Electronic',3),('noel_uk','Rock',4),
('priya_rnb','R&B',1),('priya_rnb','Hip-Hop',2),('priya_rnb','Pop',3),('priya_rnb','Indie',4),
('felix_elec','Electronic',1),('felix_elec','Indie',2),('felix_elec','R&B',3),('felix_elec','Pop',4),
('amara_afro','Afrobeats',1),('amara_afro','Hip-Hop',2),('amara_afro','Trap',3),('amara_afro','Pop',4),
('carlos_latin','Latin',1),('carlos_latin','Afrobeats',2),('carlos_latin','Pop',3),('carlos_latin','Hip-Hop',4),
('luna_pop','Pop',1),('luna_pop','R&B',2),('luna_pop','Indie',3),('luna_pop','Hip-Hop',4),
('hassan_hip','Afrobeats',1),('hassan_hip','Hip-Hop',2),('hassan_hip','Trap',3),('hassan_hip','Pop',4),
('claire_indie','Indie',1),('claire_indie','Alternative',2),('claire_indie','R&B',3),('claire_indie','Electronic',4),
('dom_trap','Trap',1),('dom_trap','Hip-Hop',2),('dom_trap','Pop',3),('dom_trap','R&B',4),
('yuki_jazz','Jazz',1),('yuki_jazz','R&B',2),('yuki_jazz','Indie',3),('yuki_jazz','Electronic',4),
('brie_pop','Pop',1),('brie_pop','R&B',2),('brie_pop','Indie',3),('brie_pop','Hip-Hop',4),
('kwame_afro','Afrobeats',1),('kwame_afro','Hip-Hop',2),('kwame_afro','Trap',3),('kwame_afro','Pop',4),
('tom_rock','Rock',1),('tom_rock','Indie',2),('tom_rock','Alternative',3),('tom_rock','Electronic',4),
('nia_rnb','R&B',1),('nia_rnb','Hip-Hop',2),('nia_rnb','Pop',3),('nia_rnb','Indie',4),
('alex_elec','Electronic',1),('alex_elec','Indie',2),('alex_elec','Pop',3),('alex_elec','R&B',4),
('mia_country','Country',1),('mia_country','Pop',2),('mia_country','Indie',3),('mia_country','Alternative',4),
('sam_alt','Indie',1),('sam_alt','Alternative',2),('sam_alt','Rock',3),('sam_alt','Electronic',4),
('jade_rnb','R&B',1),('jade_rnb','Hip-Hop',2),('jade_rnb','Pop',3),('jade_rnb','Indie',4),
('leo_trap','Trap',1),('leo_trap','Hip-Hop',2),('leo_trap','Pop',3),('leo_trap','R&B',4),
('iris_pop','Pop',1),('iris_pop','R&B',2),('iris_pop','Indie',3),('iris_pop','Electronic',4),
('oscar_indie','Indie',1),('oscar_indie','Alternative',2),('oscar_indie','Electronic',3),('oscar_indie','R&B',4),
('fatou_afro','Afrobeats',1),('fatou_afro','Hip-Hop',2),('fatou_afro','Pop',3),('fatou_afro','Latin',4),
('nina_jazz','Jazz',1),('nina_jazz','R&B',2),('nina_jazz','Indie',3),('nina_jazz','Electronic',4),
('ryo_elec','Electronic',1),('ryo_elec','Indie',2),('ryo_elec','R&B',3),('ryo_elec','Pop',4),
('chloe_pop','Pop',1),('chloe_pop','R&B',2),('chloe_pop','Hip-Hop',3),('chloe_pop','Indie',4),
('dante_hip','Hip-Hop',1),('dante_hip','Trap',2),('dante_hip','R&B',3),('dante_hip','Pop',4),
('eva_indie','Indie',1),('eva_indie','Alternative',2),('eva_indie','R&B',3),('eva_indie','Electronic',4),
('max_rock','Rock',1),('max_rock','Indie',2),('max_rock','Alternative',3),('max_rock','Electronic',4),
('zoe_rnb','R&B',1),('zoe_rnb','Hip-Hop',2),('zoe_rnb','Pop',3),('zoe_rnb','Indie',4),
('kai_elec','Electronic',1),('kai_elec','Pop',2),('kai_elec','R&B',3),('kai_elec','Indie',4),
('ada_afro','Afrobeats',1),('ada_afro','Hip-Hop',2),('ada_afro','Pop',3),('ada_afro','Latin',4),
('luca_pop','Pop',1),('luca_pop','R&B',2),('luca_pop','Indie',3),('luca_pop','Hip-Hop',4),
('ines_latin','Latin',1),('ines_latin','Afrobeats',2),('ines_latin','Pop',3),('ines_latin','Hip-Hop',4),
('rex_trap','Trap',1),('rex_trap','Hip-Hop',2),('rex_trap','Pop',3),('rex_trap','R&B',4),
('maya_indie','Indie',1),('maya_indie','Alternative',2),('maya_indie','R&B',3),('maya_indie','Electronic',4),
('ben_rock','Rock',1),('ben_rock','Indie',2),('ben_rock','Alternative',3),('ben_rock','R&B',4),
('sora_elec','Electronic',1),('sora_elec','Indie',2),('sora_elec','Pop',3),('sora_elec','R&B',4),
('temi_afro','Afrobeats',1),('temi_afro','Hip-Hop',2),('temi_afro','Trap',3),('temi_afro','Pop',4),
('ava_pop','Pop',1),('ava_pop','R&B',2),('ava_pop','Indie',3),('ava_pop','Hip-Hop',4),
('jude_hip','Hip-Hop',1),('jude_hip','R&B',2),('jude_hip','Trap',3),('jude_hip','Pop',4),
('lena_indie','Indie',1),('lena_indie','Alternative',2),('lena_indie','Electronic',3),('lena_indie','R&B',4),
('omar_hip','Hip-Hop',1),('omar_hip','Trap',2),('omar_hip','Pop',3),('omar_hip','Afrobeats',4),
('nadia_rnb','R&B',1),('nadia_rnb','Hip-Hop',2),('nadia_rnb','Pop',3),('nadia_rnb','Indie',4),
('finn_rock','Rock',1),('finn_rock','Indie',2),('finn_rock','Alternative',3),('finn_rock','Electronic',4),
('mika_elec','Electronic',1),('mika_elec','Indie',2),('mika_elec','Pop',3),('mika_elec','R&B',4);

-- Bulk insert genre preferences (join on genre name to get correct ID)
INSERT INTO user_genre_preference
  (id, user_id, genre_id, source, raw_score, normalized_score, confidence, first_seen_at, last_seen_at)
SELECT
  gen_random_uuid(),
  u.id,
  g.id,
  'SPOTIFY_TOP_ARTISTS',
  GREATEST(0.10, 0.90 - (gp.rank_pos - 1) * 0.20),
  GREATEST(0.10, 0.90 - (gp.rank_pos - 1) * 0.20),
  1.0,
  NOW(),
  NOW()
FROM _sgp gp
JOIN users u ON u.username = gp.username
JOIN genres g ON g.name = gp.genre_name
ON CONFLICT ON CONSTRAINT uk_user_genre_pref DO UPDATE
  SET normalized_score = EXCLUDED.normalized_score,
      raw_score        = EXCLUDED.raw_score,
      last_seen_at     = EXCLUDED.last_seen_at;

-- ─── Taste profiles ───────────────────────────────────────────────────────────
INSERT INTO user_taste_profile
  (id, user_id, profile_version, top_artists_count, top_genres_count, top_tracks_count,
   joined_communities_count, music_activity_score, community_activity_score,
   country_code, taste_summary_text, embedding_status, refreshed_at, created_at)
SELECT
  gen_random_uuid(),
  u.id,
  1,
  10, -- every seed user has 10 artist prefs
  4,  -- and 4 genre prefs
  0, 0,
  LEAST(1.0, (10 + 4) / 26.0),
  0.0,
  u.country_code,
  'Into ' || u.display_name || '''s playlist.',
  'NONE',
  NOW(), NOW()
FROM users u
WHERE u.clerk_id LIKE 'seed_clerk_%'
ON CONFLICT ON CONSTRAINT uk_user_taste_profile_user DO UPDATE
  SET top_artists_count    = EXCLUDED.top_artists_count,
      top_genres_count     = EXCLUDED.top_genres_count,
      music_activity_score = EXCLUDED.music_activity_score,
      country_code         = EXCLUDED.country_code,
      refreshed_at         = EXCLUDED.refreshed_at;

-- ─── Summary ─────────────────────────────────────────────────────────────────
SELECT
  'users'             AS tbl, count(*) FROM users WHERE clerk_id LIKE 'seed_clerk_%'
UNION ALL
SELECT 'artist_prefs', count(*) FROM user_artist_preference uap
  JOIN users u ON u.id = uap.user_id WHERE u.clerk_id LIKE 'seed_clerk_%'
UNION ALL
SELECT 'genre_prefs', count(*) FROM user_genre_preference ugp
  JOIN users u ON u.id = ugp.user_id WHERE u.clerk_id LIKE 'seed_clerk_%'
UNION ALL
SELECT 'taste_profiles', count(*) FROM user_taste_profile utp
  JOIN users u ON u.id = utp.user_id WHERE u.clerk_id LIKE 'seed_clerk_%';
