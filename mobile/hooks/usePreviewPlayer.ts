import { useSyncExternalStore } from 'react'
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio'

import { logError } from '@/lib/logging'

/**
 * Global 30s preview player (chat × music plan, ticket 0.3).
 *
 * A single module-level player ensures only one preview plays at a time across the entire
 * chat list. 30s preview URLs are free/public — no Apple Music subscription required.
 */
const PREVIEW_LIMIT_SEC = 30

export interface PreviewSnapshot {
  /** id of the track whose preview is loaded (null when stopped). */
  activeId: string | null
  isPlaying: boolean
  positionSec: number
  durationSec: number
}

let player: AudioPlayer | null = null
let statusSub: { remove: () => void } | null = null
let audioModeConfigured = false

let snapshot: PreviewSnapshot = {
  activeId: null,
  isPlaying: false,
  positionSec: 0,
  durationSec: PREVIEW_LIMIT_SEC,
}

const listeners = new Set<() => void>()

function emit() {
  listeners.forEach(listener => listener())
}

function setSnapshot(partial: Partial<PreviewSnapshot>) {
  snapshot = { ...snapshot, ...partial }
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return snapshot
}

function teardownPlayer() {
  statusSub?.remove()
  statusSub = null
  if (player) {
    try {
      player.remove()
    } catch {
      // already released
    }
    player = null
  }
}

/** Stop and release the current preview entirely. */
export function stopPreview() {
  teardownPlayer()
  setSnapshot({ activeId: null, isPlaying: false, positionSec: 0 })
}

export function pausePreview() {
  if (player) {
    try {
      player.pause()
    } catch {
      // ignore
    }
    setSnapshot({ isPlaying: false })
  }
}

/** Play (or resume) the 30s preview for the given track id + url. */
export async function playPreview(id: string, url: string) {
  // Resume the same track without recreating the player.
  if (snapshot.activeId === id && player) {
    player.play()
    setSnapshot({ isPlaying: true })
    return
  }

  // Switching tracks — release the previous preview first (single global player).
  teardownPlayer()

  if (!audioModeConfigured) {
    try {
      await setAudioModeAsync({ playsInSilentMode: true })
      audioModeConfigured = true
    } catch {
      // non-fatal; playback may still work
    }
  }

  try {
    const next = createAudioPlayer({ uri: url }, { updateInterval: 250 })
    player = next
    setSnapshot({ activeId: id, isPlaying: true, positionSec: 0, durationSec: PREVIEW_LIMIT_SEC })

    statusSub = next.addListener('playbackStatusUpdate', status => {
      if (player !== next) return
      const pos = status.currentTime ?? 0

      // Auto-stop at the 30s cap or natural end.
      if (pos >= PREVIEW_LIMIT_SEC || status.didJustFinish) {
        stopPreview()
        return
      }

      const dur = status.duration && status.duration > 0
        ? Math.min(status.duration, PREVIEW_LIMIT_SEC)
        : PREVIEW_LIMIT_SEC
      setSnapshot({ positionSec: pos, durationSec: dur, isPlaying: status.playing })
    })

    next.play()
  } catch (error) {
    logError('[preview] failed to play preview', error)
    stopPreview()
  }
}

export interface PreviewPlayer extends PreviewSnapshot {
  isActive: (id: string) => boolean
  toggle: (id: string, url: string) => void
  play: (id: string, url: string) => void
  pause: () => void
  stop: () => void
}

/**
 * Subscribe to the global preview player. All callers share one player, so starting a preview
 * in one card stops any other.
 */
export function usePreviewPlayer(): PreviewPlayer {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const isActive = (id: string) => state.activeId === id
  const toggle = (id: string, url: string) => {
    if (state.activeId === id && state.isPlaying) {
      pausePreview()
    } else {
      void playPreview(id, url)
    }
  }

  return {
    ...state,
    isActive,
    toggle,
    play: (id: string, url: string) => void playPreview(id, url),
    pause: pausePreview,
    stop: stopPreview,
  }
}
