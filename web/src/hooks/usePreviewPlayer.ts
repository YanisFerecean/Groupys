"use client";

import { useSyncExternalStore } from "react";
import {
  PreviewState,
  getPreviewSnapshot,
  playPreview,
  stopPreview,
  subscribePreview,
} from "@/lib/previewPlayer";

const SERVER_SNAPSHOT: PreviewState = { trackId: null, playing: false, positionSec: 0, durationSec: 0 };

/** Subscribes to the global music-preview player and exposes play/stop controls. */
export function usePreviewPlayer() {
  const state = useSyncExternalStore(subscribePreview, getPreviewSnapshot, () => SERVER_SNAPSHOT);
  return {
    ...state,
    play: playPreview,
    stop: stopPreview,
    isPlaying: (trackId: string) => state.trackId === trackId && state.playing,
  };
}
