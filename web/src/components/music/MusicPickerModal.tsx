"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { AlbumPayload, TrackPayload } from "@/types/chat";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { MusicCardArtwork } from "./MusicCardArtwork";
import { PreviewButton } from "./PreviewButton";

type PickType = "track" | "album";

interface TrackResult {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  preview?: string | null;
}
interface AlbumResult {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
}

interface MusicPickerModalProps {
  title?: string;
  /** Restrict search to specific catalogues. Defaults to tracks + albums. */
  types?: PickType[];
  /** Only surface tracks that have a playable 30s preview. */
  previewOnly?: boolean;
  onClose: () => void;
  onPickTrack?: (track: TrackPayload) => void;
  onPickAlbum?: (album: AlbumPayload) => void;
}

function toTrackPayload(r: TrackResult): TrackPayload {
  return {
    type: "TRACK",
    id: String(r.id),
    title: r.title,
    artist: r.artist,
    album: r.album,
    artworkUrl: r.coverUrl,
    previewUrl: r.preview ?? undefined,
  };
}

/** Search modal for picking a song or album to share, dedicate, react with, etc. */
export function MusicPickerModal({
  title = "Share music",
  types,
  previewOnly,
  onClose,
  onPickTrack,
  onPickAlbum,
}: MusicPickerModalProps) {
  const { getToken } = useAuth();
  const available: PickType[] = types ?? (onPickAlbum ? ["track", "album"] : ["track"]);
  const [type, setType] = useState<PickType>(available[0]);
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<TrackResult[]>([]);
  const [albums, setAlbums] = useState<AlbumResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounced = useDebouncedValue(query.trim(), 350);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (debounced.length < 2) {
        if (mounted) {
          setTracks([]);
          setAlbums([]);
        }
        return;
      }
      setLoading(true);
      try {
        const token = await getToken();
        const res = await fetch(`/api/music-search?q=${encodeURIComponent(debounced)}&type=${type}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!mounted) return;
        if (type === "track") {
          let results: TrackResult[] = data.results ?? [];
          if (previewOnly) results = results.filter((r) => !!r.preview);
          setTracks(results);
        } else {
          setAlbums(data.results ?? []);
        }
      } catch (e) {
        console.error("Music search failed", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [debounced, type, previewOnly, getToken]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl bg-surface border border-surface-container-high shadow-xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 pb-2">
          <h3 className="font-semibold text-on-surface">{title}</h3>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4">
          <div className="flex items-center gap-2 bg-surface-container rounded-full px-4 py-2">
            <Search className="w-4 h-4 text-on-surface-variant shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${available.join(" / ")}…`}
              className="flex-1 bg-transparent text-[15px] text-on-surface focus:outline-none placeholder:text-on-surface-variant"
            />
          </div>

          {available.length > 1 && (
            <div className="flex gap-2 mt-3">
              {available.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-3 py-1 rounded-full text-[13px] font-medium capitalize transition-colors ${
                    type === t
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {t}s
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 mt-1">
          {loading && <p className="px-3 py-3 text-sm text-on-surface-variant">Searching…</p>}

          {!loading &&
            type === "track" &&
            tracks.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  onPickTrack?.(toTrackPayload(r));
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-surface-container text-left transition-colors"
              >
                <MusicCardArtwork url={r.coverUrl} alt={r.title} size={44}>
                  {r.preview && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <PreviewButton
                        trackId={r.id}
                        previewUrl={r.preview}
                        className="h-6 w-6 rounded-full flex items-center justify-center bg-white/90 text-black"
                        iconClassName="w-3 h-3"
                      />
                    </div>
                  )}
                </MusicCardArtwork>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-on-surface truncate">{r.title}</p>
                  <p className="text-[12px] text-on-surface-variant truncate">{r.artist}</p>
                </div>
              </button>
            ))}

          {!loading &&
            type === "album" &&
            albums.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  onPickAlbum?.({
                    type: "ALBUM",
                    id: String(r.id),
                    title: r.title,
                    artist: r.artist,
                    artworkUrl: r.coverUrl,
                  });
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-surface-container text-left transition-colors"
              >
                <MusicCardArtwork url={r.coverUrl} alt={r.title} size={44} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-on-surface truncate">{r.title}</p>
                  <p className="text-[12px] text-on-surface-variant truncate">{r.artist}</p>
                </div>
              </button>
            ))}

          {!loading && debounced.length >= 2 && tracks.length === 0 && albums.length === 0 && (
            <p className="px-3 py-3 text-sm text-on-surface-variant">No results.</p>
          )}
        </div>
      </div>
    </div>
  );
}
