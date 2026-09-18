import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio'
import { useEffect, useRef, useState } from 'react'
import { Alert, Modal, Text, TouchableOpacity, View } from 'react-native'

import { Colors } from '@/constants/colors'
import { getVoiceBedSource } from '@/lib/voiceBeds'
import type { VoiceBedPayload } from '@/models/ChatPayloads'

interface VoiceRecorderModalProps {
  visible: boolean
  bed?: VoiceBedPayload | null
  onClose: () => void
  onSend: (uri: string, durationMs: number, peaks: number[], bed?: VoiceBedPayload) => void | Promise<void>
}

const MAX_DURATION_MS = 60000
const MAX_PEAKS = 64

function durationLabel(durationMs: number): string {
  const seconds = Math.ceil(durationMs / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function normalizePeak(metering: number | undefined): number {
  if (metering === undefined || !Number.isFinite(metering)) return 0.2
  return Math.max(0.08, Math.min(1, (metering + 60) / 60))
}

function compactPeaks(peaks: number[]): number[] {
  const source = peaks.length > 0 ? peaks : Array.from({ length: 24 }, () => 0.2)
  if (source.length <= MAX_PEAKS) return source.map(peak => Number(peak.toFixed(3)))
  const bucketSize = source.length / MAX_PEAKS
  return Array.from({ length: MAX_PEAKS }, (_, index) => {
    const start = Math.floor(index * bucketSize)
    const end = Math.max(start + 1, Math.floor((index + 1) * bucketSize))
    return Number(Math.max(...source.slice(start, end)).toFixed(3))
  })
}

/** Records a capped voice note and captures metering samples for its waveform (ticket 3.8). */
export function VoiceRecorderModal({ visible, bed, onClose, onSend }: VoiceRecorderModalProps) {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true })
  const recorderState = useAudioRecorderState(recorder, 100)
  const bedPlayer = useAudioPlayer(getVoiceBedSource(bed?.id))
  const [recordedUri, setRecordedUri] = useState<string | null>(null)
  const [durationMs, setDurationMs] = useState(0)
  const [peaks, setPeaks] = useState<number[]>([])
  const lastPeakAtRef = useRef(0)
  const wasRecordingRef = useRef(false)

  useEffect(() => {
    if (!bed) return
    bedPlayer.loop = true
    bedPlayer.volume = 0.18
  }, [bed, bedPlayer])

  useEffect(() => {
    if (!visible) {
      setRecordedUri(null)
      setDurationMs(0)
      setPeaks([])
      lastPeakAtRef.current = 0
      wasRecordingRef.current = false
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return
    if (recorderState.isRecording) {
      wasRecordingRef.current = true
      setDurationMs(Math.min(recorderState.durationMillis, MAX_DURATION_MS))
      if (recorderState.durationMillis - lastPeakAtRef.current >= 400) {
        lastPeakAtRef.current = recorderState.durationMillis
        setPeaks(current => [...current, normalizePeak(recorderState.metering)])
      }
      return
    }

    if (wasRecordingRef.current && recorderState.url) {
      wasRecordingRef.current = false
      setRecordedUri(recorderState.url)
      if (bed) bedPlayer.pause()
      void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
    }
  }, [bed, bedPlayer, recorderState.durationMillis, recorderState.isRecording, recorderState.metering, recorderState.url, visible])

  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Microphone permission required', 'Enable microphone access to record a voice note.')
        return
      }
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      setRecordedUri(null)
      setDurationMs(0)
      setPeaks([])
      lastPeakAtRef.current = 0
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
      await recorder.prepareToRecordAsync()
      recorder.record({ forDuration: MAX_DURATION_MS / 1000 })
      if (bed) {
        await bedPlayer.seekTo(0)
        bedPlayer.play()
      }
    } catch {
      Alert.alert('Could not record', 'Check microphone access and try again.')
    }
  }

  const stopRecording = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const finalDuration = Math.min(recorderState.durationMillis, MAX_DURATION_MS)
    try {
      await recorder.stop()
      if (bed) bedPlayer.pause()
      setDurationMs(finalDuration)
      setRecordedUri(recorder.uri)
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
    } catch {
      Alert.alert('Could not finish recording', 'Try recording the voice note again.')
    }
  }

  const close = () => {
    if (recorderState.isRecording) {
      void recorder.stop()
    }
    if (bed) bedPlayer.pause()
    void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
    onClose()
  }

  const waveform = compactPeaks(peaks)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View className="flex-1 justify-end">
        <BlurView tint="dark" intensity={40} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />
        <TouchableOpacity activeOpacity={1} onPress={close} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />
        <View className="rounded-t-3xl bg-surface px-5 pb-8 pt-4">
          <View className="mb-4 h-1 w-9 self-center rounded-full" style={{ backgroundColor: Colors.outlineVariant }} />
          <Text className="text-base font-bold text-on-surface">
            {bed ? `Voice over ${bed.title}` : 'Voice note'}
          </Text>
          <Text className="mt-1 text-[13px] text-on-surface-variant">
            {bed ? 'The bundled beat plays softly while you record.' : 'Record up to 1 minute.'}
          </Text>

          <View className="mt-6 h-20 flex-row items-center justify-center gap-1 rounded-2xl bg-surface-container px-3">
            {waveform.slice(-48).map((peak, index) => (
              <View
                key={`${index}-${peak}`}
                className="w-1 rounded-full bg-primary"
                style={{ height: Math.max(5, peak * 54) }}
              />
            ))}
          </View>
          <Text className="mt-3 text-center text-sm font-bold text-on-surface">
            {durationLabel(durationMs)}
          </Text>

          <View className="mt-5 flex-row justify-center gap-3">
            <TouchableOpacity
              onPress={recorderState.isRecording ? stopRecording : startRecording}
              className="h-16 w-16 items-center justify-center rounded-full bg-primary"
            >
              <Ionicons name={recorderState.isRecording ? 'stop' : 'mic'} size={28} color={Colors.onPrimary} />
            </TouchableOpacity>
            {recordedUri && durationMs > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  void onSend(recordedUri, Math.max(1, durationMs), waveform, bed ?? undefined)
                  onClose()
                }}
                className="h-16 w-16 items-center justify-center rounded-full bg-tertiary"
              >
                <Ionicons name="send" size={25} color={Colors.onPrimary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  )
}
