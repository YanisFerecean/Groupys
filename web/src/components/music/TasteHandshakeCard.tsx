import { Sparkles } from "lucide-react";
import { TasteHandshakePayload } from "@/types/chat";

/** Auto-posted icebreaker on a new match: shared artists/genres and an overlap score. */
export function TasteHandshakeCard({ payload }: { payload: TasteHandshakePayload }) {
  const pct = Math.round((payload.overlapScore ?? 0) * 100);
  return (
    <div className="w-[290px] max-w-full rounded-2xl border border-surface-container-highest bg-gradient-to-br from-primary/10 to-tertiary/10 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <p className="text-[13px] font-semibold text-on-surface">Music taste match · {pct}%</p>
      </div>
      {payload.sharedArtists?.length > 0 && (
        <div className="mb-1.5">
          <p className="text-[10px] uppercase tracking-wide text-on-surface-variant">Shared artists</p>
          <p className="text-[13px] text-on-surface">{payload.sharedArtists.join(", ")}</p>
        </div>
      )}
      {payload.sharedGenres?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-on-surface-variant">Shared genres</p>
          <p className="text-[13px] text-on-surface">{payload.sharedGenres.join(", ")}</p>
        </div>
      )}
    </div>
  );
}
