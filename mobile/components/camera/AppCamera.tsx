import { Ionicons } from '@expo/vector-icons'
import { CameraView } from 'expo-camera'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, StatusBar, Text, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { CameraControls } from '@/components/camera/CameraControls'
import { CameraPreview } from '@/components/camera/CameraPreview'
import { Colors } from '@/constants/colors'
import { useCameraCapture } from '@/hooks/useCameraCapture'
import { useCameraPermissions } from '@/hooks/useCameraPermissions'
import type { AppCameraProps, CapturedMedia } from '@/types/camera'

/**
 * Reusable full-screen, camera-first capture surface (Snapchat-inspired, no filters). Renders in
 * a modal, handles permissions/loading/denied states, photo (tap) + press-and-hold video, a
 * preview/editor with optional music, and hands the result back via `onMediaCaptured`. Carries no
 * navigation — the parent decides what to do with the captured media.
 */
export function AppCamera({
  visible,
  onMediaCaptured,
  onCancel,
  mode = 'both',
  allowVideo = true,
  allowPhoto = true,
  saveToLibrary = false,
  initialCameraType = 'back',
  enableMusic = false,
}: AppCameraProps) {
  const videoEnabled = allowVideo && mode !== 'photo'
  const photoEnabled = allowPhoto && mode !== 'video'

  const permissions = useCameraPermissions({
    needsMicrophone: videoEnabled,
    needsMediaLibrary: saveToLibrary,
  })

  const [captured, setCaptured] = useState<CapturedMedia | null>(null)

  const handleCaptured = useCallback((media: CapturedMedia) => setCaptured(media), [])

  const capture = useCameraCapture({
    allowVideo: videoEnabled,
    initialFacing: initialCameraType,
    onCaptured: handleCaptured,
  })

  // Ask for permissions as the camera opens; reset state when it closes.
  useEffect(() => {
    if (visible) {
      void permissions.request()
    } else {
      setCaptured(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  useEffect(() => {
    if (capture.error) {
      Alert.alert('Camera error', capture.error)
      capture.clearError()
    }
  }, [capture])

  const handleConfirm = useCallback((media: CapturedMedia) => {
    onMediaCaptured(media)
    setCaptured(null)
  }, [onMediaCaptured])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCancel} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar hidden />
        {permissions.status === 'loading' ? (
          <Centered>
            <ActivityIndicator color="#fff" />
          </Centered>
        ) : permissions.status === 'denied' ? (
          <DeniedState onOpenSettings={permissions.openSettings} onCancel={onCancel} needsMic={videoEnabled} />
        ) : captured ? (
          <CameraPreview
            media={captured}
            enableMusic={enableMusic}
            saveToLibrary={saveToLibrary}
            ensureMediaPermission={permissions.ensureMediaPermission}
            onRetake={() => setCaptured(null)}
            onConfirm={handleConfirm}
          />
        ) : (
          <View style={{ flex: 1 }}>
            <CameraView ref={capture.cameraRef} style={{ flex: 1 }} {...capture.cameraProps} />
            <CameraControls
              mode={mode}
              allowPhoto={photoEnabled}
              allowVideo={videoEnabled}
              flashOn={capture.flashOn}
              isRecording={capture.isRecording}
              recordSeconds={capture.recordSeconds}
              isBusy={capture.isBusy}
              onClose={onCancel}
              onToggleFlash={capture.toggleFlash}
              onToggleFacing={capture.toggleFacing}
              onTakePhoto={capture.takePhoto}
              onStartRecording={capture.startRecording}
              onStopRecording={capture.stopRecording}
            />
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>{children}</View>
}

function DeniedState({ onOpenSettings, onCancel, needsMic }: { onOpenSettings: () => void; onCancel: () => void; needsMic: boolean }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Pressable onPress={onCancel} style={{ position: 'absolute', top: insets.top + 12, left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="close" size={22} color="#fff" />
      </Pressable>
      <Ionicons name="camera-outline" size={56} color={Colors.primary} />
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>
        Camera access needed
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
        {needsMic
          ? 'Enable camera and microphone access in Settings to take photos and record video.'
          : 'Enable camera access in Settings to take photos.'}
      </Text>
      <Pressable onPress={onOpenSettings} style={{ marginTop: 24, backgroundColor: Colors.primary, borderRadius: 24, paddingHorizontal: 28, paddingVertical: 14 }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Open Settings</Text>
      </Pressable>
    </View>
  )
}
