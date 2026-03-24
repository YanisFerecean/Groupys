import Image from "next/image";
import type { ProfileCustomization } from "@/types/profile";
import WidgetCard from "./WidgetCard";

interface TopSongsWidgetProps {
  songs?: ProfileCustomization["topSongs"];
  containerColor?: string;
}

export default function TopSongsWidget({ songs, containerColor }: TopSongsWidgetProps) {
  return (
    <WidgetCard title="Top Songs" style={containerColor ? { backgroundColor: containerColor } : undefined}>
      {songs && songs.length > 0 ? (
        <ol className="space-y-3">
          {songs.slice(0, 3).map((song, i) => (
            <li key={i} className="flex items-center gap-3">
              <span
                className="text-xs font-bold w-5 text-center shrink-0"
                style={{ color: "var(--profile-accent, var(--color-primary))" }}
              >
                {i + 1}
              </span>
              {song.coverUrl ? (
                <Image
                  src={song.coverUrl}
                  alt={song.title}
                  width={40}
                  height={40}
                  className="rounded object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-surface-container-high flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">
                    music_note
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{song.title}</p>
                <p className="text-xs text-on-surface-variant truncate">
                  {song.artist}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-on-surface-variant">
          No top songs set. Edit your profile to add some.
        </p>
      )}
    </WidgetCard>
  );
}
