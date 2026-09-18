import { audioPlayer } from "./audioPlayer";

/** Snapshot of the single global 30s music-preview player. */
export interface PreviewState {
  trackId: string | null;
  playing: boolean;
  positionSec: number;
  durationSec: number;
}

let state: PreviewState = { trackId: null, playing: false, positionSec: 0, durationSec: 0 };
const listeners = new Set<() => void>();

function set(next: Partial<PreviewState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function subscribePreview(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPreviewSnapshot(): PreviewState {
  return state;
}

const reset = () => set({ trackId: null, playing: false, positionSec: 0, durationSec: 0 });

/**
 * Plays a 30s preview, or toggles it off if the same track is already playing.
 * Only one preview/voice clip ever plays at a time (shared audioPlayer singleton).
 */
export function playPreview(trackId: string, url: string) {
  if (state.trackId === trackId && state.playing) {
    audioPlayer.stop();
    return;
  }
  const audio = audioPlayer.play(url, reset);
  set({ trackId, playing: true, positionSec: 0, durationSec: 0 });
  audio.addEventListener("loadedmetadata", () => set({ durationSec: audio.duration || 0 }));
  audio.addEventListener("timeupdate", () => set({ positionSec: audio.currentTime }));
  audio.play().catch(reset);
}

export function stopPreview() {
  audioPlayer.stop();
}
