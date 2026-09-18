import { useCameraPermissions as useExpoCameraPermissions, useMicrophonePermissions } from 'expo-camera'
import * as MediaLibrary from 'expo-media-library'
import { useCallback, useMemo } from 'react'
import { Linking } from 'react-native'

export type CameraPermissionStatus = 'loading' | 'granted' | 'denied'

interface UseCameraPermissionsOptions {
  /** Microphone is required only when video recording is enabled. */
  needsMicrophone?: boolean
  /** Whether the save-to-device action is offered (media-library write). */
  needsMediaLibrary?: boolean
}

export interface CameraPermissions {
  status: CameraPermissionStatus
  /** Request camera (+ microphone) up front. */
  request: () => Promise<void>
  /** Lazily ensure media-library write access before saving. Returns granted. */
  ensureMediaPermission: () => Promise<boolean>
  openSettings: () => void
}

/**
 * Aggregates the permissions the reusable camera needs: camera (always), microphone (when
 * recording video), and media library (only when the caller offers save-to-device — requested
 * lazily so it never blocks the camera from opening).
 */
export function useCameraPermissions({
  needsMicrophone = true,
  needsMediaLibrary = false,
}: UseCameraPermissionsOptions = {}): CameraPermissions {
  const [camera, requestCamera] = useExpoCameraPermissions()
  const [microphone, requestMicrophone] = useMicrophonePermissions()
  const [, requestMedia] = MediaLibrary.usePermissions({ writeOnly: true })

  const status = useMemo<CameraPermissionStatus>(() => {
    if (!camera || (needsMicrophone && !microphone)) return 'loading'
    if (!camera.granted) return 'denied'
    if (needsMicrophone && !microphone?.granted) return 'denied'
    return 'granted'
  }, [camera, microphone, needsMicrophone])

  const request = useCallback(async () => {
    if (!camera?.granted) await requestCamera()
    if (needsMicrophone && !microphone?.granted) await requestMicrophone()
  }, [camera?.granted, microphone?.granted, needsMicrophone, requestCamera, requestMicrophone])

  const ensureMediaPermission = useCallback(async () => {
    if (!needsMediaLibrary) return false
    const response = await requestMedia()
    return response.granted
  }, [needsMediaLibrary, requestMedia])

  const openSettings = useCallback(() => {
    void Linking.openSettings()
  }, [])

  return { status, request, ensureMediaPermission, openSettings }
}
