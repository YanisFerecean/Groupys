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
  const textColor = containerColor ? getContrastColor(containerColor) : undefined;
  const avatarSize = 48;
  const visibleArtists = artists?.slice(0, size === "small" ? 1 : 3) ?? [];

  return (
    <WidgetCard
      title={size === "small" ? "Top Artist" : "Top Artists"}
      className="h-[260px] overflow-hidden"
      style={containerColor ? { backgroundColor: containerColor } : undefined}
      textColor={textColor}
    >
      {visibleArtists.length > 0 ? (
        size === "small" ? (
          <div className="flex flex-col items-center gap-3">
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
          </div>
        ) : (
          <div className="space-y-3">
            {visibleArtists.map((artist, i) => (
              <div key={i} className="flex items-center gap-3">
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
              </div>
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
