import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import type { BackendUser } from '@/lib/api'
import { Colors } from '@/constants/colors'
import { useChat } from '@/hooks/useChat'
import GlassModalBackdrop from '@/components/ui/GlassModalBackdrop'
import { useDiscoveryStore } from '@/store/discoveryStore'

interface NewConversationModalProps {
  visible: boolean
  onClose: () => void
}

export function NewConversationModal({ visible, onClose }: NewConversationModalProps) {
  const router = useRouter()
  const { searchChatUsers, startDirectConversation } = useChat()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BackendUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [startingUserId, setStartingUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) {
      setQuery('')
      setResults([])
      setIsSearching(false)
      return
    }

    const timeout = setTimeout(async () => {
      const trimmed = query.trim()
      if (trimmed.length < 2) {
        setResults([])
        setIsSearching(false)
        return
      }

      setIsSearching(true)
      try {
        const users = await searchChatUsers(trimmed)
        setResults(users)
      } catch (error) {
        console.error('[chat] failed to search users', error)
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 350)

    return () => clearTimeout(timeout)
  }, [query, searchChatUsers, visible])

  const handleStartConversation = async (targetUserId: string) => {
    try {
      setStartingUserId(targetUserId)
      const conversation = await startDirectConversation(targetUserId)
      useDiscoveryStore.getState().removeUser(targetUserId)
      onClose()
      if (conversation.requestStatus === 'ACCEPTED') {
        router.push(`/(home)/(match)/chat/${conversation.id}` as never)
      } else {
        router.push('/(home)/(match)/chat')
      }
    } catch (error) {
      console.error('[chat] failed to start conversation', error)
    } finally {
      setStartingUserId(null)
    }
  }

  return (
    <Modal
      animationType="slide"
      visible={visible}
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <GlassModalBackdrop onPress={onClose} />
        <View className="max-h-[82%] rounded-t-[32px] bg-surface-container-lowest px-5 pb-6 pt-4">
          <View className="mb-4 items-center">
            <View className="h-1.5 w-12 rounded-full bg-surface-container-highest" />
          </View>

          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-xl font-extrabold text-on-surface">New chat request</Text>
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full bg-surface-container"
              onPress={onClose}
            >
              <Ionicons name="close" size={20} color={Colors.onSurface} />
            </TouchableOpacity>
          </View>

          <View className="mb-4 flex-row items-center rounded-2xl bg-surface-container px-4 py-3">
            <Ionicons name="search" size={18} color={Colors.onSurfaceVariant} />
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              className="ml-3 flex-1 text-base text-on-surface"
              placeholder="Search by username or display name"
              placeholderTextColor={Colors.onSurfaceVariant}
              value={query}
              onChangeText={setQuery}
            />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {isSearching ? (
              <View className="items-center py-10">
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : results.length > 0 ? (
              <View className="gap-2">
                {results.map(result => (
                  <TouchableOpacity
                    key={result.id}
                    className="flex-row items-center gap-3 rounded-2xl bg-surface px-3 py-3"
                    disabled={startingUserId === result.id}
                    onPress={() => handleStartConversation(result.id)}
                  >
                    {result.profileImage ? (
                      <Image
                        source={{ uri: result.profileImage }}
                        style={{ width: 48, height: 48, borderRadius: 24 }}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        className="items-center justify-center rounded-full bg-primary/10"
                        style={{ width: 48, height: 48 }}
                      >
                        <Text className="text-base font-bold text-primary">
                          {(result.displayName || result.username).charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}

                    <View className="flex-1">
                      <Text className="text-sm font-bold text-on-surface" numberOfLines={1}>
                        {result.displayName || result.username}
                      </Text>
                      <Text className="text-xs font-medium text-on-surface-variant">
                        @{result.username}
                      </Text>
                      <Text className="mt-1 text-xs font-medium text-on-surface-variant">
                        Send a request to start chatting
                      </Text>
                    </View>

                    {startingUserId === result.id ? (
                      <ActivityIndicator color={Colors.primary} />
                    ) : (
                      <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : query.trim().length >= 2 ? (
              <View className="items-center py-10">
                <Text className="text-sm font-medium text-on-surface-variant">
                  No users found for &quot;{query.trim()}&quot;.
                </Text>
              </View>
            ) : (
              <View className="items-center py-10">
                <Text className="text-sm font-medium text-on-surface-variant">
                  Type at least 2 characters to search.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
