import Image from "next/image";
import type { ProfileCustomization } from "@/types/profile";
import { getContrastColor } from "@/lib/utils";
import WidgetCard from "./WidgetCard";

interface TopSongsWidgetProps {
  songs?: ProfileCustomization["topSongs"];
  containerColor?: string;
  size?: "small" | "normal";
}

export default function TopSongsWidget({ songs, containerColor, size = "normal" }: TopSongsWidgetProps) {
  const textColor = containerColor ? getContrastColor(containerColor) : undefined;
  const coverSize = 48;
  const visibleSongs = songs?.slice(0, size === "small" ? 1 : 3) ?? [];

  return (
    <WidgetCard
      title={size === "small" ? "Top Song" : "Top Songs"}
      className="h-[260px] overflow-hidden"
      style={containerColor ? { backgroundColor: containerColor } : undefined}
      textColor={textColor}
    >
      {visibleSongs.length > 0 ? (
        size === "small" ? (
          <div className="flex flex-col gap-3">
            <div className="relative w-full aspect-square">
              {visibleSongs[0].coverUrl ? (
                <Image src={visibleSongs[0].coverUrl} alt={visibleSongs[0].title} fill className="rounded-xl object-cover shadow-md" />
              ) : (
                <div className="w-full h-full rounded-xl bg-surface-container-high flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant/40 text-4xl">music_note</span>
                </div>
              )}
              <span className="absolute top-2 left-2 text-xs font-bold w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center">
                1
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{visibleSongs[0].title}</p>
              <p className="text-xs truncate" style={textColor ? { color: textColor, opacity: 0.6 } : { color: "var(--color-on-surface-variant)" }}>
                {visibleSongs[0].artist}
              </p>
            </div>
          </div>
        ) : (
          <ol className="space-y-3">
            {visibleSongs.map((song, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold w-5 text-center shrink-0" style={{ color: textColor ?? "var(--profile-accent, var(--color-primary))" }}>
                  {i + 1}
                </span>
                {song.coverUrl ? (
                  <Image src={song.coverUrl} alt={song.title} width={coverSize} height={coverSize} className="rounded object-cover shrink-0" />
                ) : (
                  <div className="rounded bg-surface-container-high flex items-center justify-center shrink-0" style={{ width: coverSize, height: coverSize }}>
                    <span className="material-symbols-outlined text-on-surface-variant text-lg">music_note</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{song.title}</p>
                  <p className="text-xs truncate" style={textColor ? { color: textColor, opacity: 0.6 } : { color: "var(--color-on-surface-variant)" }}>
                    {song.artist}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )
      ) : (
        <p className="text-sm" style={textColor ? { color: textColor, opacity: 0.6 } : { color: "var(--color-on-surface-variant)" }}>
          No top songs set. Edit your profile to add some.
        </p>
      )}
    </WidgetCard>
  );
}
