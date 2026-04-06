import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { BlurView } from 'expo-blur'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import type { BackendUser } from '@/lib/api'
import { Colors } from '@/constants/colors'
import { useChat } from '@/hooks/useChat'
import { useDiscoveryStore } from '@/store/discoveryStore'

function NewConversationContent() {
  const useGlass = isLiquidGlassAvailable()
  const { searchChatUsers, startDirectConversation } = useChat()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BackendUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [startingUserId, setStartingUserId] = useState<string | null>(null)

  useEffect(() => {
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
  }, [query, searchChatUsers])

  const handleStartConversation = async (targetUserId: string) => {
    try {
      setStartingUserId(targetUserId)
      const conversation = await startDirectConversation(targetUserId)
      useDiscoveryStore.getState().removeUser(targetUserId)
      if (conversation.requestStatus === 'ACCEPTED') {
        router.replace(`/(home)/(match)/chat/${conversation.id}` as never)
      } else {
        router.back()
      }
    } catch (error) {
      console.error('[chat] failed to start conversation', error)
    } finally {
      setStartingUserId(null)
    }
  }

  return (
    <View className="flex-1 px-5 pb-6 pt-6">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-xl font-extrabold text-on-surface">New chat request</Text>
        {useGlass ? (
          <GlassView isInteractive style={{ borderRadius: 999, overflow: 'hidden' }}>
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full"
              onPress={() => router.back()}
              activeOpacity={0.75}
            >
              <Ionicons name="close" size={20} color={Colors.onSurface} />
            </TouchableOpacity>
          </GlassView>
        ) : (
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full bg-surface-container"
            onPress={() => router.back()}
            activeOpacity={0.75}
          >
            <Ionicons name="close" size={20} color={Colors.onSurface} />
          </TouchableOpacity>
        )}
      </View>

      {useGlass ? (
        <GlassView isInteractive style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
          <View className="flex-row items-center px-4 py-3">
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
        </GlassView>
      ) : (
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
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {isSearching ? (
          <View className="items-center py-10">
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : results.length > 0 ? (
          <View className="gap-2">
            {results.map(result => (
              useGlass ? (
                <GlassView key={result.id} isInteractive style={{ borderRadius: 16, overflow: 'hidden' }}>
                  <TouchableOpacity
                    className="flex-row items-center gap-3 px-3 py-3"
                    disabled={startingUserId === result.id}
                    onPress={() => handleStartConversation(result.id)}
                    activeOpacity={0.75}
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
                </GlassView>
              ) : (
                <TouchableOpacity
                  key={result.id}
                  className="flex-row items-center gap-3 rounded-2xl bg-surface px-3 py-3"
                  disabled={startingUserId === result.id}
                  onPress={() => handleStartConversation(result.id)}
                  activeOpacity={0.75}
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
              )
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
  )
}

function IOSNewConversationSheet() {
  const useGlass = isLiquidGlassAvailable()

  return (
    useGlass ? (
      <GlassView style={{ flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <NewConversationContent />
        </KeyboardAvoidingView>
      </GlassView>
    ) : (
      <BlurView
        tint="systemMaterial"
        intensity={100}
        style={{ flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }}
      >
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <NewConversationContent />
        </KeyboardAvoidingView>
      </BlurView>
    )
  )
}

function AndroidNewConversationSheet() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Host, ModalBottomSheet, RNHostView } = require('@expo/ui/jetpack-compose')

  return (
    <Host matchContents>
      <ModalBottomSheet
        containerColor={Colors.surface}
        showDragHandle
        onDismissRequest={() => router.back()}
      >
        <RNHostView matchContents>
          <KeyboardAvoidingView behavior="height" style={{ flex: 1 }}>
            <NewConversationContent />
          </KeyboardAvoidingView>
        </RNHostView>
      </ModalBottomSheet>
    </Host>
  )
}

export default function NewConversationSheet() {
  if (Platform.OS === 'android') {
    return <AndroidNewConversationSheet />
  }

  return <IOSNewConversationSheet />
}
