import { useSyncExternalStore } from 'react'

import {
  getAppleMusicSnapshot,
  pauseFull,
  playFull,
  resumeFull,
  seekFull,
  stopFull,
  subscribeAppleMusic,
} from '@/lib/appleMusicPlayer'

/**
 * Native Apple Music full-song player (see `lib/appleMusicPlayer`). Mirrors the `PreviewPlayer`
 * interface so `useListenTogether` can swap engines, except `play`/`toggle` take the Apple Music
 * **catalog store id** (not a preview URL) since playback is by catalog id.
 */
export interface AppleMusicPlayer {
  activeId: string | null
  isPlaying: boolean
  positionSec: number
  durationSec: number
  ready: boolean
  isActive: (id: string) => boolean
  play: (id: string, storeId: string) => void
  toggle: (id: string, storeId: string) => void
  pause: () => void
  resume: () => void
  stop: () => void
  seek: (seconds: number) => void
}

export function useAppleMusicPlayer(): AppleMusicPlayer {
  const state = useSyncExternalStore(subscribeAppleMusic, getAppleMusicSnapshot, getAppleMusicSnapshot)

  const isActive = (id: string) => state.activeId === id

  return {
    activeId: state.activeId,
    isPlaying: state.isPlaying,
    positionSec: state.positionSec,
    durationSec: state.durationSec,
    ready: state.ready,
    isActive,
    play: (id: string, storeId: string) => playFull(id, storeId),
    toggle: (id: string, storeId: string) => {
      if (state.activeId === id && state.isPlaying) pauseFull()
      else if (state.activeId === id) resumeFull()
      else playFull(id, storeId)
    },
    pause: pauseFull,
    resume: resumeFull,
    stop: stopFull,
    seek: seekFull,
  }
}
