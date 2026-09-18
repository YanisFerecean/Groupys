import { TrackPayload, TrackRef } from "@/types/chat";

/** Drops the `type` discriminant so a track can be embedded inside a richer payload. */
export function toTrackRef(track: TrackPayload): TrackRef {
  const { type: _type, ...rest } = track;
  void _type;
  return rest;
}

/** Re-adds the `TRACK` discriminant so an embedded track ref renders as a TrackCard. */
export function fromTrackRef(ref: TrackRef): TrackPayload {
  return { type: "TRACK", ...ref };
}

/** Formats milliseconds as m:ss. */
export function formatMs(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Parses a m:ss or seconds string into milliseconds (null if unparseable). */
export function parsePositionToMs(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.includes(":")) {
    const [m, s] = trimmed.split(":");
    const mins = Number(m);
    const secs = Number(s);
    if (!Number.isFinite(mins) || !Number.isFinite(secs)) return null;
    return (mins * 60 + secs) * 1000;
  }
  const secs = Number(trimmed);
  return Number.isFinite(secs) ? secs * 1000 : null;
}
