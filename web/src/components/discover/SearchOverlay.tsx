"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

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

interface SearchResult {
  artists: ArtistRes[];
  albums: AlbumRes[];
  tracks: TrackRes[];
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

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// ── Result rows ──────────────────────────────────────────────────────────────

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
        <img
          src={image}
          alt={artist.name}
          className="w-11 h-11 rounded-full object-cover"
        />
      ) : (
        <div className="w-11 h-11 rounded-full bg-surface-container-high flex items-center justify-center">
          <span className="material-symbols-outlined text-on-surface-variant/40 text-lg">
            person
          </span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-on-surface truncate">
          {artist.name}
        </p>
        <p className="text-xs text-outline truncate">
          {formatCount(artist.listeners)} listeners
        </p>
      </div>
      <span className="material-symbols-outlined text-on-surface/25 text-base">
        chevron_right
      </span>
    </button>
  );
}

function AlbumRow({ album }: { album: AlbumRes }) {
  const cover = album.coverSmall || album.coverMedium;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      {cover ? (
        <img
          src={cover}
          alt={album.title}
          className="w-11 h-11 rounded-lg object-cover"
        />
      ) : (
        <div className="w-11 h-11 rounded-lg bg-surface-container-high flex items-center justify-center">
          <span className="material-symbols-outlined text-on-surface-variant/40 text-lg">
            album
          </span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-on-surface truncate">
          {album.title}
        </p>
        <p className="text-xs text-outline truncate">{album.artist?.name}</p>
      </div>
    </div>
  );
}

function TrackRow({
  track,
  isPlaying,
  isLoading,
  onPress,
}: {
  track: TrackRes;
  isPlaying: boolean;
  isLoading: boolean;
  onPress: () => void;
}) {
  const cover = track.album?.coverSmall || track.album?.coverMedium;

  return (
    <button
      className="flex items-center gap-3 px-4 py-2.5 w-full text-left hover:bg-surface-container-low transition-colors"
      onClick={onPress}
    >
      {cover ? (
        <img
          src={cover}
          alt={track.title}
          className="w-11 h-11 rounded-lg object-cover"
        />
      ) : (
        <div className="w-11 h-11 rounded-lg bg-surface-container-high flex items-center justify-center">
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
        <p className="text-xs text-outline truncate">{track.artist?.name}</p>
      </div>
      <div className="w-8 flex items-center justify-end">
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
          <span className="text-xs text-outline">
            {formatDuration(track.duration)}
          </span>
        )}
      </div>
    </button>
  );
}

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

// ── Main overlay ─────────────────────────────────────────────────────────────

interface SearchOverlayProps {
  onClose: () => void;
}

export default function SearchOverlay({ onClose }: SearchOverlayProps) {
  const { getToken } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const lastFetchedRef = useRef("");

  // Auto-focus input
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      setSearching(false);
      lastFetchedRef.current = "";
      return;
    }

    setResults(null);

    debounceRef.current = setTimeout(async () => {
      if (trimmed === lastFetchedRef.current) return;

      setSearching(true);
      try {
        const token = await getTokenRef.current();
        const res = await fetch(
          `${API_URL}/search?q=${encodeURIComponent(trimmed)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) throw new Error("Search failed");
        const data: SearchResult = await res.json();
        lastFetchedRef.current = trimmed;
        setResults({
          ...data,
          artists: [...data.artists].sort((a, b) => b.listeners - a.listeners),
        });
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearching(false);
      }
    }, 450);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleTrackPress = useCallback(
    (track: TrackRes) => {
      // Toggle off
      if (playingId === track.id) {
        audioRef.current?.pause();
        audioRef.current = null;
        setPlayingId(null);
        return;
      }

      // Stop current
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
        console.error("Playback error");
      });
      audio.load();
    },
    [playingId],
  );

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
    onClose();
  };

  const handleArtistPress = (artist: ArtistRes) => {
    handleClose();
    router.push(`/discover/artist/${artist.id}`);
  };

  const hasResults =
    results &&
    (results.artists.length > 0 ||
      results.albums.length > 0 ||
      results.tracks.length > 0);

  return (
    <div className="fixed inset-0 z-[100] animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-surface/60 backdrop-blur-xl"
        onClick={handleClose}
      />

      {/* Content */}
      <div className="relative max-w-2xl mx-auto px-4 pt-20 h-full flex flex-col">
        {/* Search input */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 flex items-center gap-2 bg-surface-container-lowest/80 border border-white/80 rounded-2xl px-4 py-3 shadow-sm">
            <span className="material-symbols-outlined text-outline text-lg">
              search
            </span>
            <input
              ref={inputRef}
              className="flex-1 bg-transparent border-none outline-none text-sm text-on-surface placeholder:text-outline"
              placeholder="Artists, albums, or tracks"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoCorrect="off"
            />
            {query.length > 0 && (
              <button
                onClick={() => setQuery("")}
                className="text-outline hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-lg">
                  cancel
                </span>
              </button>
            )}
          </div>
          <button
            onClick={handleClose}
            className="text-primary font-semibold text-sm py-1.5 hover:opacity-80 transition-opacity"
          >
            Cancel
          </button>
        </div>

        {/* Results area */}
        <div className="flex-1 overflow-y-auto pb-12">
          {searching && <SearchingDots />}

          {!searching && query.length > 0 && !hasResults && (
            <p className="text-center text-outline text-sm mt-8">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {!searching && !query && (
            <p className="text-center text-outline text-sm mt-8">
              Start typing to search
            </p>
          )}

          {hasResults && (
            <div className="space-y-2">
              {results!.artists.length > 0 && (
                <div className="bg-surface-container-lowest/65 border border-white/80 rounded-2xl overflow-hidden shadow-sm">
                  <SectionLabel label="Artists" />
                  {results!.artists.map((a) => (
                    <ArtistRow key={a.id} artist={a} onPress={() => handleArtistPress(a)} />
                  ))}
                </div>
              )}

              {results!.albums.length > 0 && (
                <div className="bg-surface-container-lowest/65 border border-white/80 rounded-2xl overflow-hidden shadow-sm">
                  <SectionLabel label="Albums" />
                  {results!.albums.map((a) => (
                    <AlbumRow key={a.id} album={a} />
                  ))}
                </div>
              )}

              {results!.tracks.length > 0 && (
                <div className="bg-surface-container-lowest/65 border border-white/80 rounded-2xl overflow-hidden shadow-sm">
                  <SectionLabel label="Tracks" />
                  {results!.tracks.map((t) => (
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
