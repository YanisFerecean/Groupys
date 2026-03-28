"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { fetchUserAlbumRatings, type AlbumRatingRes } from "@/lib/api";
import WidgetCard from "./WidgetCard";


export default function LastRatedAlbumWidget({ username }: { username: string }) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [rating, setRating] = useState<AlbumRatingRes | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const ratings = await fetchUserAlbumRatings(username, token);
        setRating(ratings[0] ?? null);
      } catch {
        // silently fail — widget just won't show
      } finally {
        setLoading(false);
      }
    })();
  }, [username, getToken]);

  return (
    <WidgetCard title="Last Rated Album">
      {loading ? (
        <div className="h-16 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-outline border-t-primary animate-spin" />
        </div>
      ) : rating ? (
        <button
          className="w-full text-left flex items-start gap-3 group"
          onClick={() => router.push(`/album/${rating.albumId}`)}
        >
          {rating.albumCoverUrl ? (
            <Image
              src={rating.albumCoverUrl}
              alt={rating.albumTitle}
              width={56}
              height={56}
              className="rounded-lg object-cover shrink-0 shadow group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-surface-variant/40 text-2xl">album</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">
              {rating.albumTitle}
            </p>
            {rating.artistName && (
              <p className="text-xs text-on-surface-variant truncate">{rating.artistName}</p>
            )}
            <p className="text-xs font-bold mt-1" style={{ color: "var(--profile-accent, var(--color-primary))" }}>
              {rating.score}/10
            </p>
          </div>
        </button>
      ) : (
        <p className="text-sm text-on-surface-variant">No albums rated yet.</p>
      )}
    </WidgetCard>
  );
}
