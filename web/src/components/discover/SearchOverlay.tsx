"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Users, Building2, ChevronRight } from "lucide-react";
import { searchUsers, searchCommunities, type BackendUser, type CommunityRes } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

// ── Music types ───────────────────────────────────────────────────────────────

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
  artist: ArtistRes;
}

interface TrackRes {
  id: number;
  title: string;
  preview: string;
  duration: number;
  artist: ArtistRes;
  album: AlbumRes;
}

interface MusicResult {
  artists: ArtistRes[];
  albums: AlbumRes[];
  tracks: TrackRes[];
}

interface PeopleResult {
  users: BackendUser[];
  communities: CommunityRes[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[11px] font-bold text-outline uppercase tracking-wider px-4 pt-3 pb-1">
      {label}
    </p>
  );
}

function SearchingDots() {
  return (
    <div className="flex justify-center items-end gap-1.5 mt-10 h-6">
      <div className="w-2 h-2 rounded-full bg-primary/75 animate-bounce [animation-delay:0ms]" />
      <div className="w-2 h-2 rounded-full bg-primary/75 animate-bounce [animation-delay:150ms]" />
      <div className="w-2 h-2 rounded-full bg-primary/75 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

// ── Music rows ────────────────────────────────────────────────────────────────

function ArtistRow({ artist, onPress }: { artist: ArtistRes; onPress: () => void }) {
  const image =
    artist.images.find((img) => img.includes("300x300")) ||
    artist.images[artist.images.length - 1];

  return (
    <button
      className="flex items-center gap-3 px-4 py-2.5 w-full text-left hover:bg-surface-container-low transition-colors"
      onClick={onPress}
    >
      {image ? (
        <Image src={image} alt={artist.name} width={44} height={44} className="rounded-full object-cover" />
      ) : (
        <div className="w-11 h-11 rounded-full bg-surface-container-high flex items-center justify-center">
          <span className="material-symbols-outlined text-on-surface-variant/40 text-lg">person</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-on-surface truncate">{artist.name}</p>
        <p className="text-xs text-outline truncate">{formatCount(artist.listeners)} listeners</p>
      </div>
      <span className="material-symbols-outlined text-on-surface/25 text-base">chevron_right</span>
    </button>
  );
}

function AlbumRow({ album, onPress }: { album: AlbumRes; onPress: () => void }) {
  const cover = album.coverSmall || album.coverMedium;
  return (
    <button
      className="flex items-center gap-3 px-4 py-2.5 w-full text-left hover:bg-surface-container-low transition-colors"
      onClick={onPress}
    >
      {cover ? (
        <Image src={cover} alt={album.title} width={44} height={44} className="rounded-lg object-cover" />
      ) : (
        <div className="w-11 h-11 rounded-lg bg-surface-container-high flex items-center justify-center">
          <span className="material-symbols-outlined text-on-surface-variant/40 text-lg">album</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-on-surface truncate">{album.title}</p>
        <p className="text-xs text-outline truncate">{album.artist?.name}</p>
      </div>
      <span className="material-symbols-outlined text-on-surface/25 text-base">chevron_right</span>
    </button>
  );
}

function TrackRow({
  track, isPlaying, isLoading, onPress,
}: {
  track: TrackRes; isPlaying: boolean; isLoading: boolean; onPress: () => void;
}) {
  const cover = track.album?.coverSmall || track.album?.coverMedium;
  return (
    <button
      className="flex items-center gap-3 px-4 py-2.5 w-full text-left hover:bg-surface-container-low transition-colors"
      onClick={onPress}
    >
      {cover ? (
        <Image src={cover} alt={track.title} width={44} height={44} className="rounded-lg object-cover" />
      ) : (
        <div className="w-11 h-11 rounded-lg bg-surface-container-high flex items-center justify-center">
          <span className="material-symbols-outlined text-on-surface-variant/40 text-lg">music_note</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isPlaying ? "text-primary" : "text-on-surface"}`}>
          {track.title}
        </p>
        <p className="text-xs text-outline truncate">{track.artist?.name}</p>
      </div>
      <div className="w-8 flex items-center justify-end">
        {isLoading ? (
          <span className="material-symbols-outlined text-primary text-base animate-spin">sync</span>
        ) : isPlaying ? (
          <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>pause</span>
        ) : (
          <span className="text-xs text-outline">{formatDuration(track.duration)}</span>
        )}
      </div>
    </button>
  );
}

// ── People rows ───────────────────────────────────────────────────────────────

function UserRow({ user, onPress }: { user: BackendUser; onPress: () => void }) {
  return (
    <button
      className="flex items-center gap-3 px-4 py-2.5 w-full text-left hover:bg-surface-container-low transition-colors"
      onClick={onPress}
    >
      {user.profileImage ? (
        <Image src={user.profileImage} alt={user.username} width={44} height={44} className="rounded-full object-cover" />
      ) : (
        <div className="w-11 h-11 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-lg uppercase">
          {user.username.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-on-surface truncate">
          {user.displayName || user.username}
        </p>
        <p className="text-xs text-outline truncate">@{user.username}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-on-surface/25 flex-shrink-0" />
    </button>
  );
}

function CommunityRow({ community, onPress }: { community: CommunityRes; onPress: () => void }) {
  const icon =
    community.iconType === "EMOJI" && community.iconEmoji
      ? null
      : community.iconUrl || community.imageUrl;

  return (
    <button
      className="flex items-center gap-3 px-4 py-2.5 w-full text-left hover:bg-surface-container-low transition-colors"
      onClick={onPress}
    >
      {icon ? (
        <Image src={icon} alt={community.name} width={44} height={44} className="rounded-xl object-cover" />
      ) : community.iconType === "EMOJI" && community.iconEmoji ? (
        <div className="w-11 h-11 rounded-xl bg-surface-container-high flex items-center justify-center text-2xl">
          {community.iconEmoji}
        </div>
      ) : (
        <div className="w-11 h-11 rounded-xl bg-surface-container-high flex items-center justify-center">
          <Building2 className="w-5 h-5 text-on-surface-variant/40" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-on-surface truncate">{community.name}</p>
        <p className="text-xs text-outline truncate">
          {community.genre ? `${community.genre} · ` : ""}
          {formatCount(community.memberCount)} members
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-on-surface/25 flex-shrink-0" />
    </button>
  );
}

// ── Main overlay ──────────────────────────────────────────────────────────────

interface SearchOverlayProps {
  onClose: () => void;
}

type Category = "all" | "users" | "communities" | "artists" | "albums" | "tracks";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "all", label: "All" },
  { value: "users", label: "Users" },
  { value: "communities", label: "Communities" },
  { value: "artists", label: "Artists" },
  { value: "albums", label: "Albums" },
  { value: "tracks", label: "Tracks" },
];

export default function SearchOverlay({ onClose }: SearchOverlayProps) {
  const { getToken } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [musicResults, setMusicResults] = useState<MusicResult | null>(null);
  const [peopleResults, setPeopleResults] = useState<PeopleResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const abortRef = useRef<AbortController | null>(null);
  const resultCacheRef = useRef<Map<string, { music: MusicResult | null; people: PeopleResult | null }>>(new Map());

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      setMusicResults(null);
      setPeopleResults(null);
      setSearching(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const fetchKey = `${category}:${trimmed}`;

      // Serve from cache without hitting the network
      const cached = resultCacheRef.current.get(fetchKey);
      if (cached) {
        setMusicResults(cached.music);
        setPeopleResults(cached.people);
        return;
      }

      // Cancel any previous in-flight request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const { signal } = controller;

      setMusicResults(null);
      setPeopleResults(null);
      setSearching(true);

      let music: MusicResult | null = null;
      let people: PeopleResult | null = null;

      try {
        const token = await getTokenRef.current();
        const headers = { Authorization: `Bearer ${token}` };
        const q = encodeURIComponent(trimmed);

        const isMusicCategory = ["all", "artists", "albums", "tracks"].includes(category);
        const isPeopleCategory = ["all", "users", "communities"].includes(category);

        if (isMusicCategory) {
          let data: MusicResult;
          if (category === "all") {
            const res = await fetch(`${API_URL}/search?q=${q}`, { headers, signal });
            if (!res.ok) throw new Error("Search failed");
            const raw: MusicResult = await res.json();
            data = { ...raw, artists: [...raw.artists].sort((a, b) => b.listeners - a.listeners) };
          } else {
            const endpointMap: Record<string, string> = { artists: "artists", albums: "albums", tracks: "tracks" };
            const res = await fetch(`${API_URL}/${endpointMap[category]}/search?q=${q}&limit=9`, { headers, signal });
            if (!res.ok) throw new Error("Search failed");
            const raw = await res.json();
            data = {
              artists: category === "artists" ? ([...raw] as ArtistRes[]).sort((a, b) => (b.listeners ?? 0) - (a.listeners ?? 0)) : [],
              albums: category === "albums" ? (raw as AlbumRes[]) : [],
              tracks: category === "tracks" ? (raw as TrackRes[]) : [],
            };
          }
          music = data;
          setMusicResults(data);
        }

        if (isPeopleCategory) {
          const limit = category === "all" ? 3 : 9;
          const [users, communities] = await Promise.all([
            category === "communities" ? [] : searchUsers(trimmed, token, limit),
            category === "users" ? [] : searchCommunities(trimmed, token, limit),
          ]);
          people = { users, communities };
          setPeopleResults(people);
        }

        resultCacheRef.current.set(fetchKey, { music, people });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("Search error:", err);
      } finally {
        if (abortRef.current === controller) setSearching(false);
      }
    }, 450);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, category]);

  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  const handleTrackPress = useCallback((track: TrackRes) => {
    if (playingId === track.id) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
      return;
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setPlayingId(null); }
    if (!track.preview) return;
    setLoadingId(track.id);
    const audio = new Audio(track.preview);
    audioRef.current = audio;
    audio.addEventListener("canplaythrough", () => { setLoadingId(null); setPlayingId(track.id); audio.play(); });
    audio.addEventListener("ended", () => { setPlayingId(null); audioRef.current = null; });
    audio.addEventListener("error", () => { setLoadingId(null); console.error("Playback error"); });
    audio.load();
  }, [playingId]);

  const handleClose = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlayingId(null);
    onClose();
  };

  const handleArtistPress = (artist: ArtistRes) => { handleClose(); router.push(`/discover/artist/${artist.id}`); };
  const handleAlbumPress = (album: AlbumRes) => { handleClose(); router.push(`/discover/album/${album.id}`); };
  const handleUserPress = (user: BackendUser) => { handleClose(); router.push(`/discover/user/${user.username}`); };
  const handleCommunityPress = (community: CommunityRes) => { handleClose(); router.push(`/discover/community/${community.id}`); };

  // Determine what to slice for "all" — 3 per type; for filtered tabs show up to 9
  const showMusicResults = category !== "users" && category !== "communities";
  const showPeopleResults = category !== "artists" && category !== "albums" && category !== "tracks";

  const musicLimit = category === "all" ? 3 : 9;
  const displayedArtists = musicResults?.artists.slice(0, musicLimit) ?? [];
  const displayedAlbums = musicResults?.albums.slice(0, musicLimit) ?? [];
  const displayedTracks = musicResults?.tracks.slice(0, musicLimit) ?? [];
  const displayedUsers = peopleResults?.users.slice(0, category === "all" ? 3 : 9) ?? [];
  const displayedCommunities = peopleResults?.communities.slice(0, category === "all" ? 3 : 9) ?? [];

  const hasResults =
    (showMusicResults && (displayedArtists.length > 0 || displayedAlbums.length > 0 || displayedTracks.length > 0)) ||
    (showPeopleResults && (displayedUsers.length > 0 || displayedCommunities.length > 0));

  return (
    <div className="fixed inset-0 z-[100] animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-surface/60 backdrop-blur-xl" onClick={handleClose} />

      {/* Content */}
      <div className="relative max-w-2xl mx-auto px-4 pt-20 h-full flex flex-col">
        {/* Search input */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 flex items-center gap-2 bg-surface-container-lowest/80 border border-white/80 rounded-2xl px-4 py-3 shadow-sm">
            <span className="material-symbols-outlined text-outline text-lg">search</span>
            <input
              ref={inputRef}
              className="flex-1 bg-transparent border-none outline-none text-sm text-on-surface placeholder:text-outline"
              placeholder="Users, communities, artists, albums, tracks"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoCorrect="off"
            />
            {query.length > 0 && (
              <button onClick={() => setQuery("")} className="text-outline hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-lg">cancel</span>
              </button>
            )}
          </div>
          <button onClick={handleClose} className="text-primary font-semibold text-sm py-1.5 hover:opacity-80 transition-opacity">
            Cancel
          </button>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
          {CATEGORIES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setCategory(value)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                category === value
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container border border-white/80 text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Results area */}
        <div className="flex-1 overflow-y-auto pb-12">
          {searching && <SearchingDots />}

          {!searching && query.length > 0 && !hasResults && (
            <p className="text-center text-outline text-sm mt-8">No results for &ldquo;{query}&rdquo;</p>
          )}

          {!searching && !query && (
            <div className="flex flex-col items-center mt-12 gap-4 text-outline">
              <div className="flex gap-6">
                <div className="flex flex-col items-center gap-1">
                  <Users className="w-7 h-7" />
                  <span className="text-xs font-medium">Users</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Building2 className="w-7 h-7" />
                  <span className="text-xs font-medium">Communities</span>
                </div>
              </div>
              <p className="text-sm">Start typing to search</p>
            </div>
          )}

          {!searching && hasResults && (
            <div className="space-y-2">
              {/* Users */}
              {showPeopleResults && displayedUsers.length > 0 && (
                <div className="bg-surface-container-lowest/65 border border-white/80 rounded-2xl overflow-hidden shadow-sm">
                  <SectionLabel label="Users" />
                  {displayedUsers.map((u) => (
                    <UserRow key={u.id} user={u} onPress={() => handleUserPress(u)} />
                  ))}
                </div>
              )}

              {/* Communities */}
              {showPeopleResults && displayedCommunities.length > 0 && (
                <div className="bg-surface-container-lowest/65 border border-white/80 rounded-2xl overflow-hidden shadow-sm">
                  <SectionLabel label="Communities" />
                  {displayedCommunities.map((c) => (
                    <CommunityRow key={c.id} community={c} onPress={() => handleCommunityPress(c)} />
                  ))}
                </div>
              )}

              {/* Artists */}
              {showMusicResults && displayedArtists.length > 0 && (
                <div className="bg-surface-container-lowest/65 border border-white/80 rounded-2xl overflow-hidden shadow-sm">
                  <SectionLabel label="Artists" />
                  {displayedArtists.map((a) => (
                    <ArtistRow key={a.id} artist={a} onPress={() => handleArtistPress(a)} />
                  ))}
                </div>
              )}

              {/* Albums */}
              {showMusicResults && displayedAlbums.length > 0 && (
                <div className="bg-surface-container-lowest/65 border border-white/80 rounded-2xl overflow-hidden shadow-sm">
                  <SectionLabel label="Albums" />
                  {displayedAlbums.map((a) => (
                    <AlbumRow key={a.id} album={a} onPress={() => handleAlbumPress(a)} />
                  ))}
                </div>
              )}

              {/* Tracks */}
              {showMusicResults && displayedTracks.length > 0 && (
                <div className="bg-surface-container-lowest/65 border border-white/80 rounded-2xl overflow-hidden shadow-sm">
                  <SectionLabel label="Tracks" />
                  {displayedTracks.map((t) => (
                    <TrackRow
                      key={t.id}
                      track={t}
                      isPlaying={playingId === t.id}
                      isLoading={loadingId === t.id}
                      onPress={() => handleTrackPress(t)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
