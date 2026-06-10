import { LyricPayload } from "@/types/chat";
import { fromTrackRef } from "@/lib/trackRef";
import { MusicCardArtwork } from "./MusicCardArtwork";
import { PreviewButton } from "./PreviewButton";

/** Quoted lyric lines with the source track underneath. */
export function LyricCard({ payload }: { payload: LyricPayload }) {
  const track = fromTrackRef(payload.track);
  return (
    <div className="w-[290px] max-w-full rounded-2xl bg-surface-container-high border border-surface-container-highest p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-primary mb-1.5">Lyrics</p>
      <div className="flex flex-col gap-0.5 mb-3">
        {payload.lines.map((line, i) => (
          <p key={i} className="text-[14px] font-medium text-on-surface leading-snug">
            “{line}”
          </p>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-surface-container">
        <MusicCardArtwork url={track.artworkUrl} alt={track.title} size={36}>
          {track.previewUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <PreviewButton
                trackId={track.id}
                previewUrl={track.previewUrl}
                className="h-5 w-5 rounded-full flex items-center justify-center bg-white/90 text-black"
                iconClassName="w-3 h-3"
              />
            </div>
          )}
        </MusicCardArtwork>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-on-surface truncate">{track.title}</p>
          <p className="text-[11px] text-on-surface-variant truncate">{track.artist}</p>
        </div>
      </div>
    </div>
  );
}
