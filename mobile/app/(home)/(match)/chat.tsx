import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '@/constants/colors'
import { chatMessages } from '@/constants/mockData'
import type { ChatMessage } from '@/types'

export default function ChatScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [message, setMessage] = useState('')

  function renderMessage({ item }: { item: ChatMessage }) {
    const isMe = item.sender === 'me'
    return (
      <View>
        {item.date && (
          <Text className="my-4 text-center text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            {item.date}
          </Text>
        )}
        <View
          className={`mb-3 max-w-[80%] ${isMe ? 'self-end' : 'self-start'}`}
        >
          <View
            className={`rounded-2xl px-4 py-3 ${
              isMe ? 'bg-primary' : 'bg-surface-container-lowest'
            }`}
          >
            {item.image && (
              <Image
                source={item.image}
                style={{ width: '100%', height: 150, borderRadius: 12 }}
                contentFit="cover"
              />
            )}
            {item.text ? (
              <Text
                className={`text-sm ${
                  isMe ? 'text-white' : 'text-on-surface'
                }`}
              >
                {item.text}
              </Text>
            ) : null}
          </View>
          <Text
            className={`mt-1 text-xs text-on-surface-variant ${
              isMe ? 'text-right' : 'text-left'
            }`}
          >
            {item.time}
            {isMe && ' ✓✓'}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View
        className="flex-row items-center gap-3 bg-surface-container-lowest px-5 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <Image
          source="https://picsum.photos/seed/julian/100/100"
          style={{ width: 40, height: 40, borderRadius: 20 }}
          contentFit="cover"
        />
        <View className="flex-1">
          <Text className="text-lg font-bold text-on-surface">
            Julian Casablancas
          </Text>
          <Text className="text-xs text-tertiary">ONLINE NOW</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="chatbubble-outline" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        data={chatMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Input */}
      <View
        className="flex-row items-center gap-3 bg-surface-container-lowest px-5 py-3"
        style={{ paddingBottom: insets.bottom + 8 }}
      >
        <TouchableOpacity>
          <Ionicons name="add-circle" size={28} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
        <TextInput
          className="flex-1 rounded-full bg-surface-container-high px-4 py-2.5 text-sm text-on-surface"
          placeholder="Message..."
          placeholderTextColor={Colors.onSurfaceVariant}
          value={message}
          onChangeText={setMessage}
        />
        <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-primary">
          <Ionicons name="arrow-up" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
