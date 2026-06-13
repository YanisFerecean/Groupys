import { BlurView } from 'expo-blur'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { Ionicons } from '@expo/vector-icons'
import { useRef } from 'react'
import { Alert, Modal, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native'

import { Colors } from '@/constants/colors'

const GLASS = isLiquidGlassAvailable()

type IconName = keyof typeof Ionicons.glyphMap

interface MusicAttachSheetProps {
  visible: boolean
  onClose: () => void
  onPickImage?: () => void
  onShareSong?: () => void
  onPickAlbum?: () => void
  onPickPlaylist?: () => void
  onDedicate?: () => void
  onDropTimestamp?: () => void
  onBlindListen?: () => void
  onListenTogether?: () => void
  /** Disable the Listen Together row (e.g. a participant has no Apple Music subscription). */
  listenTogetherDisabled?: boolean
  /** Hint shown under the Listen Together row when disabled. */
  listenTogetherHint?: string
}

/** Bottom-sheet menu for sharing richer music cards from the composer (tickets 2.2/2.3/4.x). */
export function MusicAttachSheet({
  visible,
  onClose,
  onPickImage,
  onShareSong,
  onPickAlbum,
  onPickPlaylist,
  onDedicate,
  onDropTimestamp,
  onBlindListen,
  onListenTogether,
  listenTogetherDisabled = false,
  listenTogetherHint,
}: MusicAttachSheetProps) {
  const rows: { icon: IconName; label: string; onPress?: () => void; disabled?: boolean; sublabel?: string }[] = [
    { icon: 'image' as IconName, label: 'Share a photo', onPress: onPickImage },
    { icon: 'musical-note' as IconName, label: 'Share a song', onPress: onShareSong },
    { icon: 'albums' as IconName, label: 'Share an album', onPress: onPickAlbum },
    { icon: 'musical-notes' as IconName, label: 'View added songs', onPress: onPickPlaylist },
    { icon: 'heart' as IconName, label: 'Dedicate a song', onPress: onDedicate },
    { icon: 'time' as IconName, label: 'Drop a timestamp', onPress: onDropTimestamp },
    { icon: 'eye-off' as IconName, label: 'Blind listen', onPress: onBlindListen },
    {
      icon: 'people' as IconName,
      label: 'Listen together',
      onPress: onListenTogether,
      disabled: listenTogetherDisabled,
      sublabel: listenTogetherDisabled ? listenTogetherHint : undefined,
    },
  ].filter(row => !!row.onPress)

  // Actions that present a native view controller (image picker, etc.) cannot be launched while
  // this modal is still animating out — iOS silently drops the presentation. Defer to onDismiss so
  // the action runs only after the sheet is fully gone. (Android has no onDismiss and isn't affected,
  // so it fires the action immediately.)
  const pendingAction = useRef<(() => void) | null>(null)

  const handleRowPress = (row: { onPress?: () => void; disabled?: boolean; sublabel?: string; label: string }) => {
    if (row.disabled) {
      Alert.alert(row.label, row.sublabel ?? 'This is not available right now.')
      return
    }
    if (Platform.OS === 'ios') {
      pendingAction.current = row.onPress ?? null
      onClose()
      return
    }
    onClose()
    row.onPress?.()
  }

  const handleDismiss = () => {
    const action = pendingAction.current
    pendingAction.current = null
    action?.()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onDismiss={handleDismiss}>
      <View className="flex-1 justify-end">
        <BlurView tint="dark" intensity={40} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {GLASS ? (
          <GlassView
            isInteractive
            glassEffectStyle="regular"
            style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
          >
            <View className="self-center mb-4 rounded-full" style={{ width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.4)' }} />
            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
              {rows.map(row => (
                <TouchableOpacity
                  key={row.label}
                  onPress={() => handleRowPress(row)}
                  style={{ opacity: row.disabled ? 0.45 : 1 }}
                  className="flex-row items-center gap-3 py-3.5"
                >
                  <GlassView
                    tintColor={`${Colors.primary}33`}
                    style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name={row.icon} size={20} color={Colors.primary} />
                  </GlassView>
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-on-surface">{row.label}</Text>
                    {row.sublabel ? (
                      <Text className="text-[12px] text-on-surface-variant" numberOfLines={2}>{row.sublabel}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </GlassView>
        ) : (
          <View className="rounded-t-3xl px-5 pt-4 pb-8" style={{ backgroundColor: Colors.surface }}>
            <View className="self-center mb-4 rounded-full" style={{ width: 36, height: 4, backgroundColor: Colors.outlineVariant }} />
            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
              {rows.map(row => (
                <TouchableOpacity
                  key={row.label}
                  onPress={() => handleRowPress(row)}
                  style={{ opacity: row.disabled ? 0.45 : 1 }}
                  className="flex-row items-center gap-3 py-3.5"
                >
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
                    <Ionicons name={row.icon} size={20} color={Colors.primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-on-surface">{row.label}</Text>
                    {row.sublabel ? (
                      <Text className="text-[12px] text-on-surface-variant" numberOfLines={2}>{row.sublabel}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  )
}
