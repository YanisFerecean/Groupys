import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import * as Haptics from 'expo-haptics'
import { Modal, Text, TouchableOpacity, View } from 'react-native'

import { Colors } from '@/constants/colors'

const GLASS = isLiquidGlassAvailable()

interface ConversationOptionsSheetProps {
  visible: boolean
  muted: boolean
  onClose: () => void
  onMuteUntil: (until: string | null) => void
  onSafety: () => void
}

function muteUntil(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}

/** Conversation-level notification controls (ticket 3.6). */
export function ConversationOptionsSheet({
  visible,
  muted,
  onClose,
  onMuteUntil,
  onSafety,
}: ConversationOptionsSheetProps) {
  const action = (until: string | null) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onClose()
    onMuteUntil(until)
  }

  const sheetContent = (
    <>
      <View
        className="mb-4 h-1 w-9 self-center rounded-full"
        style={{ backgroundColor: GLASS ? 'rgba(255,255,255,0.4)' : Colors.outlineVariant }}
      />
      <Text className="mb-2 text-base font-bold text-on-surface">Conversation options</Text>
      {muted ? (
        <TouchableOpacity onPress={() => action(null)} className="flex-row items-center gap-3 py-3">
          <Ionicons name="notifications-outline" size={21} color={Colors.primary} />
          <Text className="text-[15px] font-semibold text-primary">Unmute notifications</Text>
        </TouchableOpacity>
      ) : null}
      {[
        { label: 'Mute for 1 hour', hours: 1 },
        { label: 'Mute for 8 hours', hours: 8 },
        { label: 'Mute for 1 week', hours: 24 * 7 },
      ].map(option => (
        <TouchableOpacity
          key={option.label}
          onPress={() => action(muteUntil(option.hours))}
          className="flex-row items-center gap-3 py-3"
        >
          <Ionicons name="notifications-off-outline" size={21} color={Colors.onSurface} />
          <Text className="text-[15px] font-semibold text-on-surface">{option.label}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          onClose()
          onSafety()
        }}
        className="mt-1 flex-row items-center gap-3 border-t border-surface-container-high py-3"
      >
        <Ionicons name="shield-outline" size={21} color={Colors.onSurface} />
        <Text className="text-[15px] font-semibold text-on-surface">Safety and moderation</Text>
      </TouchableOpacity>
    </>
  )

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <BlurView
          tint="dark"
          intensity={40}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        />
        {GLASS ? (
          <GlassView
            glassEffectStyle="regular"
            style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
          >
            {sheetContent}
          </GlassView>
        ) : (
          <View className="rounded-t-3xl bg-surface px-5 pb-8 pt-4">
            {sheetContent}
          </View>
        )}
      </View>
    </Modal>
  )
}
