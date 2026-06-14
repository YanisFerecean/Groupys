/**
 * Native Apple Music full-song player (Listen Together engine).
 *
 * Plays catalog songs by store id through `MPMusicPlayerController` in the `apple-music-auth` native
 * module, using the device's signed-in Apple Music account — no WebView, no extra sign-in. This is
 * the singleton store + command surface (mirrors `usePreviewPlayer`'s shape) fed by the native
 * `onPlaybackStatus` event. iOS-only; the wrappers no-op elsewhere.
 */
import {
  addPlaybackStatusListener,
  isAppleMusicNativeBridgeAvailable,
  pausePlayback,
  playCatalogId,
  resumePlayback,
  seekTo,
  stopPlayback,
} from '@/lib/appleMusicAuth'

export interface AppleMusicSnapshot {
  /** Room/track id currently loaded (null when stopped). */
  activeId: string | null
  isPlaying: boolean
  positionSec: number
  durationSec: number
  /** Native playback bridge is available (iOS dev build). */
  ready: boolean
}

let snapshot: AppleMusicSnapshot = {
  activeId: null,
  isPlaying: false,
  positionSec: 0,
  durationSec: 0,
  ready: isAppleMusicNativeBridgeAvailable(),
}

const listeners = new Set<() => void>()
let nativeUnsub: (() => void) | null = null

function emit() {
  listeners.forEach(l => l())
}

function setSnapshot(partial: Partial<AppleMusicSnapshot>) {
  snapshot = { ...snapshot, ...partial }
  emit()
}

// Attach the single native listener lazily on first subscribe. The store's `activeId` is the room
// id (set on play), independent of the native `storeId` — so we ignore stray events while idle.
function ensureNativeListener() {
  if (nativeUnsub) return
  nativeUnsub = addPlaybackStatusListener((e) => {
    if (snapshot.activeId == null) return
    if (e.ended) {
      setSnapshot({ activeId: null, isPlaying: false, positionSec: 0 })
      return
    }
    setSnapshot({
      isPlaying: e.isPlaying,
      positionSec: e.positionSec,
      durationSec: e.durationSec > 0 ? e.durationSec : snapshot.durationSec,
    })
  })
}

export function subscribeAppleMusic(listener: () => void) {
  listeners.add(listener)
  ensureNativeListener()
  return () => {
    listeners.delete(listener)
  }
}

export function getAppleMusicSnapshot() {
  return snapshot
}

export function playFull(activeId: string, storeId: string) {
  setSnapshot({ activeId, isPlaying: true, positionSec: 0 })
  playCatalogId(storeId)
}

export function pauseFull() {
  setSnapshot({ isPlaying: false })
  pausePlayback()
}

export function resumeFull() {
  setSnapshot({ isPlaying: true })
  resumePlayback()
}

export function seekFull(seconds: number) {
  seekTo(Math.max(0, seconds))
}

export function stopFull() {
  setSnapshot({ activeId: null, isPlaying: false, positionSec: 0 })
  stopPlayback()
}
