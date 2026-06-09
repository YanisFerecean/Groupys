import { Ionicons } from '@expo/vector-icons'
import { ActivityIndicator, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native'

import { Colors } from '@/constants/colors'
import type { Message } from '@/models/Chat'

interface ChatSearchPanelProps {
  query: string
  results: Message[]
  isSearching: boolean
  onChangeQuery: (query: string) => void
  onClose: () => void
  onResultPress: (messageId: string) => void
}

function resultText(message: Message): string {
  if (message.content?.trim()) return message.content.trim()
  const payload = message.payload ?? {}
  const track = payload.track && typeof payload.track === 'object'
    ? payload.track as Record<string, unknown>
    : {}
  const title = payload.title ?? track.title
  const artist = payload.artist ?? track.artist
  return [title, artist].filter(value => typeof value === 'string' && value.trim()).join(' · ')
    || message.messageType
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const normalized = query.trim()
  if (!normalized) return <Text>{text}</Text>
  const index = text.toLocaleLowerCase().indexOf(normalized.toLocaleLowerCase())
  if (index < 0) return <Text>{text}</Text>

  return (
    <Text>
      {text.slice(0, index)}
      <Text className="font-bold text-primary">{text.slice(index, index + normalized.length)}</Text>
      {text.slice(index + normalized.length)}
    </Text>
  )
}

/** Debounced in-chat search results panel (ticket 3.5). */
export function ChatSearchPanel({
  query,
  results,
  isSearching,
  onChangeQuery,
  onClose,
  onResultPress,
}: ChatSearchPanelProps) {
  const trimmed = query.trim()

  return (
    <View className="border-b border-surface-container-high bg-surface px-4 pb-3 pt-3">
      <View className="flex-row items-center gap-2">
        <View className="flex-1 flex-row items-center gap-2 rounded-full bg-surface-container px-4">
          <Ionicons name="search" size={18} color={Colors.onSurfaceVariant} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={onChangeQuery}
            placeholder="Search this conversation"
            placeholderTextColor={Colors.onSurfaceVariant}
            className="flex-1 py-2.5 text-[15px] text-on-surface"
            returnKeyType="search"
          />
          {isSearching ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
        </View>
        <TouchableOpacity onPress={onClose} className="px-1 py-2">
          <Text className="text-sm font-bold text-primary">Cancel</Text>
        </TouchableOpacity>
      </View>

      {trimmed.length >= 2 ? (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          style={{ maxHeight: 280 }}
          className="mt-2"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => onResultPress(item.id)}
              className="rounded-2xl px-3 py-2.5"
            >
              <Text className="text-xs font-bold text-on-surface-variant">
                {item.senderDisplayName || item.senderUsername}
              </Text>
              <Text className="mt-0.5 text-sm text-on-surface" numberOfLines={2}>
                <HighlightedText text={resultText(item)} query={trimmed} />
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={!isSearching ? (
            <Text className="py-5 text-center text-sm font-medium text-on-surface-variant">
              No matching messages
            </Text>
          ) : null}
        />
      ) : (
        <Text className="px-3 pt-3 text-xs font-medium text-on-surface-variant">
          Type at least 2 characters to search messages and music cards.
        </Text>
      )}
    </View>
  )
}
