import type { ProfileCustomization } from "@/types/profile";
import WidgetCard from "./WidgetCard";

interface TopArtistsWidgetProps {
  artists?: ProfileCustomization["topArtists"];
  containerColor?: string;
}

export default function TopArtistsWidget({ artists, containerColor }: TopArtistsWidgetProps) {
  return (
    <WidgetCard title="Top Artists" style={containerColor ? { backgroundColor: containerColor } : undefined}>
      {artists && artists.length > 0 ? (
        <div className="space-y-3">
          {artists.slice(0, 3).map((artist, i) => (
            <div key={i} className="flex items-center gap-3">
              {artist.imageUrl ? (
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-surface-container-high">
                  <img
                    alt={artist.name}
                    className="w-full h-full object-cover"
                    src={artist.imageUrl}
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full shrink-0 bg-surface-container-high flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">
                    person
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{artist.name}</p>
                {artist.genre && (
                  <p className="text-xs text-on-surface-variant truncate">
                    {artist.genre}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant">
          No top artists set. Edit your profile to add some.
        </p>
      )}
    </WidgetCard>
  );
}
