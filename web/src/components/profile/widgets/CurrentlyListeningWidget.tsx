import type { ProfileCustomization } from "@/types/profile";
import WidgetCard from "./WidgetCard";

interface CurrentlyListeningWidgetProps {
  track?: ProfileCustomization["currentlyListening"];
}

export default function CurrentlyListeningWidget({
  track,
}: CurrentlyListeningWidgetProps) {
  return (
    <WidgetCard title="Currently Listening">
      {track?.title ? (
        <div className="flex items-center gap-4">
          {track.coverUrl && (
            <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden shadow">
              <img
                alt={track.title}
                className="w-full h-full object-cover"
                src={track.coverUrl}
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">{track.title}</p>
            <p className="text-xs text-on-surface-variant truncate">
              {track.artist}
            </p>
          </div>
          {/* Animated equalizer bars */}
          <div className="flex items-end gap-0.5 h-5">
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="w-1 rounded-full"
                style={{
                  backgroundColor: "var(--profile-accent, var(--color-primary))",
                  animation: `equalize 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
                  height: `${8 + (i % 3) * 6}px`,
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant">
          Nothing playing right now.
        </p>
      )}
    </WidgetCard>
  );
}
