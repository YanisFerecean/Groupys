import Image from "next/image";
import type { ProfileCustomization } from "@/types/profile";
import WidgetCard from "./WidgetCard";

interface TopAlbumsWidgetProps {
  albums?: ProfileCustomization["topAlbums"];
  containerColor?: string;
}

export default function TopAlbumsWidget({ albums, containerColor }: TopAlbumsWidgetProps) {
  return (
    <WidgetCard title="Top Albums" className="md:col-span-2" style={containerColor ? { backgroundColor: containerColor } : undefined}>
      {albums && albums.length > 0 ? (
        <div className="grid grid-cols-3 gap-4">
          {albums.slice(0, 3).map((album, i) => (
            <div key={i} className="group">
              {album.coverUrl ? (
                <div className="relative aspect-square rounded-xl overflow-hidden shadow-md mb-3">
                  <Image
                    alt={album.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    src={album.coverUrl}
                  />
                </div>
              ) : (
                <div className="aspect-square rounded-xl bg-surface-container-high flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-on-surface-variant text-3xl">
                    album
                  </span>
                </div>
              )}
              <p className="font-bold text-sm truncate">{album.title}</p>
              <p className="text-xs text-on-surface-variant truncate">
                {album.artist}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant">
          No top albums set. Edit your profile to add some.
        </p>
      )}
    </WidgetCard>
  );
}
