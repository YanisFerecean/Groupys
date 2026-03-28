"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import type { ProfileCustomization } from "@/types/profile";
import { getContrastColor } from "@/lib/utils";
import WidgetCard from "./WidgetCard";

interface TopArtistsWidgetProps {
  artists?: ProfileCustomization["topArtists"];
  containerColor?: string;
  size?: "small" | "normal";
}

export default function TopArtistsWidget({ artists, containerColor, size = "normal" }: TopArtistsWidgetProps) {
  const router = useRouter();
  const textColor = containerColor ? getContrastColor(containerColor) : undefined;
  const avatarSize = 48;
  const visibleArtists = artists?.slice(0, size === "small" ? 1 : 3) ?? [];

  async function handleArtistClick(artist: NonNullable<TopArtistsWidgetProps["artists"]>[number]) {
    if (artist.id) {
      router.push(`/discover/artist/${artist.id}`);
      return;
    }
    try {
      const res = await fetch(`/api/music-search?q=${encodeURIComponent(artist.name)}&type=artist`);
      const data = await res.json();
      const match = data.results?.[0];
      if (match?.id) router.push(`/discover/artist/${match.id}`);
    } catch {
      // silently ignore
    }
  }

  return (
    <WidgetCard
      title={size === "small" ? "Top Artist" : "Top Artists"}
      className="h-[260px] overflow-hidden"
      style={containerColor ? { backgroundColor: containerColor } : undefined}
      textColor={textColor}
    >
      {visibleArtists.length > 0 ? (
        size === "small" ? (
          <button
            type="button"
            onClick={() => handleArtistClick(visibleArtists[0])}
            className="flex flex-col items-center gap-3 w-full cursor-pointer hover:opacity-80 transition-opacity"
          >
            {visibleArtists[0].imageUrl ? (
              <div className="relative w-full aspect-square rounded-full overflow-hidden bg-surface-container-high">
                <Image alt={visibleArtists[0].name} fill className="object-cover" src={visibleArtists[0].imageUrl} />
              </div>
            ) : (
              <div className="w-full aspect-square rounded-full bg-surface-container-high flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant/40 text-5xl">person</span>
              </div>
            )}
            <div className="min-w-0 w-full text-center">
              <p className="font-semibold text-sm truncate">{visibleArtists[0].name}</p>
              {visibleArtists[0].genre && (
                <p className="text-xs truncate" style={textColor ? { color: textColor, opacity: 0.6 } : { color: "var(--color-on-surface-variant)" }}>
                  {visibleArtists[0].genre}
                </p>
              )}
            </div>
          </button>
        ) : (
          <div className="space-y-3">
            {visibleArtists.map((artist, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleArtistClick(artist)}
                className="flex items-center gap-3 w-full text-left cursor-pointer hover:opacity-80 transition-opacity"
              >
                {artist.imageUrl ? (
                  <div className="relative rounded-full overflow-hidden shrink-0 bg-surface-container-high" style={{ width: avatarSize, height: avatarSize }}>
                    <Image alt={artist.name} fill className="object-cover" src={artist.imageUrl} />
                  </div>
                ) : (
                  <div className="rounded-full shrink-0 bg-surface-container-high flex items-center justify-center" style={{ width: avatarSize, height: avatarSize }}>
                    <span className="material-symbols-outlined text-on-surface-variant text-lg">person</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{artist.name}</p>
                  {artist.genre && (
                    <p className="text-xs truncate" style={textColor ? { color: textColor, opacity: 0.6 } : { color: "var(--color-on-surface-variant)" }}>
                      {artist.genre}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        <p className="text-sm" style={textColor ? { color: textColor, opacity: 0.6 } : { color: "var(--color-on-surface-variant)" }}>
          No top artists set. Edit your profile to add some.
        </p>
      )}
    </WidgetCard>
  );
}
