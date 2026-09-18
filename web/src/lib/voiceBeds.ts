import type { VoiceBedPayload } from "@/types/chat";

export interface VoiceBedOption extends VoiceBedPayload {
  description: string;
  /** Public asset path of the bundled, royalty-free loop (same files the mobile app ships). */
  src: string;
}

/** Bundled synthesized beds — ids/titles must match the backend allowlist (`ChatService.VOICE_BEDS`). */
export const VOICE_BEDS: VoiceBedOption[] = [
  { id: "pulse", title: "Pulse", kind: "BUNDLED", description: "Minimal low-end pulse", src: "/audio/pulse-bed.wav" },
  { id: "neon", title: "Neon", kind: "BUNDLED", description: "Bright rhythmic shimmer", src: "/audio/neon-bed.wav" },
  { id: "drift", title: "Drift", kind: "BUNDLED", description: "Slow ambient movement", src: "/audio/drift-bed.wav" },
];

/** Beds are mixed quietly under the voice so speech stays intelligible (matches mobile). */
export const VOICE_BED_VOLUME = 0.18;
/** The bundled loops are 30s long; playback position is wrapped into that window. */
export const VOICE_BED_LOOP_SEC = 30;

export function getVoiceBedSrc(id: string | undefined | null): string | null {
  return VOICE_BEDS.find((bed) => bed.id === id)?.src ?? null;
}

/** Strips the UI-only fields so only the wire shape is sent in the VOICE payload. */
export function toVoiceBedPayload(bed: VoiceBedOption): VoiceBedPayload {
  return { id: bed.id, title: bed.title, kind: bed.kind };
}
