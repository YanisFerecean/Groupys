import { useCallback, useEffect, useMemo, useRef } from 'react'

import { useAppleMusicPlayer } from '@/hooks/useAppleMusicPlayer'
import { useMusicCapability } from '@/hooks/useMusicCapability'
import { usePreviewPlayer } from '@/hooks/usePreviewPlayer'
import type { MediaMusicAttachment } from '@/models/ChatPayloads'

export type SnippetMode = 'full' | 'preview' | 'none'

export interface SnippetPlayback {
  /** Whether anything can be played for this attachment. */
  canPlay: boolean
  /** Which engine drives playback (full song window, 30s preview, or nothing). */
  mode: SnippetMode
  isPlaying: boolean
  /** 0..1 progress through the snippet window. */
  progress: number
  toggle: () => void
}

/**
 * Plays the music attached to a received IMAGE/VIDEO.
 *
 * Apple Music subscribers (`canPlayFull` + native bridge ready + `appleMusicId`) hear the exact
 * chosen 30s window of the full song: play → seek to `snippetStartMs` → auto-stop at the window
 * end. Everyone else falls back to the free 30s `previewUrl`. With neither, `canPlay` is false and
 * the caller can offer an "Open in Apple Music" link.
 */
export function useSnippetPlayback(music: MediaMusicAttachment | null | undefined): SnippetPlayback {
  const capability = useMusicCapability()
  const apple = useAppleMusicPlayer()
  const preview = usePreviewPlayer()

  const track = music?.track
  const trackId = track?.id ?? ''
  const startSec = (music?.snippetStartMs ?? 0) / 1000
  const durationSec = Math.max(1, (music?.snippetDurationMs ?? 30000) / 1000)

  const mode = useMemo<SnippetMode>(() => {
    if (!track) return 'none'
    if (capability.canPlayFull && apple.ready && track.appleMusicId) return 'full'
    if (track.previewUrl) return 'preview'
    return 'none'
  }, [apple.ready, capability.canPlayFull, track])

  // Re-seek to the window start the next time playback starts after a stop/seek.
  const armedRef = useRef(false)

  // Enforce the 30s window end for full-song playback.
  useEffect(() => {
    if (mode !== 'full' || !apple.isActive(trackId) || !apple.isPlaying) return
    if (apple.positionSec >= startSec + durationSec) {
      apple.pause()
    }
  }, [apple, durationSec, mode, startSec, trackId])

  const isFullActive = mode === 'full' && apple.isActive(trackId)
  const isPreviewActive = mode === 'preview' && preview.isActive(trackId)
  const isPlaying = (isFullActive && apple.isPlaying) || (isPreviewActive && preview.isPlaying)

  const progress = useMemo(() => {
    if (isFullActive) {
      return Math.max(0, Math.min(1, (apple.positionSec - startSec) / durationSec))
    }
    if (isPreviewActive && preview.durationSec > 0) {
      return Math.max(0, Math.min(1, preview.positionSec / preview.durationSec))
    }
    return 0
  }, [apple.positionSec, durationSec, isFullActive, isPreviewActive, preview.durationSec, preview.positionSec, startSec])

  const toggle = useCallback(() => {
    if (!track) return
    if (mode === 'full') {
      const storeId = track.appleMusicId!
      if (apple.isActive(trackId) && apple.isPlaying) {
        apple.pause()
        return
      }
      const pastWindow = apple.positionSec >= startSec + durationSec || apple.positionSec < startSec
      if (apple.isActive(trackId) && !pastWindow) {
        apple.resume()
        return
      }
      // Fresh start (or replay after the window ended): load, then seek into the window.
      apple.play(trackId, storeId)
      armedRef.current = true
      setTimeout(() => {
        if (armedRef.current) {
          apple.seek(startSec)
          armedRef.current = false
        }
      }, 350)
    } else if (mode === 'preview' && track.previewUrl) {
      preview.toggle(trackId, track.previewUrl)
    }
  }, [apple, durationSec, mode, preview, startSec, track, trackId])

  return {
    canPlay: mode !== 'none',
    mode,
    isPlaying,
    progress,
    toggle,
  }
}
