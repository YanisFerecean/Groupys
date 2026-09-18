import { useEffect, useState } from 'react'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { KeyboardAvoidingView, Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native'

import { Colors } from '@/constants/colors'

interface TextPromptModalProps {
  visible: boolean
  title: string
  placeholder?: string
  initialValue?: string
  multiline?: boolean
  /** Allow submitting with empty text (e.g. an optional note). */
  allowEmpty?: boolean
  submitLabel?: string
  onSubmit: (value: string) => void
  onClose: () => void
}

/** Small reusable text-input bottom sheet (tickets 4.1/4.2/4.3). Cross-platform. */
export function TextPromptModal({
  visible,
  title,
  placeholder,
  initialValue = '',
  multiline = false,
  allowEmpty = false,
  submitLabel = 'Send',
  onSubmit,
  onClose,
}: TextPromptModalProps) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    if (visible) setValue(initialValue)
  }, [visible, initialValue])

  const canSubmit = allowEmpty || value.trim().length > 0

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1 justify-end"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <BlurView tint="dark" intensity={40} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View className="rounded-t-3xl px-5 pt-4 pb-8" style={{ backgroundColor: Colors.surface }}>
          <View className="self-center mb-4 rounded-full" style={{ width: 36, height: 4, backgroundColor: Colors.outlineVariant }} />
          <Text className="text-base font-bold text-on-surface mb-3">{title}</Text>
          <TextInput
            className="rounded-2xl bg-surface-container px-4 py-3 text-[15px] text-on-surface"
            style={multiline ? { minHeight: 80, textAlignVertical: 'top' } : undefined}
            placeholder={placeholder}
            placeholderTextColor={Colors.onSurfaceVariant}
            value={value}
            onChangeText={setValue}
            multiline={multiline}
            autoFocus
          />
          <TouchableOpacity
            onPress={() => {
              if (!canSubmit) return
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              onSubmit(value.trim())
            }}
            disabled={!canSubmit}
            className="mt-4 rounded-full bg-primary py-3.5 items-center"
            style={{ opacity: canSubmit ? 1 : 0.5 }}
          >
            <Text className="text-base font-bold text-on-primary">{submitLabel}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
