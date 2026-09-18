import { TimestampPayload } from "@/types/chat";
import { fromTrackRef, formatMs } from "@/lib/trackRef";
import { TrackCard } from "./TrackCard";

/** "Listen from m:ss" — a track card cueing a specific moment. */
export function TimestampCard({ payload }: { payload: TimestampPayload }) {
  return <TrackCard track={fromTrackRef(payload.track)} label={`Listen from ${formatMs(payload.positionMs)} ⏱`} />;
}
