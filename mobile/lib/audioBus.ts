/**
 * Lightweight registry of audio "stoppers" so a screen can halt every player at once — e.g. when
 * leaving the chat. The global preview player ([usePreviewPlayer]) is a singleton stopped directly
 * via `stopPreview`; per-component players (voice notes) register a pause callback here.
 */
const stoppers = new Set<() => void>()

/** Register a stop/pause callback; returns an unregister function for effect cleanup. */
export function registerAudioStopper(stop: () => void): () => void {
  stoppers.add(stop)
  return () => {
    stoppers.delete(stop)
  }
}

/** Stop every registered player. Safe to call repeatedly. */
export function stopAllRegisteredAudio() {
  stoppers.forEach((stop) => {
    try {
      stop()
    } catch {
      // a released player can throw — ignore.
    }
  })
}
