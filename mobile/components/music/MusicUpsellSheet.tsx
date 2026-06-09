import { BlurView } from 'expo-blur'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Linking, Modal, Text, TouchableOpacity, View } from 'react-native'

import { Colors } from '@/constants/colors'

export type MusicUpsellMode = 'connect' | 'subscribe'

interface MusicUpsellSheetProps {
  visible: boolean
  /** `connect`: not linked yet. `subscribe`: linked but no active subscription. */
  mode: MusicUpsellMode
  /** Optional label of the action that triggered the sheet, shown for context. */
  action?: string
  onClose: () => void
  /** Invoked for the Connect CTA when in `connect` mode (e.g. open the profile connect flow). */
  onConnect?: () => void
}

const APPLE_MUSIC_SUBSCRIBE_URL = 'https://music.apple.com/subscribe'

/**
 * Bottom sheet shown when a music action needs an Apple Music subscription (ticket 0.2).
 * CTA is Connect (when not linked) or open Apple Music subscription (when linked, no sub).
 */
export function MusicUpsellSheet({ visible, mode, action, onClose, onConnect }: MusicUpsellSheetProps) {
  const handlePrimary = () => {
    if (mode === 'connect' && onConnect) {
      onClose()
      onConnect()
      return
    }
    void Linking.openURL(APPLE_MUSIC_SUBSCRIBE_URL).catch(() => {})
    onClose()
  }

  const title = mode === 'connect' ? 'Connect Apple Music' : 'Needs an Apple Music subscription'
  const body = mode === 'connect'
    ? 'Link your Apple Music account to share what you’re listening to and play full tracks.'
    : 'This needs an active Apple Music subscription. You can still preview 30 seconds for free.'
  const cta = mode === 'connect' ? 'Connect' : 'Get Apple Music'

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <BlurView
          tint="dark"
          intensity={40}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View className="rounded-t-3xl px-5 pt-4 pb-8" style={{ backgroundColor: Colors.surface }}>
          <View
            className="self-center mb-4 rounded-full"
            style={{ width: 36, height: 4, backgroundColor: Colors.outlineVariant }}
          />

          <View className="items-center mb-3">
            <MaterialCommunityIcons name="apple" size={40} color="#FA243C" />
          </View>

          <Text className="text-lg font-bold text-on-surface text-center mb-2">{title}</Text>
          {action ? (
            <Text className="text-xs text-on-surface-variant text-center mb-1">{action}</Text>
          ) : null}
          <Text className="text-sm text-on-surface-variant text-center mb-6 px-2">{body}</Text>

          <TouchableOpacity
            onPress={handlePrimary}
            className="bg-primary rounded-full py-3.5 items-center mb-2"
          >
            <Text className="text-base font-bold text-on-primary">{cta}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} className="py-3 items-center flex-row justify-center gap-1">
            <Ionicons name="close" size={16} color={Colors.onSurfaceVariant} />
            <Text className="text-sm font-semibold text-on-surface-variant">Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
