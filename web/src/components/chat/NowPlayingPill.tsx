import { NowPlayingTrack } from "@/types/chat";

/** Header pill showing the partner's currently-playing track with an animated equalizer. */
export function NowPlayingPill({ track }: { track: NowPlayingTrack }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-tertiary/10 text-tertiary px-2.5 py-1 max-w-[240px]">
      {track.artworkUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={track.artworkUrl} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
      )}
      <div className="flex items-end gap-0.5 h-3 shrink-0">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className="w-0.5 rounded-full bg-tertiary"
            style={{
              animation: `equalize 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
              height: `${6 + (i % 2) * 4}px`,
            }}
          />
        ))}
      </div>
      <span className="text-[11px] truncate">
        {track.title}
        {track.artist ? ` — ${track.artist}` : ""}
      </span>
    </div>
  );
}
