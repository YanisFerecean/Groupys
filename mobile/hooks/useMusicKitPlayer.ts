import { useSyncExternalStore } from 'react'

import {
  getMusicKitSnapshot,
  pauseFull,
  playFull,
  resumeFull,
  seekFull,
  stopFull,
  subscribeMusicKit,
} from '@/lib/musicKit'

/**
 * Full-song player backed by the MusicKit-JS WebView (see `MusicKitProvider`). Mirrors the
 * `PreviewPlayer` interface so `useListenTogether` can swap engines, except `play`/`toggle` take the
 * Apple Music **catalog id** (not a preview URL) since MusicKit plays catalog songs by id.
 */
export interface MusicKitPlayer {
  activeId: string | null
  isPlaying: boolean
  positionSec: number
  durationSec: number
  ready: boolean
  isActive: (id: string) => boolean
  play: (id: string, catalogId: string) => void
  toggle: (id: string, catalogId: string) => void
  pause: () => void
  resume: () => void
  stop: () => void
  seek: (seconds: number) => void
}

export function useMusicKitPlayer(): MusicKitPlayer {
  const state = useSyncExternalStore(subscribeMusicKit, getMusicKitSnapshot, getMusicKitSnapshot)

  const isActive = (id: string) => state.activeId === id

  return {
    activeId: state.activeId,
    isPlaying: state.isPlaying,
    positionSec: state.positionSec,
    durationSec: state.durationSec,
    ready: state.ready,
    isActive,
    play: (id: string, catalogId: string) => playFull(id, catalogId),
    toggle: (id: string, catalogId: string) => {
      if (state.activeId === id && state.isPlaying) pauseFull()
      else if (state.activeId === id) resumeFull()
      else playFull(id, catalogId)
    },
    pause: pauseFull,
    resume: resumeFull,
    stop: stopFull,
    seek: seekFull,
  }
}
