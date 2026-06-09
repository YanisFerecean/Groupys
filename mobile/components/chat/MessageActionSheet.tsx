import { BlurView } from 'expo-blur'
import { Ionicons } from '@expo/vector-icons'
import { Modal, Text, TouchableOpacity, View } from 'react-native'

import { Colors } from '@/constants/colors'

export interface MessageAction {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  destructive?: boolean
  onPress: () => void
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '😮', '🎵']

interface MessageActionSheetProps {
  visible: boolean
  actions: MessageAction[]
  onClose: () => void
  /** Quick emoji reactions row (ticket 3.2). */
  onReact?: (emoji: string) => void
}

/** Bottom-sheet long-press menu for a chat message (tickets 3.1–3.4). */
export function MessageActionSheet({ visible, actions, onClose, onReact }: MessageActionSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <BlurView tint="dark" intensity={40} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <View className="rounded-t-3xl px-5 pt-4 pb-8" style={{ backgroundColor: Colors.surface }}>
          <View className="self-center mb-4 rounded-full" style={{ width: 36, height: 4, backgroundColor: Colors.outlineVariant }} />
          {onReact ? (
            <View className="flex-row justify-around mb-2 pb-3 border-b border-surface-container-high">
              {QUICK_REACTIONS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => {
                    onClose()
                    onReact(emoji)
                  }}
                  className="h-10 w-10 items-center justify-center rounded-full bg-surface-container-high"
                >
                  <Text style={{ fontSize: 20 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          {actions.map(action => (
            <TouchableOpacity
              key={action.label}
              onPress={() => {
                onClose()
                action.onPress()
              }}
              className="flex-row items-center gap-3 py-3.5"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
                <Ionicons name={action.icon} size={20} color={action.destructive ? Colors.primary : Colors.onSurface} />
              </View>
              <Text className={`text-[15px] font-semibold ${action.destructive ? 'text-primary' : 'text-on-surface'}`}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  )
}
