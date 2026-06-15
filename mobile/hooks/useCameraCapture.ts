import type { CameraMode, CameraType, CameraView, FlashMode } from 'expo-camera'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { CameraFacing, CapturedMedia } from '@/types/camera'

interface UseCameraCaptureOptions {
  allowVideo?: boolean
  /** Hard cap on a single recording; auto-stops when reached. */
  maxDurationSec?: number
  initialFacing?: CameraFacing
  /** Fired once a photo is taken or a recording finishes (stop or max-duration). */
  onCaptured: (media: CapturedMedia) => void
}

/** Props spread onto the `<CameraView>` so the live preview reflects the hook's state. */
export interface CameraViewProps {
  facing: CameraType
  flash: FlashMode
  enableTorch: boolean
  mode: CameraMode
}

export interface CameraCapture {
  cameraRef: React.RefObject<CameraView | null>
  cameraProps: CameraViewProps
  facing: CameraType
  flashOn: boolean
  isRecording: boolean
  recordSeconds: number
  isBusy: boolean
  error: string | null
  clearError: () => void
  toggleFacing: () => void
  toggleFlash: () => void
  takePhoto: () => Promise<void>
  startRecording: () => Promise<void>
  stopRecording: () => void
}

/**
 * UI-free capture engine for the reusable camera. Owns the `CameraView` ref + camera state
 * (facing, flash/torch, picture/video mode), the recording timer and max-duration cap, and
 * hands finished captures back through `onCaptured`. Every native call is guarded so a failure
 * surfaces via `error` instead of crashing the screen.
 */
export function useCameraCapture({
  allowVideo = true,
  maxDurationSec = 60,
  initialFacing = 'back',
  onCaptured,
}: UseCameraCaptureOptions): CameraCapture {
  const cameraRef = useRef<CameraView | null>(null)
  const [facing, setFacing] = useState<CameraType>(initialFacing)
  const [flashOn, setFlashOn] = useState(false)
  const [mode, setMode] = useState<CameraMode>('picture')
  const [isRecording, setIsRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => () => {
    mountedRef.current = false
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const toggleFacing = useCallback(() => {
    if (isRecording) return
    setFacing(prev => (prev === 'back' ? 'front' : 'back'))
  }, [isRecording])

  const toggleFlash = useCallback(() => setFlashOn(prev => !prev), [])

  const takePhoto = useCallback(async () => {
    if (isRecording || isBusy || !cameraRef.current) return
    setIsBusy(true)
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 })
      if (!photo?.uri) throw new Error('No photo returned')
      onCaptured({
        uri: photo.uri,
        type: 'photo',
        width: photo.width,
        height: photo.height,
        mime: 'image/jpeg',
      })
    } catch {
      setError('Could not take the photo. Try again.')
    } finally {
      if (mountedRef.current) setIsBusy(false)
    }
  }, [isBusy, isRecording, onCaptured])

  const startRecording = useCallback(async () => {
    if (!allowVideo || isRecording || isBusy || !cameraRef.current) return
    setIsRecording(true)
    setRecordSeconds(0)
    setMode('video')
    // Let the CameraView apply `mode="video"` before recording starts.
    await new Promise(resolve => setTimeout(resolve, 150))
    if (!cameraRef.current || !mountedRef.current) {
      setIsRecording(false)
      setMode('picture')
      return
    }

    stopTimer()
    timerRef.current = setInterval(() => {
      setRecordSeconds(prev => {
        const next = prev + 1
        if (next >= maxDurationSec) {
          // Hit the cap — stop; recordAsync resolves below and emits the clip.
          try { cameraRef.current?.stopRecording() } catch { /* no-op */ }
        }
        return next
      })
    }, 1000)

    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: maxDurationSec })
      if (video?.uri) {
        onCaptured({ uri: video.uri, type: 'video', mime: 'video/mp4' })
      }
    } catch {
      setError('Could not record the video. Try again.')
    } finally {
      stopTimer()
      if (mountedRef.current) {
        setIsRecording(false)
        setMode('picture')
      }
    }
  }, [allowVideo, isBusy, isRecording, maxDurationSec, onCaptured, stopTimer])

  const stopRecording = useCallback(() => {
    if (!isRecording || !cameraRef.current) return
    try { cameraRef.current.stopRecording() } catch { /* no-op */ }
  }, [isRecording])

  return {
    cameraRef,
    cameraProps: {
      facing,
      flash: flashOn ? 'on' : 'off',
      enableTorch: isRecording && flashOn,
      mode,
    },
    facing,
    flashOn,
    isRecording,
    recordSeconds,
    isBusy,
    error,
    clearError,
    toggleFacing,
    toggleFlash,
    takePhoto,
    startRecording,
    stopRecording,
  }
}
