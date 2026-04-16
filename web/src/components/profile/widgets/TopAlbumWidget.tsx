"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import type { ProfileCustomization } from "@/types/profile";
import { getContrastColor } from "@/lib/utils";
import WidgetCard from "./WidgetCard";

interface TopAlbumsWidgetProps {
  albums?: ProfileCustomization["topAlbums"];
  containerColor?: string;
  size?: "small" | "normal";
  className?: string;
}

export default function TopAlbumsWidget({ albums, containerColor, size = "normal", className }: TopAlbumsWidgetProps) {
  const router = useRouter();
  const textColor = containerColor ? getContrastColor(containerColor) : undefined;
  const visibleAlbums = albums?.slice(0, size === "small" ? 1 : 3) ?? [];

  async function handleAlbumClick(album: NonNullable<TopAlbumsWidgetProps["albums"]>[number]) {
    if (album.id) {
      router.push(`/discover/album/${album.id}`);
      return;
    }
    try {
      const res = await fetch(`/api/music-search?q=${encodeURIComponent(album.title)}&type=album`);
      const data = await res.json();
      const match = data.results?.[0];
      if (match?.id) router.push(`/discover/album/${match.id}`);
    } catch {
      // silently ignore
    }
  }

  return (
    <WidgetCard
      title={size === "small" ? "Top Album" : "Top Albums"}
      className={className ?? "h-[260px] overflow-hidden"}
      style={containerColor ? { backgroundColor: containerColor } : undefined}
      textColor={textColor}
    >
      {visibleAlbums.length > 0 ? (
        size === "small" ? (
          <button
            type="button"
            onClick={() => handleAlbumClick(visibleAlbums[0])}
            className="flex flex-col gap-3 w-full text-left cursor-pointer hover:opacity-80 transition-opacity"
          >
            {visibleAlbums[0].coverUrl ? (
              <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-md">
                <Image alt={visibleAlbums[0].title} fill className="object-cover" src={visibleAlbums[0].coverUrl} />
              </div>
            ) : (
              <div className="w-full aspect-square rounded-xl bg-surface-container-high flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant/40 text-4xl">album</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{visibleAlbums[0].title}</p>
              <p className="text-xs truncate" style={textColor ? { color: textColor, opacity: 0.6 } : { color: "var(--color-on-surface-variant)" }}>
                {visibleAlbums[0].artist}
              </p>
            </div>
          </button>
        ) : (
          <div className="space-y-3">
            {visibleAlbums.map((album, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleAlbumClick(album)}
                className="flex items-center gap-3 w-full text-left cursor-pointer hover:opacity-80 transition-opacity"
              >
                {album.coverUrl ? (
                  <Image alt={album.title} src={album.coverUrl} width={48} height={48} className="rounded-lg object-cover shrink-0 shadow" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-surface-variant text-lg">album</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{album.title}</p>
                  <p className="text-xs truncate" style={textColor ? { color: textColor, opacity: 0.6 } : { color: "var(--color-on-surface-variant)" }}>
                    {album.artist}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        <p className="text-sm" style={textColor ? { color: textColor, opacity: 0.6 } : { color: "var(--color-on-surface-variant)" }}>
          No top albums set. Edit your profile to add some.
        </p>
      )}
    </WidgetCard>
  );
}
