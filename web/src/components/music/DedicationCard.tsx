import { DedicationPayload } from "@/types/chat";
import { fromTrackRef } from "@/lib/trackRef";
import { TrackCard } from "./TrackCard";

/** A dedicated song: a track card labelled "Dedication" with an optional note. */
export function DedicationCard({ payload }: { payload: DedicationPayload }) {
  const { type: _type, dedication: _dedication, note, ...ref } = payload;
  void _type;
  void _dedication;
  return (
    <div className="w-[290px] max-w-full">
      <TrackCard track={fromTrackRef(ref)} label="Dedication 💝" />
      {note && <p className="mt-1.5 px-1 text-[13px] italic text-on-surface">“{note}”</p>}
    </div>
  );
}
