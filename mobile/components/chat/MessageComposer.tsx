import { Ionicons } from '@expo/vector-icons'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import * as Haptics from 'expo-haptics'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Keyboard, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Colors } from '@/constants/colors'
import { chatWs } from '@/lib/chat-ws'
import type { ReplyStub } from '@/models/Chat'

const GLASS = isLiquidGlassAvailable()

interface MessageComposerProps {
  conversationId: string
  disabled?: boolean
  onSend: (content: string) => void | Promise<void>
  /** Attach button handler for richer shares (album/playlist; tickets 2.2/2.3). */
  onAttachPress?: () => void
  /** Camera button handler: captures a snapshot to share. Button shown only when provided. */
  onCameraPress?: () => void
  /** Active reply target (ticket 3.1); renders a preview bar above the input. */
  replyTo?: ReplyStub | null
  onCancelReply?: () => void
  onVoiceNote?: () => void
}

const MAX_LENGTH = 2000

export function MessageComposer({
  conversationId,
  disabled = false,
  onSend,
  onAttachPress,
  onCameraPress,
  replyTo,
  onCancelReply,
  onVoiceNote,
}: MessageComposerProps) {
  const [content, setContent] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboardVisible(true))
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardVisible(false))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

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

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    stopTyping()
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    onSend(trimmed)
    setContent('')
  }

  // Light tap feedback on the composer's icon buttons before firing the provided handler.
  const withTap = (handler?: () => void) =>
    handler
      ? () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          handler()
        }
      : undefined
  const handleAttach = withTap(onAttachPress)
  const handleCamera = withTap(onCameraPress)
  const handleVoiceNote = withTap(onVoiceNote)

  const remaining = MAX_LENGTH - content.length

  return (
    <View style={{ backgroundColor: GLASS ? 'transparent' : '#f7f4ec' }}>
      {GLASS ? (
        <GlassView
          glassEffectStyle="regular"
          style={{ paddingHorizontal: 16, paddingBottom: keyboardVisible ? 8 : 20, paddingTop: 6 }}
        >
          {replyTo ? (
            <GlassView
              tintColor={`${Colors.primary}22`}
              style={{ marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderLeftWidth: 2, borderLeftColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 6 }}
            >
              <View style={{ flex: 1 }}>
                <Text className="text-[11px] font-bold text-primary" numberOfLines={1}>
                  Replying to {replyTo.senderDisplayName || replyTo.senderUsername}
                </Text>
                <Text className="text-[12px] text-on-surface-variant" numberOfLines={1}>{replyTo.snippet}</Text>
              </View>
              <TouchableOpacity onPress={onCancelReply} className="p-1">
                <Ionicons name="close" size={18} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
            </GlassView>
          ) : null}
          <View className="flex-row items-end gap-3">
            {onAttachPress ? (
              <TouchableOpacity disabled={disabled} onPress={handleAttach} activeOpacity={0.7} style={{ opacity: disabled ? 0.5 : 1 }}>
                <GlassView isInteractive style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="add" size={24} color={Colors.primary} />
                </GlassView>
              </TouchableOpacity>
            ) : null}
            {onCameraPress ? (
              <TouchableOpacity disabled={disabled} onPress={handleCamera} activeOpacity={0.7} style={{ opacity: disabled ? 0.5 : 1 }}>
                <GlassView isInteractive style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="camera" size={22} color={Colors.primary} />
                </GlassView>
              </TouchableOpacity>
            ) : null}
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
            {content.trim() ? (
              <TouchableOpacity disabled={disabled} onPress={handleSend} activeOpacity={0.7}>
                <GlassView
                  glassEffectStyle="clear"
                  isInteractive
                  tintColor={disabled ? undefined : Colors.primary}
                  style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="arrow-up" size={20} color={disabled ? Colors.onSurface : Colors.onPrimary} />
                </GlassView>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity disabled={disabled} onPress={handleVoiceNote} activeOpacity={0.7}>
                <GlassView
                  glassEffectStyle="clear"
                  isInteractive
                  style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="mic" size={20} color={Colors.onSurface} />
                </GlassView>
              </TouchableOpacity>
            )}
          </View>
        </GlassView>
      ) : (
        <View className="border-t border-surface-container-high px-4 pb-2 pt-1" style={{ backgroundColor: '#f7f4ec' }}>
          {replyTo ? (
            <View className="mb-1.5 flex-row items-center gap-2 rounded-xl border-l-2 px-2.5 py-1.5" style={{ borderLeftColor: Colors.primary, backgroundColor: Colors.surfaceContainerHigh }}>
              <View className="flex-1">
                <Text className="text-[11px] font-bold text-primary" numberOfLines={1}>
                  Replying to {replyTo.senderDisplayName || replyTo.senderUsername}
                </Text>
                <Text className="text-[12px] text-on-surface-variant" numberOfLines={1}>{replyTo.snippet}</Text>
              </View>
              <TouchableOpacity onPress={onCancelReply} className="p-1">
                <Ionicons name="close" size={18} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          ) : null}
          <View className="flex-row items-end gap-3">
            {onAttachPress ? (
              <TouchableOpacity
                className="h-12 w-12 items-center justify-center rounded-full bg-surface-container-high"
                disabled={disabled}
                onPress={handleAttach}
                accessibilityLabel="Share music"
                style={{ opacity: disabled ? 0.5 : 1 }}
              >
                <Ionicons name="add" size={24} color={Colors.primary} />
              </TouchableOpacity>
            ) : null}
            {onCameraPress ? (
              <TouchableOpacity
                className="h-12 w-12 items-center justify-center rounded-full bg-surface-container-high"
                disabled={disabled}
                onPress={handleCamera}
                accessibilityLabel="Take a photo"
                style={{ opacity: disabled ? 0.5 : 1 }}
              >
                <Ionicons name="camera" size={20} color={Colors.primary} />
              </TouchableOpacity>
            ) : null}
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
            {content.trim() ? (
              <TouchableOpacity
                className="h-12 w-12 items-center justify-center rounded-full bg-primary"
                disabled={disabled}
                onPress={handleSend}
              >
                <Ionicons name="arrow-up" size={20} color={disabled ? Colors.onSurfaceVariant : Colors.onPrimary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                className="h-12 w-12 items-center justify-center rounded-full bg-surface-container-high"
                disabled={disabled}
                onPress={handleVoiceNote}
              >
                <Ionicons name="mic" size={20} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  )
}
