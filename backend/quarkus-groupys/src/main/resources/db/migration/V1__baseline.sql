--
-- PostgreSQL database dump
--

\restrict 8S1a6Ea0kOyMmGkmN5ZxIj1dw6XoLtSqHcZQZD0ohXIgQZWfRVeYj6PjCqU1yX4

-- Dumped from database version 18.3 (Debian 18.3-1.pgdg12+1)
-- Dumped by pg_dump version 18.3 (Debian 18.3-1.pgdg12+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: album_genres; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.album_genres (
    album_id bigint NOT NULL,
    genre character varying(255)
);


--
-- Name: album_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.album_ratings (
    score integer NOT NULL,
    album_id bigint NOT NULL,
    createdat timestamp(6) with time zone NOT NULL,
    updatedat timestamp(6) with time zone NOT NULL,
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    albumcoverurl character varying(255),
    albumtitle character varying(255) NOT NULL,
    artistname character varying(255),
    review text
);


--
-- Name: albums; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.albums (
    duration integer,
    fans integer,
    nbtracks integer,
    artist_id bigint,
    id bigint NOT NULL,
    apple_music_id character varying(64),
    coverbig character varying(255),
    covermedium character varying(255),
    coversmall character varying(255),
    coverxl character varying(255),
    label character varying(255),
    releasedate character varying(255),
    title character varying(255) NOT NULL
);


--
-- Name: artist_genre; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.artist_genre (
    confidence double precision NOT NULL,
    is_primary boolean NOT NULL,
    artist_id bigint NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    genre_id bigint NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    id uuid NOT NULL,
    source character varying(255) NOT NULL
);


--
-- Name: artist_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.artist_images (
    artist_id bigint NOT NULL,
    image_url character varying(255)
);


--
-- Name: artists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.artists (
    genres_enriched boolean DEFAULT false NOT NULL,
    popularity_score double precision,
    id bigint NOT NULL,
    listeners bigint,
    playcount bigint,
    primary_genre_id bigint,
    apple_music_id character varying(64),
    name character varying(255) NOT NULL,
    summary text
);


--
-- Name: comment_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comment_reactions (
    created_at timestamp(6) with time zone NOT NULL,
    comment_id uuid NOT NULL,
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    reaction_type character varying(255) NOT NULL
);


--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    created_at timestamp(6) with time zone NOT NULL,
    dislike_count bigint NOT NULL,
    like_count bigint NOT NULL,
    reply_count bigint NOT NULL,
    author_id uuid NOT NULL,
    id uuid NOT NULL,
    parent_comment_id uuid,
    post_id uuid NOT NULL,
    content text NOT NULL
);


--
-- Name: communities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.communities (
    country_code character varying(2),
    discovery_enabled boolean DEFAULT true NOT NULL,
    member_count integer NOT NULL,
    artist_id bigint,
    created_at timestamp(6) with time zone NOT NULL,
    last_profile_refresh_at timestamp(6) with time zone,
    created_by uuid,
    id uuid NOT NULL,
    visibility character varying(20) DEFAULT 'PUBLIC'::character varying NOT NULL,
    banner_url character varying(255),
    country character varying(255),
    description text,
    genre character varying(255),
    icon_emoji character varying(255),
    icon_type character varying(255),
    icon_url character varying(255),
    image_url character varying(255),
    name character varying(255) NOT NULL,
    taste_summary_text text
);


--
-- Name: community_artist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_artist (
    member_support_count integer NOT NULL,
    normalized_score double precision NOT NULL,
    raw_score double precision NOT NULL,
    artist_id bigint NOT NULL,
    refreshed_at timestamp(6) with time zone NOT NULL,
    community_id uuid NOT NULL,
    id uuid NOT NULL,
    source character varying(255) NOT NULL
);


--
-- Name: community_genre; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_genre (
    member_support_count integer NOT NULL,
    normalized_score double precision NOT NULL,
    raw_score double precision NOT NULL,
    genre_id bigint NOT NULL,
    refreshed_at timestamp(6) with time zone NOT NULL,
    community_id uuid NOT NULL,
    id uuid NOT NULL,
    source character varying(255) NOT NULL
);


--
-- Name: community_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_members (
    joined_at timestamp(6) with time zone NOT NULL,
    last_active_at timestamp(6) with time zone,
    community_id uuid NOT NULL,
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    source character varying(20) DEFAULT 'USER_JOIN'::character varying NOT NULL,
    role character varying(255) NOT NULL
);


--
-- Name: community_recommendation_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_recommendation_cache (
    activity_fit_score double precision NOT NULL,
    artist_overlap_score double precision NOT NULL,
    country_score double precision NOT NULL,
    embedding_score double precision NOT NULL,
    genre_overlap_score double precision NOT NULL,
    rank_position integer,
    score double precision NOT NULL,
    social_fit_score double precision NOT NULL,
    computed_at timestamp(6) with time zone NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    community_id uuid NOT NULL,
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    primary_reason_code character varying(255),
    explanation_json jsonb
);


--
-- Name: community_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_tags (
    community_id uuid NOT NULL,
    tag character varying(255)
);


--
-- Name: community_taste_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_taste_profile (
    activity_score double precision NOT NULL,
    country_code character varying(2),
    member_sample_size integer NOT NULL,
    profile_version integer NOT NULL,
    top_artists_count integer NOT NULL,
    top_genres_count integer NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    embedding_updated_at timestamp(6) with time zone,
    refreshed_at timestamp(6) with time zone NOT NULL,
    community_id uuid NOT NULL,
    id uuid NOT NULL,
    embedding_model character varying(64),
    embedding_status character varying(255) NOT NULL,
    taste_summary_text text,
    taste_embedding public.vector(768)
);


--
-- Name: conversation_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_participants (
    unread_count integer NOT NULL,
    joined_at timestamp(6) with time zone NOT NULL,
    last_read_at timestamp(6) with time zone,
    conversation_id uuid NOT NULL,
    id uuid NOT NULL,
    user_id uuid NOT NULL
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    is_group boolean,
    accepted_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone NOT NULL,
    last_message_at timestamp(6) with time zone,
    updated_at timestamp(6) with time zone,
    id uuid NOT NULL,
    match_id uuid,
    requested_by_user_id uuid,
    request_status character varying(32),
    group_name character varying(100),
    last_message_preview text
);


--
-- Name: countries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.countries (
    code character varying(2) NOT NULL,
    id bigint NOT NULL,
    name character varying(255) NOT NULL
);


--
-- Name: countries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.countries ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.countries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: friendships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.friendships (
    created_at timestamp(6) with time zone NOT NULL,
    updated_at timestamp(6) with time zone,
    status character varying(10) NOT NULL,
    id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    requester_id uuid NOT NULL,
    CONSTRAINT friendships_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'ACCEPTED'::character varying])::text[])))
);


--
-- Name: genres; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.genres (
    id bigint NOT NULL,
    apple_genre_id character varying(64),
    name character varying(255) NOT NULL
);


--
-- Name: genres_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.genres ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.genres_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: hot_take_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hot_take_answers (
    showonwidget boolean,
    answeredat timestamp(6) with time zone NOT NULL,
    hot_take_id uuid NOT NULL,
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    answer text NOT NULL,
    imageurl text,
    musictype text,
    show_on_widget boolean DEFAULT false NOT NULL,
    music_type text
);


--
-- Name: hot_takes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hot_takes (
    answercount integer NOT NULL,
    createdat timestamp(6) with time zone NOT NULL,
    id uuid NOT NULL,
    answertype character varying(20),
    weeklabel character varying(20) NOT NULL,
    question text NOT NULL,
    answer_type character varying(20) DEFAULT 'ARTIST'::character varying NOT NULL,
    answer_count integer DEFAULT 1 NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    is_deleted boolean,
    created_at timestamp(6) with time zone NOT NULL,
    updated_at timestamp(6) with time zone,
    conversation_id uuid NOT NULL,
    id uuid NOT NULL,
    reply_to_id uuid,
    sender_id uuid NOT NULL,
    message_type character varying(20),
    media_url character varying(500),
    content text
);


--
-- Name: music_source_snapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.music_source_snapshot (
    expires_at timestamp(6) with time zone,
    fetched_at timestamp(6) with time zone NOT NULL,
    payload_size_bytes bigint,
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    checksum character varying(64),
    object_key text,
    processing_error text,
    processing_status character varying(255) NOT NULL,
    snapshot_type character varying(255) NOT NULL,
    source character varying(255) NOT NULL,
    source_account_id character varying(255),
    source_cursor character varying(255),
    payload_json jsonb
);


--
-- Name: post_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_media (
    sort_order integer NOT NULL,
    post_id uuid NOT NULL,
    type character varying(255) NOT NULL,
    url character varying(255) NOT NULL
);


--
-- Name: post_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_reactions (
    created_at timestamp(6) with time zone NOT NULL,
    id uuid NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reaction_type character varying(255) NOT NULL
);


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    comment_count bigint NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    dislike_count bigint NOT NULL,
    like_count bigint NOT NULL,
    author_id uuid NOT NULL,
    community_id uuid NOT NULL,
    id uuid NOT NULL,
    content text,
    title text
);


--
-- Name: tracks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tracks (
    duration integer,
    popularity_score double precision,
    track_rank integer,
    album_id bigint,
    artist_id bigint,
    id bigint NOT NULL,
    external_isrc character varying(32),
    apple_music_id character varying(64),
    preview character varying(255),
    title character varying(255) NOT NULL
);


--
-- Name: user_artist_preference; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_artist_preference (
    confidence double precision NOT NULL,
    is_explicit boolean NOT NULL,
    normalized_score double precision NOT NULL,
    rank_position integer,
    raw_score double precision NOT NULL,
    artist_id bigint NOT NULL,
    first_seen_at timestamp(6) with time zone NOT NULL,
    last_seen_at timestamp(6) with time zone NOT NULL,
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    source character varying(255) NOT NULL,
    source_window character varying(255)
);


--
-- Name: user_discovery_action; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_discovery_action (
    created_at timestamp(6) with time zone NOT NULL,
    expires_at timestamp(6) with time zone,
    id uuid NOT NULL,
    target_community_id uuid,
    target_user_id uuid,
    user_id uuid NOT NULL,
    action_type character varying(255) NOT NULL,
    reason_code character varying(255),
    surface character varying(255) NOT NULL,
    target_type character varying(255) NOT NULL,
    metadata_json jsonb
);


--
-- Name: user_follow; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_follow (
    created_at timestamp(6) with time zone NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    followed_user_id uuid NOT NULL,
    follower_user_id uuid NOT NULL,
    id uuid NOT NULL,
    status character varying(255) NOT NULL
);


--
-- Name: user_genre_preference; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_genre_preference (
    confidence double precision NOT NULL,
    normalized_score double precision NOT NULL,
    raw_score double precision NOT NULL,
    first_seen_at timestamp(6) with time zone NOT NULL,
    genre_id bigint NOT NULL,
    last_seen_at timestamp(6) with time zone NOT NULL,
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    source character varying(255) NOT NULL
);


--
-- Name: user_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_likes (
    created_at timestamp(6) with time zone NOT NULL,
    expires_at timestamp(6) with time zone,
    from_user_id uuid NOT NULL,
    id uuid NOT NULL,
    to_user_id uuid NOT NULL
);


--
-- Name: user_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_matches (
    created_at timestamp(6) with time zone NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    conversation_id uuid,
    id uuid NOT NULL,
    user_a_id uuid NOT NULL,
    user_b_id uuid NOT NULL,
    status character varying(255) NOT NULL
);


--
-- Name: user_similarity_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_similarity_cache (
    activity_overlap_score double precision NOT NULL,
    artist_overlap_score double precision NOT NULL,
    country_score double precision NOT NULL,
    embedding_score double precision NOT NULL,
    follow_graph_score double precision NOT NULL,
    friends_of_friends_score double precision,
    genre_overlap_score double precision NOT NULL,
    score double precision NOT NULL,
    shared_communities_score double precision NOT NULL,
    computed_at timestamp(6) with time zone NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    candidate_user_id uuid NOT NULL,
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    primary_reason_code character varying(255),
    explanation_json jsonb
);


--
-- Name: user_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_tags (
    user_id uuid NOT NULL,
    tag character varying(255)
);


--
-- Name: user_taste_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_taste_profile (
    artist_entropy_score double precision,
    community_activity_score double precision NOT NULL,
    country_code character varying(2),
    genre_entropy_score double precision,
    joined_communities_count integer NOT NULL,
    music_activity_score double precision NOT NULL,
    profile_version integer NOT NULL,
    top_artists_count integer NOT NULL,
    top_genres_count integer NOT NULL,
    top_tracks_count integer NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    embedding_updated_at timestamp(6) with time zone,
    refreshed_at timestamp(6) with time zone NOT NULL,
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    embedding_model character varying(64),
    embedding_status character varying(255) NOT NULL,
    taste_summary_text text,
    taste_embedding public.vector(768)
);


--
-- Name: user_track_preference; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_track_preference (
    normalized_score double precision NOT NULL,
    rank_position integer,
    raw_score double precision NOT NULL,
    first_seen_at timestamp(6) with time zone NOT NULL,
    last_seen_at timestamp(6) with time zone NOT NULL,
    track_id bigint NOT NULL,
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    source character varying(255) NOT NULL,
    source_window character varying(255)
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    country_code character varying(2),
    discovery_visible boolean DEFAULT true NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    recommendation_opt_out boolean DEFAULT false NOT NULL,
    apple_music_connected_at timestamp(6) with time zone,
    date_joined timestamp(6) with time zone NOT NULL,
    last_music_sync_at timestamp(6) with time zone,
    last_seen_at timestamp(6) with time zone,
    id uuid NOT NULL,
    apple_music_user_token character varying(1024),
    accent_color character varying(255),
    banner_text character varying(255),
    banner_url text,
    bio text,
    clerk_id character varying(255),
    country character varying(255),
    display_name character varying(255),
    job_title character varying(255),
    location character varying(255),
    name_color character varying(255),
    profile_image text,
    public_key text,
    role character varying(255) DEFAULT 'USER'::character varying NOT NULL,
    taste_summary_text text,
    username character varying(255) NOT NULL,
    website character varying(255),
    widgets jsonb,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['USER'::character varying, 'ADMIN'::character varying])::text[])))
);


--
-- Name: album_ratings album_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.album_ratings
    ADD CONSTRAINT album_ratings_pkey PRIMARY KEY (id);


--
-- Name: album_ratings album_ratings_user_id_album_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.album_ratings
    ADD CONSTRAINT album_ratings_user_id_album_id_key UNIQUE (user_id, album_id);


--
-- Name: albums albums_apple_music_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.albums
    ADD CONSTRAINT albums_apple_music_id_key UNIQUE (apple_music_id);


--
-- Name: albums albums_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.albums
    ADD CONSTRAINT albums_pkey PRIMARY KEY (id);


--
-- Name: artist_genre artist_genre_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artist_genre
    ADD CONSTRAINT artist_genre_pkey PRIMARY KEY (id);


--
-- Name: artists artists_apple_music_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artists
    ADD CONSTRAINT artists_apple_music_id_key UNIQUE (apple_music_id);


--
-- Name: artists artists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artists
    ADD CONSTRAINT artists_pkey PRIMARY KEY (id);


--
-- Name: comment_reactions comment_reactions_comment_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_reactions
    ADD CONSTRAINT comment_reactions_comment_id_user_id_key UNIQUE (comment_id, user_id);


--
-- Name: comment_reactions comment_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_reactions
    ADD CONSTRAINT comment_reactions_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: communities communities_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT communities_name_key UNIQUE (name);


--
-- Name: communities communities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT communities_pkey PRIMARY KEY (id);


--
-- Name: community_artist community_artist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_artist
    ADD CONSTRAINT community_artist_pkey PRIMARY KEY (id);


--
-- Name: community_genre community_genre_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_genre
    ADD CONSTRAINT community_genre_pkey PRIMARY KEY (id);


--
-- Name: community_members community_members_community_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_members
    ADD CONSTRAINT community_members_community_id_user_id_key UNIQUE (community_id, user_id);


--
-- Name: community_members community_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_members
    ADD CONSTRAINT community_members_pkey PRIMARY KEY (id);


--
-- Name: community_recommendation_cache community_recommendation_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_recommendation_cache
    ADD CONSTRAINT community_recommendation_cache_pkey PRIMARY KEY (id);


--
-- Name: community_taste_profile community_taste_profile_community_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_taste_profile
    ADD CONSTRAINT community_taste_profile_community_id_key UNIQUE (community_id);


--
-- Name: community_taste_profile community_taste_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_taste_profile
    ADD CONSTRAINT community_taste_profile_pkey PRIMARY KEY (id);


--
-- Name: conversation_participants conversation_participants_conversation_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_user_id_key UNIQUE (conversation_id, user_id);


--
-- Name: conversation_participants conversation_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: countries countries_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_code_key UNIQUE (code);


--
-- Name: countries countries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (id);


--
-- Name: friendships friendships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_pkey PRIMARY KEY (id);


--
-- Name: genres genres_apple_genre_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.genres
    ADD CONSTRAINT genres_apple_genre_id_key UNIQUE (apple_genre_id);


--
-- Name: genres genres_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.genres
    ADD CONSTRAINT genres_name_key UNIQUE (name);


--
-- Name: genres genres_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.genres
    ADD CONSTRAINT genres_pkey PRIMARY KEY (id);


--
-- Name: hot_take_answers hot_take_answers_hot_take_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hot_take_answers
    ADD CONSTRAINT hot_take_answers_hot_take_id_user_id_key UNIQUE (hot_take_id, user_id);


--
-- Name: hot_take_answers hot_take_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hot_take_answers
    ADD CONSTRAINT hot_take_answers_pkey PRIMARY KEY (id);


--
-- Name: hot_takes hot_takes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hot_takes
    ADD CONSTRAINT hot_takes_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: music_source_snapshot music_source_snapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_source_snapshot
    ADD CONSTRAINT music_source_snapshot_pkey PRIMARY KEY (id);


--
-- Name: post_media post_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_media
    ADD CONSTRAINT post_media_pkey PRIMARY KEY (sort_order, post_id);


--
-- Name: post_reactions post_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_pkey PRIMARY KEY (id);


--
-- Name: post_reactions post_reactions_post_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_post_id_user_id_key UNIQUE (post_id, user_id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: tracks tracks_apple_music_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tracks
    ADD CONSTRAINT tracks_apple_music_id_key UNIQUE (apple_music_id);


--
-- Name: tracks tracks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tracks
    ADD CONSTRAINT tracks_pkey PRIMARY KEY (id);


--
-- Name: artist_genre uk_artist_genre_source; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artist_genre
    ADD CONSTRAINT uk_artist_genre_source UNIQUE (artist_id, genre_id, source);


--
-- Name: community_artist uk_community_artist_source; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_artist
    ADD CONSTRAINT uk_community_artist_source UNIQUE (community_id, artist_id, source);


--
-- Name: community_genre uk_community_genre_source; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_genre
    ADD CONSTRAINT uk_community_genre_source UNIQUE (community_id, genre_id, source);


--
-- Name: community_recommendation_cache uk_community_recommendation_cache_pair; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_recommendation_cache
    ADD CONSTRAINT uk_community_recommendation_cache_pair UNIQUE (user_id, community_id);


--
-- Name: user_artist_preference uk_user_artist_pref; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_artist_preference
    ADD CONSTRAINT uk_user_artist_pref UNIQUE (user_id, artist_id, source, source_window);


--
-- Name: user_follow uk_user_follow_pair; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_follow
    ADD CONSTRAINT uk_user_follow_pair UNIQUE (follower_user_id, followed_user_id);


--
-- Name: user_genre_preference uk_user_genre_pref; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_genre_preference
    ADD CONSTRAINT uk_user_genre_pref UNIQUE (user_id, genre_id, source);


--
-- Name: user_likes uk_user_likes_pair; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_likes
    ADD CONSTRAINT uk_user_likes_pair UNIQUE (from_user_id, to_user_id);


--
-- Name: user_matches uk_user_matches_pair; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_matches
    ADD CONSTRAINT uk_user_matches_pair UNIQUE (user_a_id, user_b_id);


--
-- Name: user_similarity_cache uk_user_similarity_cache_pair; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_similarity_cache
    ADD CONSTRAINT uk_user_similarity_cache_pair UNIQUE (user_id, candidate_user_id);


--
-- Name: user_track_preference uk_user_track_pref; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_track_preference
    ADD CONSTRAINT uk_user_track_pref UNIQUE (user_id, track_id, source, source_window);


--
-- Name: friendships uq_friendship_pair; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT uq_friendship_pair UNIQUE (requester_id, recipient_id);


--
-- Name: user_artist_preference user_artist_preference_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_artist_preference
    ADD CONSTRAINT user_artist_preference_pkey PRIMARY KEY (id);


--
-- Name: user_discovery_action user_discovery_action_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_discovery_action
    ADD CONSTRAINT user_discovery_action_pkey PRIMARY KEY (id);


--
-- Name: user_follow user_follow_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_follow
    ADD CONSTRAINT user_follow_pkey PRIMARY KEY (id);


--
-- Name: user_genre_preference user_genre_preference_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_genre_preference
    ADD CONSTRAINT user_genre_preference_pkey PRIMARY KEY (id);


--
-- Name: user_likes user_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_likes
    ADD CONSTRAINT user_likes_pkey PRIMARY KEY (id);


--
-- Name: user_matches user_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_matches
    ADD CONSTRAINT user_matches_pkey PRIMARY KEY (id);


--
-- Name: user_similarity_cache user_similarity_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_similarity_cache
    ADD CONSTRAINT user_similarity_cache_pkey PRIMARY KEY (id);


--
-- Name: user_taste_profile user_taste_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_taste_profile
    ADD CONSTRAINT user_taste_profile_pkey PRIMARY KEY (id);


--
-- Name: user_taste_profile user_taste_profile_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_taste_profile
    ADD CONSTRAINT user_taste_profile_user_id_key UNIQUE (user_id);


--
-- Name: user_track_preference user_track_preference_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_track_preference
    ADD CONSTRAINT user_track_preference_pkey PRIMARY KEY (id);


--
-- Name: users users_clerk_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_clerk_id_key UNIQUE (clerk_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_albums_apple_music_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_albums_apple_music_id ON public.albums USING btree (apple_music_id);


--
-- Name: idx_artist_genre_artist_conf; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_artist_genre_artist_conf ON public.artist_genre USING btree (artist_id, confidence);


--
-- Name: idx_artist_genre_genre_conf; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_artist_genre_genre_conf ON public.artist_genre USING btree (genre_id, confidence);


--
-- Name: idx_artists_apple_music_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_artists_apple_music_id ON public.artists USING btree (apple_music_id);


--
-- Name: idx_artists_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_artists_name ON public.artists USING btree (name);


--
-- Name: idx_artists_primary_genre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_artists_primary_genre ON public.artists USING btree (primary_genre_id);


--
-- Name: idx_comment_reactions_comment_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comment_reactions_comment_type ON public.comment_reactions USING btree (comment_id, reaction_type);


--
-- Name: idx_comment_reactions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comment_reactions_user ON public.comment_reactions USING btree (user_id);


--
-- Name: idx_comments_author_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_author_id ON public.comments USING btree (author_id);


--
-- Name: idx_comments_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_parent_id ON public.comments USING btree (parent_comment_id);


--
-- Name: idx_comments_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_post_id ON public.comments USING btree (post_id);


--
-- Name: idx_communities_country_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_communities_country_code ON public.communities USING btree (country_code);


--
-- Name: idx_communities_last_profile_refresh_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_communities_last_profile_refresh_at ON public.communities USING btree (last_profile_refresh_at);


--
-- Name: idx_communities_name_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_communities_name_lower ON public.communities USING btree (lower((name)::text));


--
-- Name: idx_communities_visibility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_communities_visibility ON public.communities USING btree (visibility, discovery_enabled);


--
-- Name: idx_community_artist_artist_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_community_artist_artist_score ON public.community_artist USING btree (artist_id, normalized_score);


--
-- Name: idx_community_artist_community_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_community_artist_community_score ON public.community_artist USING btree (community_id, normalized_score);


--
-- Name: idx_community_genre_community_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_community_genre_community_score ON public.community_genre USING btree (community_id, normalized_score);


--
-- Name: idx_community_genre_genre_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_community_genre_genre_score ON public.community_genre USING btree (genre_id, normalized_score);


--
-- Name: idx_community_members_community_joined; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_community_members_community_joined ON public.community_members USING btree (community_id, joined_at);


--
-- Name: idx_community_members_user_joined; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_community_members_user_joined ON public.community_members USING btree (user_id, joined_at);


--
-- Name: idx_community_rec_cache_community; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_community_rec_cache_community ON public.community_recommendation_cache USING btree (community_id);


--
-- Name: idx_community_rec_cache_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_community_rec_cache_expires ON public.community_recommendation_cache USING btree (expires_at);


--
-- Name: idx_community_rec_cache_user_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_community_rec_cache_user_score ON public.community_recommendation_cache USING btree (user_id, score);


--
-- Name: idx_community_tags_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_community_tags_community_id ON public.community_tags USING btree (community_id);


--
-- Name: idx_community_taste_profile_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_community_taste_profile_country ON public.community_taste_profile USING btree (country_code);


--
-- Name: idx_community_taste_profile_embedding_hnsw; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_community_taste_profile_embedding_hnsw ON public.community_taste_profile USING hnsw (taste_embedding public.vector_cosine_ops);


--
-- Name: idx_community_taste_profile_refreshed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_community_taste_profile_refreshed ON public.community_taste_profile USING btree (refreshed_at);


--
-- Name: idx_conversations_last_message_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_last_message_at ON public.conversations USING btree (last_message_at DESC);


--
-- Name: idx_conversations_last_message_at_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_last_message_at_desc ON public.conversations USING btree (last_message_at DESC);


--
-- Name: idx_conversations_match_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_match_id ON public.conversations USING btree (match_id);


--
-- Name: idx_conversations_request_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_request_status ON public.conversations USING btree (request_status);


--
-- Name: idx_conversations_requested_by_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_requested_by_user_id ON public.conversations USING btree (requested_by_user_id);


--
-- Name: idx_conversations_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_updated_at ON public.conversations USING btree (updated_at DESC);


--
-- Name: idx_cp_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cp_conversation_id ON public.conversation_participants USING btree (conversation_id);


--
-- Name: idx_cp_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cp_user_id ON public.conversation_participants USING btree (user_id);


--
-- Name: idx_friendship_recipient_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_friendship_recipient_status ON public.friendships USING btree (recipient_id, status);


--
-- Name: idx_friendship_requester_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_friendship_requester_status ON public.friendships USING btree (requester_id, status);


--
-- Name: idx_genres_apple_genre_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_genres_apple_genre_id ON public.genres USING btree (apple_genre_id);


--
-- Name: idx_messages_conv_deleted_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_conv_deleted_created ON public.messages USING btree (conversation_id, is_deleted, created_at DESC);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC);


--
-- Name: idx_messages_sender_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);


--
-- Name: idx_music_snapshot_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_music_snapshot_status ON public.music_source_snapshot USING btree (processing_status, fetched_at);


--
-- Name: idx_music_snapshot_user_source_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_music_snapshot_user_source_type ON public.music_source_snapshot USING btree (user_id, source, snapshot_type, fetched_at);


--
-- Name: idx_post_media_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_media_post_id ON public.post_media USING btree (post_id);


--
-- Name: idx_post_reactions_post_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_reactions_post_type ON public.post_reactions USING btree (post_id, reaction_type);


--
-- Name: idx_post_reactions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_reactions_user ON public.post_reactions USING btree (user_id);


--
-- Name: idx_posts_author_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_author_created ON public.posts USING btree (author_id, created_at DESC);


--
-- Name: idx_posts_community_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_community_created ON public.posts USING btree (community_id, created_at DESC);


--
-- Name: idx_posts_like_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_like_count ON public.posts USING btree (like_count DESC);


--
-- Name: idx_posts_popular; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_popular ON public.posts USING btree (like_count DESC, created_at DESC);


--
-- Name: idx_tracks_album; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tracks_album ON public.tracks USING btree (album_id);


--
-- Name: idx_tracks_apple_music_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tracks_apple_music_id ON public.tracks USING btree (apple_music_id);


--
-- Name: idx_tracks_artist; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tracks_artist ON public.tracks USING btree (artist_id);


--
-- Name: idx_user_artist_pref_artist_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_artist_pref_artist_score ON public.user_artist_preference USING btree (artist_id, normalized_score);


--
-- Name: idx_user_artist_pref_user_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_artist_pref_user_score ON public.user_artist_preference USING btree (user_id, normalized_score);


--
-- Name: idx_user_discovery_action_target_community; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_discovery_action_target_community ON public.user_discovery_action USING btree (target_community_id, action_type, created_at);


--
-- Name: idx_user_discovery_action_target_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_discovery_action_target_user ON public.user_discovery_action USING btree (target_user_id, action_type, created_at);


--
-- Name: idx_user_discovery_action_user_target_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_discovery_action_user_target_action ON public.user_discovery_action USING btree (user_id, target_type, action_type, created_at);


--
-- Name: idx_user_follow_followed_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_follow_followed_status ON public.user_follow USING btree (followed_user_id, status);


--
-- Name: idx_user_follow_follower_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_follow_follower_status ON public.user_follow USING btree (follower_user_id, status);


--
-- Name: idx_user_genre_pref_genre_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_genre_pref_genre_score ON public.user_genre_preference USING btree (genre_id, normalized_score);


--
-- Name: idx_user_genre_pref_user_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_genre_pref_user_score ON public.user_genre_preference USING btree (user_id, normalized_score);


--
-- Name: idx_user_likes_from_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_likes_from_user ON public.user_likes USING btree (from_user_id, created_at);


--
-- Name: idx_user_likes_to_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_likes_to_user ON public.user_likes USING btree (to_user_id, created_at);


--
-- Name: idx_user_matches_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_matches_conversation ON public.user_matches USING btree (conversation_id);


--
-- Name: idx_user_matches_user_a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_matches_user_a ON public.user_matches USING btree (user_a_id, status);


--
-- Name: idx_user_matches_user_b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_matches_user_b ON public.user_matches USING btree (user_b_id, status);


--
-- Name: idx_user_similarity_cache_candidate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_similarity_cache_candidate ON public.user_similarity_cache USING btree (candidate_user_id);


--
-- Name: idx_user_similarity_cache_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_similarity_cache_expires ON public.user_similarity_cache USING btree (expires_at);


--
-- Name: idx_user_similarity_cache_user_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_similarity_cache_user_score ON public.user_similarity_cache USING btree (user_id, score);


--
-- Name: idx_user_tags_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_tags_user_id ON public.user_tags USING btree (user_id);


--
-- Name: idx_user_taste_profile_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_taste_profile_country ON public.user_taste_profile USING btree (country_code);


--
-- Name: idx_user_taste_profile_embedding_hnsw; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_taste_profile_embedding_hnsw ON public.user_taste_profile USING hnsw (taste_embedding public.vector_cosine_ops);


--
-- Name: idx_user_taste_profile_refreshed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_taste_profile_refreshed ON public.user_taste_profile USING btree (refreshed_at);


--
-- Name: idx_user_track_pref_track_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_track_pref_track_score ON public.user_track_preference USING btree (track_id, normalized_score);


--
-- Name: idx_user_track_pref_user_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_track_pref_user_score ON public.user_track_preference USING btree (user_id, normalized_score);


--
-- Name: idx_users_clerk_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_clerk_id ON public.users USING btree (clerk_id);


--
-- Name: idx_users_country_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_country_code ON public.users USING btree (country_code);


--
-- Name: idx_users_discovery_flags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_discovery_flags ON public.users USING btree (discovery_visible, recommendation_opt_out);


--
-- Name: idx_users_display_name_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_display_name_lower ON public.users USING btree (lower((display_name)::text));


--
-- Name: idx_users_last_music_sync_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_last_music_sync_at ON public.users USING btree (last_music_sync_at);


--
-- Name: idx_users_last_seen_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_last_seen_at ON public.users USING btree (last_seen_at DESC);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: idx_users_username_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_username_lower ON public.users USING btree (lower((username)::text));


--
-- Name: post_media fk1urcum9dtf0vgul7k405f4r2d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_media
    ADD CONSTRAINT fk1urcum9dtf0vgul7k405f4r2d FOREIGN KEY (post_id) REFERENCES public.posts(id);


--
-- Name: artist_genre fk268c3w1s4sl33koktykvsys7s; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artist_genre
    ADD CONSTRAINT fk268c3w1s4sl33koktykvsys7s FOREIGN KEY (genre_id) REFERENCES public.genres(id);


--
-- Name: comment_reactions fk2t2mv78fm49m4lni9gih7kkaa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_reactions
    ADD CONSTRAINT fk2t2mv78fm49m4lni9gih7kkaa FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: messages fk4ui4nnwntodh6wjvck53dbk9m; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT fk4ui4nnwntodh6wjvck53dbk9m FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: user_follow fk4wfxtuhdb397hnx5ca16swca5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_follow
    ADD CONSTRAINT fk4wfxtuhdb397hnx5ca16swca5 FOREIGN KEY (followed_user_id) REFERENCES public.users(id);


--
-- Name: community_genre fk5fwg6ns6v4yc7yphp2nkcd5hk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_genre
    ADD CONSTRAINT fk5fwg6ns6v4yc7yphp2nkcd5hk FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: user_likes fk6bcwnhx7rsc5pdj4xxk3ppp3u; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_likes
    ADD CONSTRAINT fk6bcwnhx7rsc5pdj4xxk3ppp3u FOREIGN KEY (from_user_id) REFERENCES public.users(id);


--
-- Name: user_similarity_cache fk6ep42nj3etqho24p1sutve08a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_similarity_cache
    ADD CONSTRAINT fk6ep42nj3etqho24p1sutve08a FOREIGN KEY (candidate_user_id) REFERENCES public.users(id);


--
-- Name: user_artist_preference fk6nthcfgq187emmxj0s8pjetom; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_artist_preference
    ADD CONSTRAINT fk6nthcfgq187emmxj0s8pjetom FOREIGN KEY (artist_id) REFERENCES public.artists(id);


--
-- Name: posts fk6xvn0811tkyo3nfjk2xvqx6ns; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT fk6xvn0811tkyo3nfjk2xvqx6ns FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: albums fk72gqyi6l1j674radjyitcm86f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.albums
    ADD CONSTRAINT fk72gqyi6l1j674radjyitcm86f FOREIGN KEY (artist_id) REFERENCES public.artists(id);


--
-- Name: user_genre_preference fk77tla0uddpk9n0pqdmyavgmjw; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_genre_preference
    ADD CONSTRAINT fk77tla0uddpk9n0pqdmyavgmjw FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: artist_images fk7cqpk25202oorwucah01lxn1k; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artist_images
    ADD CONSTRAINT fk7cqpk25202oorwucah01lxn1k FOREIGN KEY (artist_id) REFERENCES public.artists(id);


--
-- Name: friendships fk7dbvoqqjm38gke30l9mlh76hc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT fk7dbvoqqjm38gke30l9mlh76hc FOREIGN KEY (recipient_id) REFERENCES public.users(id);


--
-- Name: community_artist fk7e7h0e480c1gjshnqkybvkvs3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_artist
    ADD CONSTRAINT fk7e7h0e480c1gjshnqkybvkvs3 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: comments fk7h839m3lkvhbyv3bcdv7sm4fj; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT fk7h839m3lkvhbyv3bcdv7sm4fj FOREIGN KEY (parent_comment_id) REFERENCES public.comments(id);


--
-- Name: posts fk7rk45ficmsfhe8n1dojvqt6ui; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT fk7rk45ficmsfhe8n1dojvqt6ui FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: conversation_participants fk84npv3fo2vwl7ut63im0p417q; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT fk84npv3fo2vwl7ut63im0p417q FOREIGN KEY (conversation_id) REFERENCES public.conversations(id);


--
-- Name: user_follow fk8gl76vdfxagrt4mlk5c7w2b6k; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_follow
    ADD CONSTRAINT fk8gl76vdfxagrt4mlk5c7w2b6k FOREIGN KEY (follower_user_id) REFERENCES public.users(id);


--
-- Name: album_ratings fk8vvyr6371ucfot8ldq0mrp0vr; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.album_ratings
    ADD CONSTRAINT fk8vvyr6371ucfot8ldq0mrp0vr FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: hot_take_answers fk9bpbd05p2t26hh74e6wc4oj2d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hot_take_answers
    ADD CONSTRAINT fk9bpbd05p2t26hh74e6wc4oj2d FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: conversations fk9ky9oy48au9yokopqb58kpsw0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT fk9ky9oy48au9yokopqb58kpsw0 FOREIGN KEY (match_id) REFERENCES public.user_matches(id);


--
-- Name: user_likes fkajyhi2797dvrx8e4vtf6tj1kc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_likes
    ADD CONSTRAINT fkajyhi2797dvrx8e4vtf6tj1kc FOREIGN KEY (to_user_id) REFERENCES public.users(id);


--
-- Name: friendships fkas6bp8so5n3pfcqtfxt72e1ii; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT fkas6bp8so5n3pfcqtfxt72e1ii FOREIGN KEY (requester_id) REFERENCES public.users(id);


--
-- Name: user_similarity_cache fkbhngvxbvboc9wbgugb0irmtve; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_similarity_cache
    ADD CONSTRAINT fkbhngvxbvboc9wbgugb0irmtve FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: artists fkbnadp2se76qf8bb1s9th6v3wp; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artists
    ADD CONSTRAINT fkbnadp2se76qf8bb1s9th6v3wp FOREIGN KEY (primary_genre_id) REFERENCES public.genres(id);


--
-- Name: community_recommendation_cache fkbyk051j36wfaoupdpbsv52gh; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_recommendation_cache
    ADD CONSTRAINT fkbyk051j36wfaoupdpbsv52gh FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: user_genre_preference fkcgib26m7i4lalo856mehonncq; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_genre_preference
    ADD CONSTRAINT fkcgib26m7i4lalo856mehonncq FOREIGN KEY (genre_id) REFERENCES public.genres(id);


--
-- Name: community_genre fkcolbvy6kvwtijveh1vluem86h; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_genre
    ADD CONSTRAINT fkcolbvy6kvwtijveh1vluem86h FOREIGN KEY (genre_id) REFERENCES public.genres(id);


--
-- Name: album_genres fkd975yib1w5u2k4dpkjmswfu1y; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.album_genres
    ADD CONSTRAINT fkd975yib1w5u2k4dpkjmswfu1y FOREIGN KEY (album_id) REFERENCES public.albums(id);


--
-- Name: tracks fkdcmijveo7n1lql01vav1u2jd2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tracks
    ADD CONSTRAINT fkdcmijveo7n1lql01vav1u2jd2 FOREIGN KEY (album_id) REFERENCES public.albums(id);


--
-- Name: user_tags fkdylhtw3qjb2nj40xp50b0p495; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tags
    ADD CONSTRAINT fkdylhtw3qjb2nj40xp50b0p495 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_discovery_action fkeyi11rqppd7cty56vc2wr14ol; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_discovery_action
    ADD CONSTRAINT fkeyi11rqppd7cty56vc2wr14ol FOREIGN KEY (target_user_id) REFERENCES public.users(id);


--
-- Name: comment_reactions fkfb7jmhiih0qcj4sykg2pcip35; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_reactions
    ADD CONSTRAINT fkfb7jmhiih0qcj4sykg2pcip35 FOREIGN KEY (comment_id) REFERENCES public.comments(id);


--
-- Name: hot_take_answers fkfewb2bpjf0padhgm1316j9yjf; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hot_take_answers
    ADD CONSTRAINT fkfewb2bpjf0padhgm1316j9yjf FOREIGN KEY (hot_take_id) REFERENCES public.hot_takes(id);


--
-- Name: user_artist_preference fkg3790pnolmtlptvgvxdp0jama; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_artist_preference
    ADD CONSTRAINT fkg3790pnolmtlptvgvxdp0jama FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: community_artist fkgrp6qomquijmlm95mhhq12v1s; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_artist
    ADD CONSTRAINT fkgrp6qomquijmlm95mhhq12v1s FOREIGN KEY (artist_id) REFERENCES public.artists(id);


--
-- Name: communities fkgy0m7prkmgafam0ss4pqosq1o; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT fkgy0m7prkmgafam0ss4pqosq1o FOREIGN KEY (artist_id) REFERENCES public.artists(id);


--
-- Name: comments fkh4c7lvsc298whoyd4w9ta25cr; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT fkh4c7lvsc298whoyd4w9ta25cr FOREIGN KEY (post_id) REFERENCES public.posts(id);


--
-- Name: communities fkhu58kqkbabws9cbbptc6n6534; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT fkhu58kqkbabws9cbbptc6n6534 FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: community_taste_profile fkic7vp1ao8prvyc7m8vt93k7dx; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_taste_profile
    ADD CONSTRAINT fkic7vp1ao8prvyc7m8vt93k7dx FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: user_matches fkiq5i2pmh1gjb6tddudd1h5jqo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_matches
    ADD CONSTRAINT fkiq5i2pmh1gjb6tddudd1h5jqo FOREIGN KEY (user_b_id) REFERENCES public.users(id);


--
-- Name: community_tags fkisve8nqn52dqp6olafjxps1bg; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_tags
    ADD CONSTRAINT fkisve8nqn52dqp6olafjxps1bg FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: user_discovery_action fkj9bfjbyimoc8mgexrymru5oud; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_discovery_action
    ADD CONSTRAINT fkj9bfjbyimoc8mgexrymru5oud FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: conversation_participants fkjukjgq6uinvvk4307y8u9lixu; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT fkjukjgq6uinvvk4307y8u9lixu FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: tracks fkkiacd31n79ksp3mnq6owsbjiu; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tracks
    ADD CONSTRAINT fkkiacd31n79ksp3mnq6owsbjiu FOREIGN KEY (artist_id) REFERENCES public.artists(id);


--
-- Name: user_track_preference fklysw8r3xqhvts8r64ib8tws1q; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_track_preference
    ADD CONSTRAINT fklysw8r3xqhvts8r64ib8tws1q FOREIGN KEY (track_id) REFERENCES public.tracks(id);


--
-- Name: user_taste_profile fkm06xfjucoo65pywwi4d1b8e0o; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_taste_profile
    ADD CONSTRAINT fkm06xfjucoo65pywwi4d1b8e0o FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: community_members fkme7k1stbnwi6cpmm8a6sgcikn; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_members
    ADD CONSTRAINT fkme7k1stbnwi6cpmm8a6sgcikn FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: comments fkn2na60ukhs76ibtpt9burkm27; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT fkn2na60ukhs76ibtpt9burkm27 FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: user_matches fkng9f44q366llnv0ct4lo8dl5b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_matches
    ADD CONSTRAINT fkng9f44q366llnv0ct4lo8dl5b FOREIGN KEY (user_a_id) REFERENCES public.users(id);


--
-- Name: user_matches fkoj60ubtgtgdppglk9brmuxdqv; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_matches
    ADD CONSTRAINT fkoj60ubtgtgdppglk9brmuxdqv FOREIGN KEY (conversation_id) REFERENCES public.conversations(id);


--
-- Name: community_recommendation_cache fkok4uiinns8xoeh3bldw0fbb6w; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_recommendation_cache
    ADD CONSTRAINT fkok4uiinns8xoeh3bldw0fbb6w FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: post_reactions fkptar8f3u0qt7ssjksu2hxme03; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT fkptar8f3u0qt7ssjksu2hxme03 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: artist_genre fkq0okm9v81nfuren3e5y1i8dng; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artist_genre
    ADD CONSTRAINT fkq0okm9v81nfuren3e5y1i8dng FOREIGN KEY (artist_id) REFERENCES public.artists(id);


--
-- Name: post_reactions fkq9ivjiqt8flog43og7gtmoyqw; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT fkq9ivjiqt8flog43og7gtmoyqw FOREIGN KEY (post_id) REFERENCES public.posts(id);


--
-- Name: community_members fkqn9g17tqcwnoy41o2am9fnlep; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_members
    ADD CONSTRAINT fkqn9g17tqcwnoy41o2am9fnlep FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: conversations fks9dxpsd28ee2bc5mb7h0sl0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT fks9dxpsd28ee2bc5mb7h0sl0 FOREIGN KEY (requested_by_user_id) REFERENCES public.users(id);


--
-- Name: user_track_preference fks9ghb94n4g9a50poor319eviw; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_track_preference
    ADD CONSTRAINT fks9ghb94n4g9a50poor319eviw FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_discovery_action fksrb74afup0fx7b8c2snr5pws1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_discovery_action
    ADD CONSTRAINT fksrb74afup0fx7b8c2snr5pws1 FOREIGN KEY (target_community_id) REFERENCES public.communities(id);


--
-- Name: messages fkt492th6wsovh1nush5yl5jj8e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT fkt492th6wsovh1nush5yl5jj8e FOREIGN KEY (conversation_id) REFERENCES public.conversations(id);


--
-- Name: music_source_snapshot fktcnwy5nn5uodifgv5o9ytt5p1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_source_snapshot
    ADD CONSTRAINT fktcnwy5nn5uodifgv5o9ytt5p1 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 8S1a6Ea0kOyMmGkmN5ZxIj1dw6XoLtSqHcZQZD0ohXIgQZWfRVeYj6PjCqU1yX4

