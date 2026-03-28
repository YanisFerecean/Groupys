import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Colors } from '@/constants/colors'
import { chatWs } from '@/lib/chat-ws'

interface MessageComposerProps {
  conversationId: string
  disabled?: boolean
  onSend: (content: string) => void | Promise<void>
}

const MAX_LENGTH = 2000

export function MessageComposer({
  conversationId,
  disabled = false,
  onSend,
}: MessageComposerProps) {
  const [content, setContent] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopTyping = useCallback(() => {
    if (!isTyping) {
      return
    }

    chatWs.send({ type: 'TYPING_STOP', conversationId })
    setIsTyping(false)
  }, [conversationId, isTyping])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (isTyping) {
        chatWs.send({ type: 'TYPING_STOP', conversationId })
      }
    }
  }, [conversationId, isTyping])

  const handleChange = (nextContent: string) => {
    setContent(nextContent)

    if (!nextContent.trim()) {
      stopTyping()
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      return
    }

    if (!isTyping) {
      chatWs.send({ type: 'TYPING_START', conversationId })
      setIsTyping(true)
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = setTimeout(stopTyping, 2000)
  }

  const handleSend = () => {
    const trimmed = content.trim()
    if (!trimmed || disabled) {
      return
    }

    stopTyping()
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    onSend(trimmed)
    setContent('')
  }

  const remaining = MAX_LENGTH - content.length

  return (
    <View className="border-t border-surface-container-high bg-surface-container-lowest px-4 pb-3 pt-3">
      <View className="flex-row items-end gap-3">
        <View className="flex-1 rounded-[28px] bg-surface-container px-4 py-2">
          <TextInput
            multiline
            maxLength={MAX_LENGTH}
            className="max-h-28 text-[15px] text-on-surface"
            placeholder="Message..."
            placeholderTextColor={Colors.onSurfaceVariant}
            value={content}
            onChangeText={handleChange}
          />
          {remaining <= 160 ? (
            <Text className={`mt-1 text-right text-[11px] font-medium ${remaining <= 25 ? 'text-primary' : 'text-on-surface-variant'}`}>
              {remaining}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          className={`h-12 w-12 items-center justify-center rounded-full ${content.trim() && !disabled ? 'bg-primary' : 'bg-surface-container-high'}`}
          disabled={!content.trim() || disabled}
          onPress={handleSend}
        >
          <Ionicons
            name="arrow-up"
            size={20}
            color={content.trim() && !disabled ? Colors.onPrimary : Colors.onSurfaceVariant}
          />
        </TouchableOpacity>
      </View>
    </View>
  )
}
