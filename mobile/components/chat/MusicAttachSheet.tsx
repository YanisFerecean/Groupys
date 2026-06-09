import { BlurView } from 'expo-blur'
import { Ionicons } from '@expo/vector-icons'
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native'

import { Colors } from '@/constants/colors'

type IconName = keyof typeof Ionicons.glyphMap

interface MusicAttachSheetProps {
  visible: boolean
  onClose: () => void
  onPickImage?: () => void
  onVoiceNote?: () => void
  onVoiceBeat?: () => void
  onSticker?: () => void
  onPickAlbum?: () => void
  onPickPlaylist?: () => void
  onDedicate?: () => void
  onShareLyric?: () => void
  onDropTimestamp?: () => void
  onBlindListen?: () => void
  onListenTogether?: () => void
}

/** Bottom-sheet menu for sharing richer music cards from the composer (tickets 2.2/2.3/4.x). */
export function MusicAttachSheet({
  visible,
  onClose,
  onPickImage,
  onVoiceNote,
  onVoiceBeat,
  onSticker,
  onPickAlbum,
  onPickPlaylist,
  onDedicate,
  onShareLyric,
  onDropTimestamp,
  onBlindListen,
  onListenTogether,
}: MusicAttachSheetProps) {
  const rows: { icon: IconName; label: string; onPress?: () => void }[] = [
    { icon: 'image' as IconName, label: 'Share a photo', onPress: onPickImage },
    { icon: 'mic' as IconName, label: 'Record a voice note', onPress: onVoiceNote },
    { icon: 'pulse' as IconName, label: 'Voice over a beat', onPress: onVoiceBeat },
    { icon: 'happy' as IconName, label: 'Send a sticker', onPress: onSticker },
    { icon: 'albums' as IconName, label: 'Share an album', onPress: onPickAlbum },
    { icon: 'list' as IconName, label: 'Share a playlist', onPress: onPickPlaylist },
    { icon: 'heart' as IconName, label: 'Dedicate a song', onPress: onDedicate },
    { icon: 'text' as IconName, label: 'Share a lyric', onPress: onShareLyric },
    { icon: 'time' as IconName, label: 'Drop a timestamp', onPress: onDropTimestamp },
    { icon: 'eye-off' as IconName, label: 'Blind listen', onPress: onBlindListen },
    { icon: 'people' as IconName, label: 'Listen together', onPress: onListenTogether },
  ].filter(row => !!row.onPress)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <BlurView tint="dark" intensity={40} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View className="rounded-t-3xl px-5 pt-4 pb-8" style={{ backgroundColor: Colors.surface }}>
          <View className="self-center mb-4 rounded-full" style={{ width: 36, height: 4, backgroundColor: Colors.outlineVariant }} />
          <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
            {rows.map(row => (
              <TouchableOpacity
                key={row.label}
                onPress={() => {
                  onClose()
                  row.onPress?.()
                }}
                className="flex-row items-center gap-3 py-3.5"
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
                  <Ionicons name={row.icon} size={20} color={Colors.primary} />
                </View>
                <Text className="text-[15px] font-semibold text-on-surface">{row.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
