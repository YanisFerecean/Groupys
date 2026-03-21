"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import CreateCommunityModal from "@/components/discover/CreateCommunityModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

// ── Types ────────────────────────────────────────────────────────────────────

interface ArtistRes {
  id: number;
  name: string;
  images: string[];
  listeners: number;
  playcount: number;
  summary: string;
}

interface AlbumRes {
  id: number;
  title: string;
  coverSmall: string;
  coverMedium: string;
}

interface ArtistTopTrack {
  id: number;
  title: string;
  preview: string;
  duration: number;
  rank: number;
  album: AlbumRes;
}

interface CommunityRes {
  id: string;
  name: string;
  description: string;
  genre: string;
  country: string;
  tags: string[];
  artistId: number;
  memberCount: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1_000_000_000)
    return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const COMMUNITY_COLORS = [
  "#7c3aed",
  "#be185d",
  "#0891b2",
  "#b45309",
  "#059669",
  "#6366f1",
];

// ── Sub-components ───────────────────────────────────────────────────────────

function CommunityCard({
  community,
  index,
  joined,
  onToggleJoin,
  joining,
  onClick,
}: {
  community: CommunityRes;
  index: number;
  joined: boolean;
  onToggleJoin: () => void;
  joining: boolean;
  onClick: () => void;
}) {
  const color = COMMUNITY_COLORS[index % COMMUNITY_COLORS.length];

  return (
    <div
      className="relative overflow-hidden rounded-2xl text-left min-h-[120px] cursor-pointer transition-transform hover:scale-[0.98] active:scale-95"
      style={{ backgroundColor: color }}
      onClick={onClick}
    >
      <span
        className="material-symbols-outlined absolute -top-2 -right-2 text-white/10 select-none pointer-events-none"
        style={{ fontSize: 80, fontVariationSettings: "'FILL' 1" }}
      >
        group
      </span>
      <div className="relative p-5 flex flex-col justify-end h-full">
        <h4 className="text-lg font-extrabold text-white mb-1">
          {community.name}
        </h4>
        {community.country && (
          <p className="text-xs text-white/70 font-medium mb-1">
            {community.country}
          </p>
        )}
        {community.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {community.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-semibold text-white/90 bg-white/20 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className="material-symbols-outlined text-white/70"
              style={{ fontSize: 14 }}
            >
              group
            </span>
            <span className="text-xs font-semibold text-white/70">
              {formatCount(community.memberCount)} members
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleJoin();
            }}
            disabled={joining}
            className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${
              joined
                ? "bg-white/20 text-white hover:bg-white/30"
                : "bg-white text-black/80 hover:bg-white/90"
            } disabled:opacity-50`}
          >
            {joining ? "..." : joined ? "Joined" : "Join"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TrackRow({
  track,
  index,
  isPlaying,
  isLoading,
  onPress,
}: {
  track: ArtistTopTrack;
  index: number;
  isPlaying: boolean;
  isLoading: boolean;
  onPress: () => void;
}) {
  const cover = track.album?.coverSmall || track.album?.coverMedium;

  return (
    <button
      className="flex items-center gap-3 py-3 w-full text-left hover:bg-surface-container-low/50 rounded-xl px-2 transition-colors"
      onClick={onPress}
    >
      <div className="w-5 flex items-center justify-center shrink-0">
        {isLoading ? (
          <span className="material-symbols-outlined text-primary text-base animate-spin">
            sync
          </span>
        ) : isPlaying ? (
          <span
            className="material-symbols-outlined text-primary text-base"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            pause
          </span>
        ) : (
          <span className="text-on-surface-variant text-sm">{index + 1}</span>
        )}
      </div>

      {cover ? (
        <img
          src={cover}
          alt={track.title}
          className="w-11 h-11 rounded-lg object-cover shrink-0"
        />
      ) : (
        <div className="w-11 h-11 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-on-surface-variant/40 text-lg">
            music_note
          </span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold truncate ${isPlaying ? "text-primary" : "text-on-surface"}`}
        >
          {track.title}
        </p>
        {track.album?.title && (
          <p className="text-xs text-on-surface-variant truncate mt-0.5">
            {track.album.title}
          </p>
        )}
      </div>

      <span className="text-xs text-on-surface-variant shrink-0">
        {formatDuration(track.duration)}
      </span>
    </button>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ArtistDetail({ id }: { id: string }) {
  const router = useRouter();
  const { getToken } = useAuth();

  const [artist, setArtist] = useState<ArtistRes | null>(null);
  const [tracks, setTracks] = useState<ArtistTopTrack[]>([]);
  const [communities, setCommunities] = useState<CommunityRes[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tracksExpanded, setTracksExpanded] = useState(false);
  const [communitiesExpanded, setCommunitiesExpanded] = useState(false);
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);

  const [playingId, setPlayingId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchCommunities = useCallback(async () => {
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_URL}/communities/artist/${id}`, {
        headers,
      });
      if (!res.ok) return;
      const data: CommunityRes[] = await res.json();
      setCommunities(data);

      const memberChecks = await Promise.all(
        data.map((c) =>
          fetch(`${API_URL}/communities/${c.id}/membership`, { headers })
            .then((r) => r.json())
            .then((r) => (r.member ? c.id : null))
            .catch(() => null),
        ),
      );
      setJoinedIds(new Set(memberChecks.filter(Boolean) as string[]));
    } catch (err) {
      console.error("Failed to fetch communities:", err);
    }
  }, [id, getToken]);

  // Fetch artist + tracks + communities
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [artistData, tracksData, communitiesData] = await Promise.all([
          fetch(`${API_URL}/artists/${id}`, { headers }).then((r) => r.json()),
          fetch(`${API_URL}/artists/${id}/top-tracks?limit=5`, {
            headers,
          }).then((r) => r.json()),
          fetch(`${API_URL}/communities/artist/${id}`, { headers }).then((r) =>
            r.ok ? r.json() : [],
          ),
        ]);
        if (!cancelled) {
          setArtist(artistData);
          setTracks(tracksData);
          setCommunities(communitiesData);

          // Check membership for each community
          const memberChecks = await Promise.all(
            (communitiesData as CommunityRes[]).map((c) =>
              fetch(`${API_URL}/communities/${c.id}/membership`, { headers })
                .then((r) => r.json())
                .then((r) => (r.member ? c.id : null))
                .catch(() => null),
            ),
          );
          if (!cancelled) {
            setJoinedIds(new Set(memberChecks.filter(Boolean) as string[]));
          }
        }
      } catch (err) {
        console.error("Failed to fetch artist:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, getToken]);

  const handleToggleJoin = useCallback(
    async (communityId: string) => {
      setJoiningId(communityId);
      try {
        const token = await getToken();
        const isJoined = joinedIds.has(communityId);
        const res = await fetch(
          `${API_URL}/communities/${communityId}/${isJoined ? "leave" : "join"}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!res.ok) throw new Error("Failed");
        const updated: CommunityRes = await res.json();

        setCommunities((prev) =>
          prev.map((c) => (c.id === communityId ? updated : c)),
        );
        setJoinedIds((prev) => {
          const next = new Set(prev);
          if (isJoined) next.delete(communityId);
          else next.add(communityId);
          return next;
        });
      } catch (err) {
        console.error("Join/leave error:", err);
      } finally {
        setJoiningId(null);
      }
    },
    [getToken, joinedIds],
  );

  // Cleanup audio
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleTrackPress = useCallback(
    (track: ArtistTopTrack) => {
      if (playingId === track.id) {
        audioRef.current?.pause();
        audioRef.current = null;
        setPlayingId(null);
        return;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setPlayingId(null);
      }
      if (!track.preview) return;

      setLoadingId(track.id);
      const audio = new Audio(track.preview);
      audioRef.current = audio;
      audio.addEventListener("canplaythrough", () => {
        setLoadingId(null);
        setPlayingId(track.id);
        audio.play();
      });
      audio.addEventListener("ended", () => {
        setPlayingId(null);
        audioRef.current = null;
      });
      audio.addEventListener("error", () => {
        setLoadingId(null);
      });
      audio.load();
    },
    [playingId],
  );

  const heroImage =
    artist?.images[artist.images.length - 1] ||
    artist?.images.find((img) => img.includes("300x300")) ||
    null;

  const visibleTracks = tracksExpanded ? tracks.slice(0, 5) : tracks.slice(0, 3);
  const canExpandTracks = tracks.length > 3;

  const visibleCommunities = communitiesExpanded
    ? communities
    : communities.slice(0, 2);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center animate-pulse">
          <span className="material-symbols-outlined text-primary text-3xl">
            music_note
          </span>
        </div>
      </div>
    );
  }

  // Not found
  if (!artist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <span className="material-symbols-outlined text-primary text-4xl">
          error_outline
        </span>
        <p className="text-on-surface font-bold text-lg">Artist not found</p>
        <button
          onClick={() => router.back()}
          className="text-primary font-semibold text-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="relative h-64 sm:h-80 lg:h-96 -mx-px overflow-hidden rounded-b-3xl lg:rounded-3xl lg:mt-6 lg:mx-6">
        {heroImage ? (
          <img
            src={heroImage}
            alt={artist.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant/30 text-7xl">
              person
            </span>
          </div>
        )}
        {/* Gradient overlay + name */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-6 lg:px-8 pb-6">
          <button
            onClick={() => router.back()}
            className="mb-4 w-9 h-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">
              arrow_back
            </span>
          </button>
          <h1 className="text-white text-3xl lg:text-4xl font-extrabold tracking-tight">
            {artist.name}
          </h1>
        </div>
      </div>

      <div className="px-6 lg:px-8">
        {/* Stats */}
        <div className="flex gap-8 pt-6">
          <div>
            <p className="text-primary font-extrabold text-xl">
              {formatCount(artist.listeners)}
            </p>
            <p className="text-on-surface-variant text-xs mt-0.5">listeners</p>
          </div>
          <div className="w-px bg-surface-container-highest" />
          <div>
            <p className="text-primary font-extrabold text-xl">
              {formatCount(artist.playcount)}
            </p>
            <p className="text-on-surface-variant text-xs mt-0.5">plays</p>
          </div>
        </div>

        {/* Communities */}
        <section className="pt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-on-surface font-bold text-base">
              Communities
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateCommunity(true)}
                className="flex items-center gap-1.5 text-primary text-sm font-semibold hover:opacity-80 transition-opacity"
              >
                <span className="material-symbols-outlined text-base">add</span>
                Create
              </button>
              {communities.length > 2 && (
                <button
                  onClick={() => setCommunitiesExpanded((e) => !e)}
                  className="text-primary text-sm font-semibold hover:opacity-80 transition-opacity"
                >
                  {communitiesExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          </div>
          {communities.length === 0 ? (
            <p className="text-on-surface-variant text-sm">
              No communities yet — be the first to create one!
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visibleCommunities.map((c, i) => (
                <CommunityCard
                  key={c.id}
                  community={c}
                  index={i}
                  joined={joinedIds.has(c.id)}
                  onToggleJoin={() => handleToggleJoin(c.id)}
                  joining={joiningId === c.id}
                  onClick={() => router.push(`/discover/community/${c.id}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Top Tracks */}
        {tracks.length > 0 && (
          <section className="pt-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-on-surface font-bold text-base">
                Top Tracks
              </h3>
              {canExpandTracks && (
                <button
                  onClick={() => setTracksExpanded((e) => !e)}
                  className="text-primary text-sm font-semibold hover:opacity-80 transition-opacity"
                >
                  {tracksExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
            <div>
              {visibleTracks.map((track, i) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={i}
                  isPlaying={playingId === track.id}
                  isLoading={loadingId === track.id}
                  onPress={() => handleTrackPress(track)}
                />
              ))}
            </div>
          </section>
        )}

        {/* About */}
        {artist.summary && (
          <section className="pt-8 pb-12">
            <h3 className="text-on-surface font-bold text-base mb-2">About</h3>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              {artist.summary.replace(/<[^>]*>/g, "").split("\n")[0]}
            </p>
          </section>
        )}
      </div>

      {showCreateCommunity && (
        <CreateCommunityModal
          artistId={id}
          artistName={artist.name}
          onClose={() => setShowCreateCommunity(false)}
          onCreated={() => {
            setShowCreateCommunity(false);
            fetchCommunities();
          }}
        />
      )}
    </div>
  );
}
