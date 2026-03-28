"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  type AlbumRatingRes,
  type AlbumRatingCreate,
  upsertAlbumRating,
  fetchAlbumRatings,
  deleteAlbumRating,
} from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AlbumRes {
  id: number;
  title: string;
  coverSmall: string | null;
  coverMedium: string | null;
  coverBig: string | null;
  coverXl: string | null;
  releaseDate: string | null;
  label: string | null;
  duration: number | null;
  nbTracks: number | null;
  fans: number | null;
  genres: string[];
  artist: { id: number; name: string; images: string[] } | null;
  tracks: { id: number; title: string; duration: number | null; preview: string | null; trackPosition: number | null }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

function formatTotalDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function scoreColor(score: number): string {
  if (score >= 8) return "text-tertiary";
  if (score >= 6) return "text-primary";
  if (score >= 4) return "text-secondary";
  return "text-error";
}

function scoreLabel(score: number): string {
  const labels: Record<number, string> = {
    10: "Masterpiece", 9: "Excellent", 8: "Great", 7: "Good",
    6: "Fine", 5: "Average", 4: "Below Average", 3: "Poor", 2: "Bad", 1: "Terrible",
  };
  return labels[score] ?? "";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScorePicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            className="transition-transform hover:scale-110 active:scale-95"
            aria-label={`Rate ${star}`}
          >
            <span
              className={`material-symbols-outlined text-2xl transition-colors ${
                star <= display ? "text-primary" : "text-outline"
              }`}
              style={{ fontVariationSettings: star <= display ? "'FILL' 1" : "'FILL' 0" }}
            >
              star
            </span>
          </button>
        ))}
        <span className={`ml-2 text-xl font-extrabold tabular-nums ${scoreColor(value)}`}>
          {value}
        </span>
      </div>
      <p className={`text-sm font-semibold ${scoreColor(display)}`}>{scoreLabel(display)}</p>
    </div>
  );
}

function RatingCard({
  rating,
  isOwn,
  onDelete,
}: {
  rating: AlbumRatingRes;
  isOwn: boolean;
  onDelete?: () => void;
}) {
  const date = new Date(rating.updatedAt).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });

  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-3 ${isOwn ? "border-primary/30 bg-primary/5" : "border-outline-variant bg-surface-container-lowest"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {rating.profileImage ? (
            <Image
              src={rating.profileImage}
              alt={rating.username}
              width={36}
              height={36}
              className="rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 text-sm font-bold text-on-surface-variant">
              {(rating.displayName ?? rating.username)[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-sm text-on-surface truncate">
              {rating.displayName ?? rating.username}
            </p>
            <p className="text-xs text-outline">{date}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-2xl font-extrabold tabular-nums ${scoreColor(rating.score)}`}>
            {rating.score}
          </span>
          <span className="text-outline text-base">/10</span>
          {isOwn && onDelete && (
            <button
              onClick={onDelete}
              className="ml-2 text-outline hover:text-error transition-colors"
              aria-label="Delete rating"
            >
              <span className="material-symbols-outlined text-base">delete</span>
            </button>
          )}
        </div>
      </div>
      {rating.review && (
        <p className="text-sm text-on-surface-variant leading-relaxed">{rating.review}</p>
      )}
    </div>
  );
}

function TrackRow({
  track,
  isPlaying,
  isLoading,
  onPress,
}: {
  track: AlbumRes["tracks"][number];
  isPlaying: boolean;
  isLoading: boolean;
  onPress: () => void;
}) {
  const mins = track.duration ? Math.floor(track.duration / 60) : null;
  const secs = track.duration ? track.duration % 60 : null;
  const duration = mins !== null && secs !== null ? `${mins}:${String(secs).padStart(2, "0")}` : null;
  const hasPreview = !!track.preview;

  return (
    <button
      className={`group flex items-center gap-4 w-full text-left px-4 py-3 rounded-2xl transition-colors ${
        isPlaying
          ? "bg-primary/8"
          : hasPreview
          ? "hover:bg-surface-container-low cursor-pointer"
          : "cursor-default opacity-50"
      }`}
      onClick={onPress}
      disabled={!hasPreview}
    >
      {/* Position / play state */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors bg-surface-container-high group-hover:bg-surface-container-highest">
        {isLoading ? (
          <span className="material-symbols-outlined text-primary text-base animate-spin">sync</span>
        ) : isPlaying ? (
          <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            pause
          </span>
        ) : hasPreview ? (
          <span className="material-symbols-outlined text-on-surface-variant text-[18px] opacity-0 group-hover:opacity-100 transition-opacity">
            play_arrow
          </span>
        ) : null}
        {!isLoading && !isPlaying && (
          <span className={`text-sm font-bold tabular-nums text-on-surface-variant absolute ${hasPreview ? "group-hover:opacity-0 transition-opacity" : ""}`}>
            {track.trackPosition ?? "·"}
          </span>
        )}
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate transition-colors ${isPlaying ? "text-primary" : "text-on-surface"}`}>
          {track.title}
        </p>
        {hasPreview && !isPlaying && (
          <p className="text-[11px] text-outline mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            Preview
          </p>
        )}
        {isPlaying && (
          <p className="text-[11px] text-primary mt-0.5">Now playing</p>
        )}
      </div>

      {/* Duration */}
      {duration && (
        <span className="text-xs text-on-surface-variant tabular-nums shrink-0">{duration}</span>
      )}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AlbumRatingPage({ id }: { id: string }) {
  const router = useRouter();
  const { getToken } = useAuth();

  const [album, setAlbum] = useState<AlbumRes | null>(null);
  const [albumLoading, setAlbumLoading] = useState(true);
  const [ratings, setRatings] = useState<AlbumRatingRes[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(true);

  const [score, setScore] = useState(7);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myRatingId, setMyRatingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const albumId = Number(id);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useEffect(() => {
    (async () => {
      setAlbumLoading(true);
      try {
        const token = await getTokenRef.current();
        const res = await fetch(`${API_URL}/albums/${albumId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setAlbum(await res.json());
      } finally {
        setAlbumLoading(false);
      }
    })();
  }, [albumId]);

  const loadRatings = async () => {
    setRatingsLoading(true);
    try {
      const token = await getTokenRef.current();
      setRatings(await fetchAlbumRatings(albumId, token));
    } finally {
      setRatingsLoading(false);
    }
  };

  useEffect(() => { loadRatings(); }, [albumId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    (async () => {
      try {
        const token = await getTokenRef.current();
        const res = await fetch(`${API_URL}/album-ratings/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const mine: AlbumRatingRes[] = await res.json();
        const existing = mine.find((r) => r.albumId === albumId);
        if (existing) {
          setMyRatingId(existing.id);
          setScore(existing.score);
          setReview(existing.review ?? "");
        }
      } catch { /* not critical */ }
    })();
  }, [albumId]);

  const myRating = ratings.find((r) => r.id === myRatingId) ?? null;
  const otherRatings = ratings.filter((r) => r.id !== myRatingId);
  const avgScore = ratings.length > 0
    ? (ratings.reduce((s, r) => s + r.score, 0) / ratings.length).toFixed(1)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const token = await getTokenRef.current();
      const payload: AlbumRatingCreate = {
        albumId,
        albumTitle: album?.title ?? String(albumId),
        albumCoverUrl: album?.coverMedium ?? null,
        artistName: album?.artist?.name ?? null,
        score,
        review: review.trim(),
      };
      const saved = await upsertAlbumRating(payload, token);
      setMyRatingId(saved.id);
      await loadRatings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const handleTrackPress = useCallback((track: AlbumRes["tracks"][number]) => {
    if (!track.preview) return;
    if (playingId === track.id) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingId(null);

    setLoadingId(track.id);
    const audio = new Audio(track.preview);
    audioRef.current = audio;
    audio.addEventListener("canplaythrough", () => {
      setLoadingId(null);
      setPlayingId(track.id);
      audio.play();
    });
    audio.addEventListener("ended", () => { setPlayingId(null); audioRef.current = null; });
    audio.addEventListener("error", () => { setLoadingId(null); });
    audio.load();
  }, [playingId]);

  const handleDelete = async () => {
    if (!myRatingId) return;
    setSubmitting(true);
    try {
      const token = await getTokenRef.current();
      await deleteAlbumRating(myRatingId, token);
      setMyRatingId(null);
      setScore(7);
      setReview("");
      await loadRatings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete rating");
    } finally {
      setSubmitting(false);
    }
  };

  if (albumLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center animate-pulse">
          <span className="material-symbols-outlined text-primary text-3xl">album</span>
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <span className="material-symbols-outlined text-primary text-4xl">error_outline</span>
        <p className="text-on-surface font-bold text-lg">Album not found</p>
        <button onClick={() => router.back()} className="text-primary font-semibold text-sm">
          Go back
        </button>
      </div>
    );
  }

  const cover = album.coverXl ?? album.coverBig ?? album.coverMedium ?? album.coverSmall ?? null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="relative h-56 sm:h-72 -mx-px overflow-hidden rounded-b-3xl lg:rounded-3xl lg:mt-6 lg:mx-6">
        {cover ? (
          <Image src={cover} alt={album.title} fill className="object-cover" />
        ) : (
          <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant/30 text-7xl">album</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
          <button
            onClick={() => router.back()}
            className="mb-4 w-9 h-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          {album.artist?.name && (
            <button
              onClick={() => router.push(`/discover/artist/${album.artist!.id}`)}
              className="text-white/70 text-sm font-medium mb-0.5 hover:text-white transition-colors text-left"
            >
              {album.artist.name}
            </button>
          )}
          <h1 className="text-white text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            {album.title}
          </h1>
        </div>
      </div>

      <div className="px-6 lg:px-8">
        {/* Meta + community score */}
        <div className="flex flex-wrap items-start justify-between gap-4 pt-5">
          <div className="flex flex-col gap-2">
            {/* Meta row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-on-surface-variant">
              {album.releaseDate && <span>{album.releaseDate.slice(0, 4)}</span>}
              {album.nbTracks != null && <span>{album.nbTracks} tracks</span>}
              {album.duration != null && <span>{formatTotalDuration(album.duration)}</span>}
              {album.label && <span className="truncate max-w-[180px]">{album.label}</span>}
              {album.fans != null && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                  {formatCount(album.fans)}
                </span>
              )}
            </div>

            {/* Genres */}
            {album.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {album.genres.map((g) => (
                  <span
                    key={g}
                    className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-container-high text-on-surface-variant"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Community score */}
          {avgScore !== null && (
            <div className="flex flex-col items-end">
              <div className="flex items-baseline gap-1">
                <span className={`text-4xl font-extrabold tabular-nums ${scoreColor(Number(avgScore))}`}>
                  {avgScore}
                </span>
                <span className="text-outline text-base">/10</span>
              </div>
              <p className="text-xs text-outline mt-0.5">
                {ratings.length} {ratings.length === 1 ? "rating" : "ratings"}
              </p>
            </div>
          )}
        </div>

        {/* Rate this album */}
        <section className="pt-8">
          <h3 className="text-on-surface font-bold text-base mb-4">
            {myRatingId ? "Your Rating" : "Rate This Album"}
          </h3>
          <form
            onSubmit={handleSubmit}
            className="bg-surface-container-lowest/65 border border-outline-variant rounded-2xl p-5 flex flex-col gap-4"
          >
            <ScorePicker value={score} onChange={setScore} />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-on-surface-variant font-medium">Review</label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share your thoughts…"
                rows={3}
                maxLength={2000}
                required
                className="w-full rounded-xl bg-surface-container border border-outline-variant px-3 py-2 text-sm text-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-outline"
              />
            </div>

            {error && (
              <p className="text-error text-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">error</span>
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-xl bg-primary text-on-primary font-bold py-2.5 text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {submitting ? "Saving…" : myRatingId ? "Update Rating" : "Submit Rating"}
              </button>
              {myRatingId && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={submitting}
                  className="rounded-xl border border-outline-variant px-4 py-2.5 text-sm text-on-surface-variant hover:text-error hover:border-error/40 transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Track list */}
        {album.tracks.length > 0 && (
          <section className="pt-8">
            <h3 className="text-on-surface font-bold text-base mb-3">Tracks</h3>
            <div className="bg-surface-container-lowest/65 border border-outline-variant rounded-2xl overflow-hidden py-1">
              {album.tracks.map((track, i) => (
                <div key={track.id}>
                  <TrackRow
                    track={track}
                    isPlaying={playingId === track.id}
                    isLoading={loadingId === track.id}
                    onPress={() => handleTrackPress(track)}
                  />
                  {i < album.tracks.length - 1 && (
                    <div className="mx-4 h-px bg-outline-variant/40" />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Community ratings */}
        {!ratingsLoading && ratings.length > 0 && (
          <section className="pt-8 pb-12">
            <h3 className="text-on-surface font-bold text-base mb-4">
              Community Ratings
              <span className="text-outline font-normal text-sm ml-2">({ratings.length})</span>
            </h3>
            <div className="flex flex-col gap-3">
              {myRating && (
                <RatingCard rating={myRating} isOwn onDelete={handleDelete} />
              )}
              {otherRatings.map((r) => (
                <RatingCard key={r.id} rating={r} isOwn={false} />
              ))}
            </div>
          </section>
        )}

        {ratingsLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center animate-pulse">
              <span className="material-symbols-outlined text-primary text-lg">star</span>
            </div>
          </div>
        )}

        {!ratingsLoading && ratings.length === 0 && (
          <p className="text-outline text-sm pt-2 pb-12">No ratings yet — be the first!</p>
        )}
      </div>
    </div>
  );
}
