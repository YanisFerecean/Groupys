/**
 * Shared types for the reusable Snapchat-style camera (`components/camera/*`).
 *
 * The camera is UI-agnostic: it returns a `CapturedMedia` via `onMediaCaptured` and never
 * touches navigation — the parent decides what to do with the result. Music attached in the
 * preview/editor stage rides along as `CapturedMedia.music` (see `MediaMusicAttachment`).
 */
import type { MediaMusicAttachment } from '@/models/ChatPayloads'

export type CaptureType = 'photo' | 'video'

export type CameraFacing = 'front' | 'back'

/** What the camera is allowed to produce. `both` shows tap-photo / hold-video. */
export type CameraMode = 'photo' | 'video' | 'both'

/** The result handed back to the parent after the user confirms a capture. */
export interface CapturedMedia {
  uri: string
  type: CaptureType
  width?: number
  height?: number
  /** Video length in ms (when known). */
  durationMs?: number
  mime?: string
  /** Optional music overlay attached in the editor. */
  music?: MediaMusicAttachment
}

export interface AppCameraProps {
  /** Mounts the full-screen camera modal. */
  visible: boolean
  /** Fired once the user confirms a capture (with any attached music). */
  onMediaCaptured: (media: CapturedMedia) => void
  /** Fired when the user closes the camera without confirming. */
  onCancel: () => void
  /** Capture modes offered. Defaults to `both`. */
  mode?: CameraMode
  /** Allow video recording (press-and-hold). Defaults to `true`. */
  allowVideo?: boolean
  /** Allow photo capture (tap). Defaults to `true`. */
  allowPhoto?: boolean
  /** Offer a "Save to device" action in the preview. Requires media-library permission. */
  saveToLibrary?: boolean
  /** Which camera to open first. Defaults to `back`. */
  initialCameraType?: CameraFacing
  /** Enable the music-attach flow in the preview/editor (Apple Music subscribers). */
  enableMusic?: boolean
}

export type { MediaMusicAttachment }
