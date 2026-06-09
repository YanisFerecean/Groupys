import { Ionicons } from '@expo/vector-icons'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Colors } from '@/constants/colors'
import { chatWs } from '@/lib/chat-ws'

const GLASS = isLiquidGlassAvailable()

interface MessageComposerProps {
  conversationId: string
  disabled?: boolean
  onSend: (content: string) => void | Promise<void>
  /**
   * Music-note button handler (tickets 2.1/1.3): shares the current track, opens the picker, or
   * prompts to connect — the parent decides. Button is shown only when provided.
   */
  onMusicPress?: () => void
  /** Attach button handler for richer shares (album/playlist; tickets 2.2/2.3). */
  onAttachPress?: () => void
}

const MAX_LENGTH = 2000

export function MessageComposer({
  conversationId,
  disabled = false,
  onSend,
  onMusicPress,
  onAttachPress,
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
    <View className="border-t border-surface-container-high px-4 pb-2 pt-1" style={{ backgroundColor: '#f7f4ec' }}>
      <View className="flex-row items-end gap-3">
        {onAttachPress ? (
          <TouchableOpacity
            className="h-12 w-12 items-center justify-center rounded-full bg-surface-container-high"
            disabled={disabled}
            onPress={onAttachPress}
            accessibilityLabel="Share music"
            style={{ opacity: disabled ? 0.5 : 1 }}
          >
            <Ionicons name="add" size={24} color={Colors.primary} />
          </TouchableOpacity>
        ) : null}
        {onMusicPress ? (
          <TouchableOpacity
            className="h-12 w-12 items-center justify-center rounded-full bg-surface-container-high"
            disabled={disabled}
            onPress={onMusicPress}
            accessibilityLabel="Share a track"
            style={{ opacity: disabled ? 0.5 : 1 }}
          >
            <Ionicons name="musical-notes" size={20} color={Colors.primary} />
          </TouchableOpacity>
        ) : null}
        {GLASS ? (
          <GlassView
            glassEffectStyle="regular"
            tintColor="rgba(255,255,255,0.7)"
            style={{ flex: 1, borderRadius: 28, paddingHorizontal: 16, justifyContent: 'center', minHeight: 44 }}
          >
            <TextInput
              editable={!disabled}
              multiline
              maxLength={MAX_LENGTH}
              className="max-h-28 text-[15px]"
              style={{ minHeight: 24, color: Colors.onSurface, paddingTop: 0, paddingBottom: 0 }}
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
          </GlassView>
        ) : (
          <View className="flex-1 rounded-[28px] bg-surface-container px-4 py-2">
            <TextInput
              editable={!disabled}
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
        )}

        {GLASS ? (
          <TouchableOpacity
            disabled={!content.trim() || disabled}
            onPress={handleSend}
            activeOpacity={0.7}
          >
            <GlassView
              glassEffectStyle="clear"
              isInteractive
              tintColor={content.trim() && !disabled ? Colors.primary : undefined}
              style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color={content.trim() && !disabled ? Colors.onPrimary : Colors.onSurface}
              />
            </GlassView>
          </TouchableOpacity>
        ) : (
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
        )}
      </View>
    </View>
  )
}
