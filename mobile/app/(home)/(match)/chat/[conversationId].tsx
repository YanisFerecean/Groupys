import { Ionicons } from '@expo/vector-icons'
import { useAuth, useUser } from '@clerk/expo'
import { Image } from 'expo-image'
import * as Haptics from 'expo-haptics'
import * as ImagePicker from 'expo-image-picker'
import { UIImagePickerPreferredAssetRepresentationMode } from 'expo-image-picker'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { MessageComposer } from '@/components/chat/MessageComposer'
import { NowPlayingPill } from '@/components/chat/NowPlayingPill'
import { TrackPicker } from '@/components/music/TrackPicker'
import { AlbumPicker } from '@/components/music/AlbumPicker'
import { MusicUpsellSheet } from '@/components/music/MusicUpsellSheet'
import { MusicAttachSheet } from '@/components/chat/MusicAttachSheet'
import { ChatLoadingStatus } from '@/components/chat/ChatLoadingStatus'
import { ChatActionsContext, type ChatActions } from '@/components/chat/ChatActionsContext'
import { TextPromptModal } from '@/components/ui/TextPromptModal'
import { ListenTogetherBar } from '@/components/chat/ListenTogetherBar'
import { MessageActionSheet, type MessageAction } from '@/components/chat/MessageActionSheet'
import { ChatSearchPanel } from '@/components/chat/ChatSearchPanel'
import { ConversationOptionsSheet } from '@/components/chat/ConversationOptionsSheet'
import { VoiceRecorderModal } from '@/components/chat/VoiceRecorderModal'
import { TypingIndicator } from '@/components/chat/TypingIndicator'
import { useListenTogether } from '@/hooks/useListenTogether'
import { useMusicGate } from '@/hooks/useMusicGate'
import { apiPostMultipart, getCollabPlaylist } from '@/lib/api'
import { resolveLinkPreview } from '@/lib/chat-api'
import type { AlbumPayload, TrackPayload, VoiceBedPayload } from '@/models/ChatPayloads'
import { Colors } from '@/constants/colors'
import { useChat } from '@/hooks/useChat'
import { useChatMessages } from '@/hooks/useChatMessages'
import { useModeration } from '@/hooks/useModeration'
import { logWarn } from '@/lib/logging'
import { publicProfilePath } from '@/lib/profileRoutes'
import { chatWs } from '@/lib/chat-ws'
import { setActiveConversationId } from '@/lib/activeChat'
import { stopAllRegisteredAudio } from '@/lib/audioBus'
import { stopPreview } from '@/hooks/usePreviewPlayer'
import { timeAgo } from '@/lib/timeAgo'
import type { Message, ReplyStub } from '@/models/Chat'

export default function ChatConversationScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const params = useLocalSearchParams<{ conversationId?: string | string[] }>()
  const { user } = useUser()
  const { getToken } = useAuth()
  const { showModerationMenu } = useModeration()
  const musicGate = useMusicGate()
  const {
    acceptDirectRequest,
    conversations,
    cryptoReady,
    denyDirectRequest,
    fetchConversationById,
    getPublicKeyForUsername,
    getNowPlaying,
    isUserOnline,
    markConversationRead,
    setConversationMute,
  } = useChat()
  const conversationId = Array.isArray(params.conversationId)
    ? params.conversationId[0]
    : params.conversationId
  const conversation = conversations.find(item => item.id === conversationId)
  const otherParticipant = conversation?.participants.find(participant => participant.username !== user?.username) ?? null
  const activeConversationId = conversation ? conversationId ?? null : null
  const {
    hasMore,
    isLoading,
    isInitialLoadPending,
    isLoadingMore,
    loadMore,
    loadUntilMessage,
    messages,
    resendMessage,
    searchConversationMessages,
    sendMessage,
    toggleReaction,
    toggleTrackReaction,
    editMessage,
    deleteMessage,
  } = useChatMessages(activeConversationId, otherParticipant?.username ?? null)

  // Which tracks are already in the conversation's collab playlist — used to flip the track-card
  // "Add to playlist" button to "Already in the playlist". The COLLAB_PLAYLIST card updates
  // live over the socket, so we key the fetch off its track count to refetch when anyone adds.
  const collabCardTrackCount = useMemo(() => {
    const count = messages.find(m => m.messageType === 'COLLAB_PLAYLIST')?.payload?.trackCount
    return typeof count === 'number' ? count : 0
  }, [messages])
  const { data: collabPlaylist } = useQuery({
    queryKey: ['collab-playlist', activeConversationId, collabCardTrackCount],
    queryFn: async () => {
      const token = await getToken()
      return getCollabPlaylist(activeConversationId!, token)
    },
    enabled: !!activeConversationId,
    staleTime: 10_000,
  })
  const [optimisticPlaylistIds, setOptimisticPlaylistIds] = useState<Set<string>>(new Set())
  useEffect(() => { setOptimisticPlaylistIds(new Set()) }, [activeConversationId])
  const collabPlaylistIds = useMemo(() => {
    const ids = new Set<string>(optimisticPlaylistIds)
    collabPlaylist?.tracks.forEach(t => ids.add(t.trackId))
    return ids
  }, [collabPlaylist, optimisticPlaylistIds])

  // Track sharing (tickets 2.1 / 1.3 / 4.x).
  const [trackPickerOpen, setTrackPickerOpen] = useState(false)
  const [trackPickerQuery, setTrackPickerQuery] = useState('')
  // What the track picker selection feeds into.
  const [pickerMode, setPickerMode] = useState<'send' | 'dedicate' | 'timestamp' | 'blind' | 'listen' | 'reaction'>('send')
  const listenTogether = useListenTogether(activeConversationId)
  // Long-press action menu + reply target (ticket 3.1).
  const [actionMessage, setActionMessage] = useState<Message | null>(null)
  const [replyTarget, setReplyTarget] = useState<ReplyStub | null>(null)
  const [pendingEdit, setPendingEdit] = useState<Message | null>(null)
  const [pendingTrackReactionMessageId, setPendingTrackReactionMessageId] = useState<string | null>(null)
  // Dedication note flow (ticket 4.3).
  const [pendingDedication, setPendingDedication] = useState<TrackPayload | null>(null)
  // Timestamp entry flow (ticket 4.2).
  const [pendingTimestampTrack, setPendingTimestampTrack] = useState<TrackPayload | null>(null)
  // Richer music shares (tickets 2.2 / 2.3).
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [albumPickerOpen, setAlbumPickerOpen] = useState(false)
  const [voiceRecorderOpen, setVoiceRecorderOpen] = useState(false)
  const [pendingVoiceBed, setPendingVoiceBed] = useState<VoiceBedPayload | null>(null)
  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
        preferredAssetRepresentationMode: UIImagePickerPreferredAssetRepresentationMode.Compatible,
      })
      if (result.canceled || !result.assets[0]) return

      const asset = result.assets[0]
      const formData = new FormData()
      formData.append('file', {
        uri: asset.uri,
        type: asset.mimeType ?? 'image/jpeg',
        name: asset.fileName ?? `chat-image-${Date.now()}.jpg`,
      } as unknown as Blob)
      const token = await getToken()
      const uploaded = await apiPostMultipart<{ url: string }>('/posts/media/upload', token, formData)
      await sendMessage('Photo', { messageType: 'IMAGE', mediaUrl: uploaded.url })
    } catch {
      Alert.alert('Could not share photo', 'Try selecting the image again.')
    }
  }, [getToken, sendMessage])

  const captureImage = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Camera access needed', 'Enable camera access in Settings to take a photo.')
        return
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      })
      if (result.canceled || !result.assets[0]) return

      const asset = result.assets[0]
      const formData = new FormData()
      formData.append('file', {
        uri: asset.uri,
        type: asset.mimeType ?? 'image/jpeg',
        name: asset.fileName ?? `chat-photo-${Date.now()}.jpg`,
      } as unknown as Blob)
      const token = await getToken()
      const uploaded = await apiPostMultipart<{ url: string }>('/posts/media/upload', token, formData)
      await sendMessage('Photo', { messageType: 'IMAGE', mediaUrl: uploaded.url })
    } catch {
      Alert.alert('Could not take photo', 'Try again.')
    }
  }, [getToken, sendMessage])

  const handleComposerSend = useCallback(async (content: string) => {
    const replyTo = replyTarget
    setReplyTarget(null)
    const trimmed = content.trim()
    if (/^https?:\/\/\S+$/i.test(trimmed)) {
      try {
        const token = await getToken()
        const resolved = await resolveLinkPreview(trimmed, token)
        await sendMessage(resolved.fallbackText, {
          messageType: resolved.messageType,
          payload: resolved.payload,
          replyTo,
        })
        return
      } catch {
        // A URL without previewable metadata remains a normal encrypted text message.
      }
    }
    await sendMessage(content, replyTo ? { replyTo } : undefined)
  }, [getToken, replyTarget, sendMessage])

  const sendVoiceNote = useCallback(async (
    uri: string,
    durationMs: number,
    peaks: number[],
    bed?: VoiceBedPayload,
  ) => {
    try {
      const extension = uri.split('.').pop()?.split('?')[0]?.toLowerCase()
      const mimeType = extension === 'webm'
        ? 'audio/webm'
        : extension === '3gp'
          ? 'audio/3gpp'
          : 'audio/mp4'
      const fileName = `voice-note-${Date.now()}.${extension || 'm4a'}`
      const formData = new FormData()
      formData.append('file', { uri, type: mimeType, name: fileName } as unknown as Blob)
      const token = await getToken()
      const uploaded = await apiPostMultipart<{ url: string }>('/posts/media/upload', token, formData)
      await sendMessage('Voice note', {
        messageType: 'VOICE',
        mediaUrl: uploaded.url,
        payload: { type: 'VOICE', durationMs, peaks, bed },
      })
    } catch {
      Alert.alert('Could not send voice note', 'Try recording the voice note again.')
    }
  }, [getToken, sendMessage])

  const sendTrack = useCallback((track: TrackPayload) => {
    const label = track.artist ? `🎵 ${track.title} — ${track.artist}` : `🎵 ${track.title}`
    void sendMessage(label, {
      messageType: 'TRACK',
      payload: track as unknown as Record<string, unknown>,
    })
  }, [sendMessage])

  const sendAlbum = useCallback((album: AlbumPayload) => {
    const label = `💿 ${album.title} — ${album.artist}`
    void sendMessage(label, {
      messageType: 'ALBUM',
      payload: album as unknown as Record<string, unknown>,
    })
  }, [sendMessage])

  const sendDedication = useCallback((track: TrackPayload, note: string) => {
    const label = track.artist ? `💝 ${track.title} — ${track.artist}` : `💝 ${track.title}`
    const { type: _ignored, ...trackRef } = track
    void sendMessage(label, {
      messageType: 'DEDICATION',
      payload: { type: 'DEDICATION', dedication: true, note: note || undefined, ...trackRef } as unknown as Record<string, unknown>,
    })
  }, [sendMessage])

  const sendTimestamp = useCallback((track: TrackPayload, raw: string) => {
    // Accept "m:ss", "mm:ss", or plain seconds.
    const parts = raw.split(':').map(p => parseInt(p.trim(), 10))
    let seconds = 0
    if (parts.length === 2 && parts.every(n => !Number.isNaN(n))) {
      seconds = parts[0] * 60 + parts[1]
    } else if (parts.length === 1 && !Number.isNaN(parts[0])) {
      seconds = parts[0]
    } else {
      return
    }
    const positionMs = Math.max(0, seconds * 1000)
    const { type: _t, ...trackRef } = track
    const mmss = `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`
    void sendMessage(`⏱️ ${track.title} from ${mmss}`, {
      messageType: 'TIMESTAMP',
      payload: { type: 'TIMESTAMP', track: trackRef, positionMs } as unknown as Record<string, unknown>,
    })
  }, [sendMessage])

  const sendBlindListen = useCallback((track: TrackPayload) => {
    const { type: _t, ...trackRef } = track
    void sendMessage('🎧 Blind listen — guess the song', {
      messageType: 'BLIND_LISTEN',
      payload: { type: 'BLIND_LISTEN', track: trackRef, hidden: true, guessed: false } as unknown as Record<string, unknown>,
    })
  }, [sendMessage])

  // Track picker selection dispatch (send / dedicate / lyric / timestamp / blind flows).
  const handleTrackPicked = useCallback((track: TrackPayload) => {
    setTrackPickerOpen(false)
    if (pickerMode === 'reaction' && pendingTrackReactionMessageId) {
      toggleTrackReaction(pendingTrackReactionMessageId, track)
      setPendingTrackReactionMessageId(null)
      setPickerMode('send')
    } else if (pickerMode === 'dedicate') {
      setPendingDedication(track)
    } else if (pickerMode === 'timestamp') {
      setPendingTimestampTrack(track)
    } else if (pickerMode === 'blind') {
      sendBlindListen(track)
    } else if (pickerMode === 'listen') {
      listenTogether.startRoom(track)
    } else {
      sendTrack(track)
    }
  }, [listenTogether, pendingTrackReactionMessageId, pickerMode, sendBlindListen, sendTrack, toggleTrackReaction])

  // Actions exposed to card renderers (ticket 5.1: taste-handshake CTAs).
  const otherUserId = otherParticipant?.userId
  const chatActions = useMemo<ChatActions>(() => ({
    openTrackPicker: (initialQuery?: string) => {
      setPickerMode('send')
      setTrackPickerQuery(initialQuery ?? '')
      setTrackPickerOpen(true)
    },
    openPartnerProfile: otherUserId
      ? () => router.push(publicProfilePath(otherUserId, '(match)') as never)
      : undefined,
    revealBlindListen: (messageId: string, guess: string) => {
      chatWs.send({ type: 'BLIND_GUESS', messageId, guess })
    },
    addToCollabPlaylist: activeConversationId
      ? (track: TrackPayload) => {
          chatWs.send({ type: 'COLLAB_PLAYLIST_ADD', conversationId: activeConversationId, track })
          if (track.id) setOptimisticPlaylistIds(prev => new Set(prev).add(track.id))
        }
      : undefined,
    isInCollabPlaylist: (trackId: string) => collabPlaylistIds.has(trackId),
  }), [activeConversationId, collabPlaylistIds, otherUserId, router])

  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map())
  const [hasPartnerKey, setHasPartnerKey] = useState(false)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [requestAction, setRequestAction] = useState<'accept' | 'deny' | null>(null)
  const [conversationLoadFailed, setConversationLoadFailed] = useState(false)
  const listRef = useRef<FlatList<Message>>(null)
  const isMountedRef = useRef(true)
  const [pendingScrollMessageId, setPendingScrollMessageId] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Message[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null)
  const [conversationOptionsOpen, setConversationOptionsOpen] = useState(false)

  // Scroll to a message by id (reply quote tap). Load older pages when needed.
  const scrollToMessage = useCallback((messageId: string) => {
    const index = messages.findIndex(m => m.id === messageId)
    if (index >= 0) {
      try {
        listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 })
      } catch {
        // index may be outside the rendered window; ignore
      }
      return
    }
    void loadUntilMessage(messageId).then((found) => {
      if (found) {
        setPendingScrollMessageId(messageId)
      }
    })
  }, [loadUntilMessage, messages])

  useEffect(() => {
    if (!pendingScrollMessageId) return
    const index = messages.findIndex(message => message.id === pendingScrollMessageId)
    if (index < 0) return
    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 })
      setPendingScrollMessageId(null)
    })
    return () => cancelAnimationFrame(frame)
  }, [messages, pendingScrollMessageId])

  useEffect(() => {
    if (!searchOpen || !conversationId || searchQuery.trim().length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    let cancelled = false
    const timeout = setTimeout(() => {
      setIsSearching(true)
      void searchConversationMessages(searchQuery)
        .then(results => {
          if (!cancelled) setSearchResults(results)
        })
        .catch(error => {
          console.error('[chat] failed to search messages', error)
          if (!cancelled) setSearchResults([])
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false)
        })
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [conversationId, searchConversationMessages, searchOpen, searchQuery])

  useEffect(() => {
    if (!highlightedMessageId) return
    const timeout = setTimeout(() => setHighlightedMessageId(null), 3000)
    return () => clearTimeout(timeout)
  }, [highlightedMessageId])

  const handleSearchResultPress = useCallback((messageId: string) => {
    setSearchOpen(false)
    setSearchQuery('')
    setHighlightedMessageId(messageId)
    scrollToMessage(messageId)
  }, [scrollToMessage])

  const buildReplyStub = useCallback((m: Message): ReplyStub => ({
    id: m.id,
    senderUsername: m.senderUsername,
    senderDisplayName: m.senderDisplayName,
    messageType: m.messageType,
    snippet: m.content && m.content.trim() ? m.content.trim().slice(0, 80) : m.messageType,
  }), [])

  const messageActions = useMemo<MessageAction[]>(() => {
    if (!actionMessage) return []
    const mine = actionMessage.senderUsername === user?.username
    const isTextMsg = (actionMessage.messageType || 'text').toLowerCase() === 'text'
    const actions: MessageAction[] = []
    if (!actionMessage.isDeleted) {
      actions.push({
        icon: 'arrow-undo',
        label: 'Reply',
        onPress: () => setReplyTarget(buildReplyStub(actionMessage)),
      })
      actions.push({
        icon: 'musical-note',
        label: 'React with a track',
        onPress: () => {
          setPendingTrackReactionMessageId(actionMessage.id)
          setPickerMode('reaction')
          setTrackPickerQuery('')
          setTrackPickerOpen(true)
        },
      })
    }
    if (mine && isTextMsg && !actionMessage.isDeleted) {
      actions.push({ icon: 'create', label: 'Edit', onPress: () => setPendingEdit(actionMessage) })
    }
    if (mine && !actionMessage.isDeleted) {
      actions.push({
        icon: 'trash',
        label: 'Delete',
        destructive: true,
        onPress: () => {
          Alert.alert('Delete message?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteMessage(actionMessage.id) },
          ])
        },
      })
    }
    return actions
  }, [actionMessage, buildReplyStub, deleteMessage, user?.username])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Mark this chat active while focused so its incoming-message banners are suppressed.
  useFocusEffect(
    useCallback(() => {
      setActiveConversationId(conversationId ?? null)
      return () => {
        setActiveConversationId(null)
        // Leaving the chat stops every player: the shared preview singleton (tracks, daily song,
        // listen-together) and any registered per-message players (voice notes).
        stopPreview()
        stopAllRegisteredAudio()
      }
    }, [conversationId]),
  )

  useEffect(() => {
    setConversationLoadFailed(false)
  }, [conversationId])

  useEffect(() => {
    if (!conversationId || conversation) {
      return
    }

    let cancelled = false

    void fetchConversationById(conversationId).then((loaded) => {
      if (!cancelled && !loaded) {
        setConversationLoadFailed(true)
      }
    })

    return () => {
      cancelled = true
    }
  }, [conversation, conversationId, fetchConversationById])

  useEffect(() => {
    let cancelled = false

    async function checkPartnerKey() {
      if (!otherParticipant?.username) {
        setHasPartnerKey(false)
        return
      }

      const publicKey = await getPublicKeyForUsername(otherParticipant.username)
      if (!cancelled) {
        setHasPartnerKey(Boolean(publicKey))
      }
    }

    void checkPartnerKey()
    return () => {
      cancelled = true
    }
  }, [getPublicKeyForUsername, otherParticipant?.username])

  useEffect(() => {
    if (!conversationId) {
      return
    }

    return chatWs.on('TYPING', (payload: {
      conversationId: string
      userId: string
      username: string
      isTyping: boolean
    }) => {
      if (payload.conversationId !== conversationId || payload.username === user?.username) {
        return
      }

      setTypingUsers(prev => {
        const next = new Map(prev)
        if (payload.isTyping) {
          next.set(payload.userId, payload.username)
        } else {
          next.delete(payload.userId)
        }
        return next
      })
    })
  }, [conversationId, user?.username])

  useEffect(() => {
    if (conversationId && conversation?.unreadCount && messages.length > 0) {
      void markConversationRead(conversationId)
    }
  }, [conversation?.unreadCount, conversationId, markConversationRead, messages.length])

  const typingUsername = Array.from(typingUsers.values())[0] ?? null
  const newestMessageKey = messages[0]?.id ?? messages[0]?.tempId

  useEffect(() => {
    if (!isNearBottom) {
      return
    }

    const frame = requestAnimationFrame(() => {
      if (!isMountedRef.current) {
        return
      }

      try {
        listRef.current?.scrollToOffset({ offset: 0, animated: true })
      } catch (error) {
        logWarn('Skipped chat auto-scroll after unmount/layout change', error)
      }
    })

    return () => cancelAnimationFrame(frame)
  }, [isNearBottom, newestMessageKey, typingUsername])

  const headerTitle = otherParticipant?.displayName || otherParticipant?.username || 'Chat'
  // Live now-playing pill (ticket 1.2): show only when the partner has a track and is playing.
  const partnerNowPlaying = otherParticipant ? getNowPlaying(otherParticipant.userId) : null
  const partnerTrack = partnerNowPlaying?.track && partnerNowPlaying.isPlaying
    ? partnerNowPlaying.track
    : null
  const lastSeenText = useMemo(() => {
    if (!otherParticipant?.lastSeenAt || isUserOnline(otherParticipant.userId)) {
      return null
    }

    const relative = timeAgo(otherParticipant.lastSeenAt)
    return relative === 'just now'
      ? 'last seen just now'
      : `last seen ${relative}`
  }, [isUserOnline, otherParticipant?.lastSeenAt, otherParticipant?.userId])

  const lastSeenMessageId = useMemo(() => {
    if (!otherParticipant?.lastReadAt || !user?.username) {
      return null
    }

    const readAt = new Date(otherParticipant.lastReadAt)
    return messages.find(message => (
      message.senderUsername === user.username
      && message.status !== 'sending'
      && new Date(message.createdAt) <= readAt
    ))?.id ?? null
  }, [messages, otherParticipant?.lastReadAt, user?.username])

  // Group consecutive messages from the same sender within the same minute: only the
  // newest message of a group (lowest index in this inverted list) shows the time/receipt.
  const showTimeForIndex = useCallback(
    (index: number) => {
      const message = messages[index]
      if (!message) return true
      const newer = messages[index - 1] // chronologically newer neighbor (inverted list)
      if (!newer) return true
      if (newer.senderUsername !== message.senderUsername) return true
      const bucket = (ts: string) => Math.floor(new Date(ts).getTime() / 60000)
      return bucket(newer.createdAt) !== bucket(message.createdAt)
    },
    [messages],
  )

  const encryptedActive = cryptoReady && hasPartnerKey
  const isPendingIncoming = conversation?.requestStatus === 'PENDING_INCOMING'
  const isPendingOutgoing = conversation?.requestStatus === 'PENDING_OUTGOING'
  const canMessage = conversation?.requestStatus === 'ACCEPTED'
  const showMessageListLoader = isLoading || isInitialLoadPending

  // Listen Together syncs full-song playback, so both people need an active Apple Music
  // subscription — the current user via canPlayFull, the partner via their cached subscription flag.
  const selfCanPlayFull = musicGate.capability.canPlayFull
  const peerHasSubscription = otherParticipant?.musicSubscriptionActive ?? false
  const listenTogetherDisabled = !selfCanPlayFull || !peerHasSubscription
  const partnerName = otherParticipant?.displayName ?? otherParticipant?.username ?? 'They'
  const listenTogetherHint = !selfCanPlayFull
    ? 'Listen Together needs an active Apple Music subscription to sync full songs.'
    : !peerHasSubscription
      ? `${partnerName} doesn’t have an active Apple Music subscription, so full songs can’t play in sync.`
      : undefined
  const renderEmptyState = () => (
    <View
      className="flex-1 items-center justify-center px-10 py-10"
      style={{ transform: [{ scaleY: -1 }] }}
    >
      {showMessageListLoader ? (
        <ChatLoadingStatus />
      ) : isPendingIncoming ? (
        <>
          <Ionicons name="mail-unread-outline" size={40} color={Colors.primary} />
          <Text className="mt-4 text-lg font-bold text-on-surface">Chat request pending</Text>
          <Text className="mt-2 text-center text-sm font-medium text-on-surface-variant">
            Accept this request to start messaging {headerTitle}.
          </Text>
        </>
      ) : isPendingOutgoing ? (
        <>
          <Ionicons name="time-outline" size={40} color={Colors.onSurfaceVariant} />
          <Text className="mt-4 text-lg font-bold text-on-surface">Waiting for a reply</Text>
          <Text className="mt-2 text-center text-sm font-medium text-on-surface-variant">
            You can message {headerTitle} after they accept your request.
          </Text>
        </>
      ) : (
        <>
          <Ionicons name="sparkles-outline" size={40} color={Colors.onSurfaceVariant} />
          <Text className="mt-4 text-lg font-bold text-on-surface">Say hello</Text>
          <Text className="mt-2 text-center text-sm font-medium text-on-surface-variant">
            Start the conversation with your first message.
          </Text>
        </>
      )}
    </View>
  )

  if (!conversationId) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <Text className="text-base font-medium text-on-surface-variant">Conversation not found.</Text>
      </View>
    )
  }

  return (
    <ChatActionsContext.Provider value={chatActions}>
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        className="flex-row items-center gap-3 border-b border-surface-container-high bg-surface px-4 pb-2"
        style={{ paddingTop: insets.top + 2 }}
      >
        <TouchableOpacity
          className="h-11 w-11 items-center justify-center rounded-full bg-surface-container"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={otherParticipant ? 0.8 : 1}
          disabled={!otherParticipant}
          onPress={() => {
            if (!otherParticipant) return
            router.push(publicProfilePath(otherParticipant.userId, '(match)') as never)
          }}
        >
          {otherParticipant?.profileImage ? (
            <Image
              source={{ uri: otherParticipant.profileImage }}
              style={{ width: 44, height: 44, borderRadius: 22 }}
              contentFit="cover"
            />
          ) : (
            <View
              className="items-center justify-center rounded-full bg-primary/10"
              style={{ width: 44, height: 44 }}
            >
              <Text className="text-base font-bold text-primary">
                {headerTitle.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1"
          activeOpacity={otherParticipant ? 0.8 : 1}
          disabled={!otherParticipant}
          onPress={() => {
            if (!otherParticipant) return
            router.push(publicProfilePath(otherParticipant.userId, '(match)') as never)
          }}
        >
          <View className="flex-row items-center gap-2">
            <Text className="text-lg font-bold text-on-surface" numberOfLines={1}>
              {headerTitle}
            </Text>
            {encryptedActive ? (
              <Ionicons name="lock-closed" size={12} color={Colors.primary} />
            ) : null}
          </View>
          {otherParticipant ? (
            isUserOnline(otherParticipant.userId) ? (
              <Text className="text-xs font-semibold text-primary">Online</Text>
            ) : lastSeenText ? (
              <Text className="text-xs font-medium text-on-surface-variant">{lastSeenText}</Text>
            ) : null
          ) : null}
          {partnerTrack ? (
            <NowPlayingPill track={partnerTrack} />
          ) : null}
        </TouchableOpacity>

        {otherParticipant ? (
          <TouchableOpacity
            className="h-11 w-11 items-center justify-center rounded-full bg-surface-container"
            accessibilityLabel="Search conversation"
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              setSearchOpen(true)
            }}
          >
            <Ionicons name="search" size={20} color={Colors.onSurface} />
          </TouchableOpacity>
        ) : null}

        {otherParticipant ? (
          <TouchableOpacity
            className="h-11 w-11 items-center justify-center rounded-full bg-surface-container"
            accessibilityLabel="Conversation options"
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              setConversationOptionsOpen(true)
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={Colors.onSurface} />
          </TouchableOpacity>
        ) : null}
      </View>

      {searchOpen && conversation ? (
        <ChatSearchPanel
          query={searchQuery}
          results={searchResults}
          isSearching={isSearching}
          onChangeQuery={setSearchQuery}
          onClose={() => {
            setSearchOpen(false)
            setSearchQuery('')
          }}
          onResultPress={handleSearchResultPress}
        />
      ) : null}

      {!conversation ? (
        <View className="flex-1 items-center justify-center">
          {conversationLoadFailed ? (
            <View className="items-center px-8">
              <Ionicons name="chatbubble-ellipses-outline" size={40} color={Colors.onSurfaceVariant} />
              <Text className="mt-4 text-lg font-bold text-on-surface">Conversation unavailable</Text>
              <Text className="mt-2 text-center text-sm font-medium text-on-surface-variant">
                This chat could not be opened from your account.
              </Text>
              <TouchableOpacity
                className="mt-6 rounded-full bg-primary px-6 py-3"
                onPress={() => router.replace('/(home)/(match)/chat')}
              >
                <Text className="text-sm font-bold text-on-primary">Back to chats</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ActivityIndicator color={Colors.primary} />
          )}
        </View>
      ) : (
        <>
          {isPendingIncoming ? (
            <View className="mx-4 mt-4 rounded-3xl bg-primary/10 p-4">
              <Text className="text-base font-bold text-on-surface">
                {headerTitle} wants to chat
              </Text>
              <Text className="mt-2 text-sm font-medium text-on-surface-variant">
                Accept to open the conversation, or deny to remove this request from your inbox.
              </Text>
              <View className="mt-4 flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 items-center justify-center rounded-2xl bg-surface px-4 py-3"
                  disabled={requestAction !== null}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                    setRequestAction('deny')
                    void denyDirectRequest(conversation.id)
                      .then(() => {
                        router.replace('/(home)/(match)/chat')
                      })
                      .catch(error => {
                        console.error('[chat] failed to deny request', error)
                      })
                      .finally(() => {
                        setRequestAction(null)
                      })
                  }}
                >
                  {requestAction === 'deny' ? (
                    <ActivityIndicator color={Colors.onSurface} />
                  ) : (
                    <Text className="text-sm font-bold text-on-surface">Deny</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 items-center justify-center rounded-2xl bg-primary px-4 py-3"
                  disabled={requestAction !== null}
                  onPress={() => {
                    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                    setRequestAction('accept')
                    void acceptDirectRequest(conversation.id)
                      .catch(error => {
                        console.error('[chat] failed to accept request', error)
                      })
                      .finally(() => {
                        setRequestAction(null)
                      })
                  }}
                >
                  {requestAction === 'accept' ? (
                    <ActivityIndicator color={Colors.onPrimary} />
                  ) : (
                    <Text className="text-sm font-bold text-on-primary">Accept</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {isPendingOutgoing ? (
            <View className="mx-4 mt-4 rounded-3xl bg-surface-container p-4">
              <Text className="text-base font-bold text-on-surface">
                Request sent
              </Text>
              <Text className="mt-2 text-sm font-medium text-on-surface-variant">
                You&apos;ll be able to send messages here after {headerTitle} accepts your request.
              </Text>
            </View>
          ) : null}

          {listenTogether.room ? (
            <ListenTogetherBar
              room={listenTogether.room}
              reactions={listenTogether.reactions}
              isPlaying={listenTogether.isPlaying}
              progress={listenTogether.progress}
              onLeave={listenTogether.leaveRoom}
              onReact={listenTogether.sendReaction}
            />
          ) : null}

          <FlatList
            ref={listRef}
            inverted
            data={messages}
            keyExtractor={item => item.tempId ? `${item.id}:${item.tempId}` : item.id}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 12,
            }}
            renderItem={({ item, index }) => (
              <MessageBubble
                message={item}
                isMine={item.senderUsername === user?.username}
                showSeen={item.id === lastSeenMessageId}
                showTime={showTimeForIndex(index)}
                onLongPress={() => setActionMessage(item)}
                onQuotePress={scrollToMessage}
                myUserId={user?.id}
                onToggleReaction={toggleReaction}
                highlighted={item.id === highlightedMessageId}
                onRetry={item.status === 'failed' && item.tempId
                  ? () => {
                      void resendMessage(item.tempId!, item.content)
                    }
                  : undefined}
              />
            )}
            ListEmptyComponent={renderEmptyState}
            ListHeaderComponent={typingUsername ? <TypingIndicator username={typingUsername} /> : null}
            ListFooterComponent={(
              <View className="pb-3 pt-2">
                {isLoadingMore ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : null}
                {!hasMore && messages.length > 0 ? (
                  <Text className="mt-3 text-center text-xs font-medium text-on-surface-variant">
                    This is the beginning of the conversation.
                  </Text>
                ) : null}
              </View>
            )}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            onEndReached={() => {
              if (hasMore && !isLoadingMore) {
                void loadMore()
              }
            }}
            onEndReachedThreshold={0.25}
            onScroll={event => {
              setIsNearBottom(event.nativeEvent.contentOffset.y < 120)
            }}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          />

          <View style={{ paddingBottom: 0 }}>
            <MessageComposer
              conversationId={conversationId}
              disabled={!canMessage}
              replyTo={replyTarget}
              onCancelReply={() => setReplyTarget(null)}
              onSend={(content) => {
                void handleComposerSend(content)
              }}
              onAttachPress={() => setAttachMenuOpen(true)}
              onCameraPress={() => {
                void captureImage()
              }}
              onVoiceNote={() => {
                setPendingVoiceBed(null)
                setVoiceRecorderOpen(true)
              }}
            />
          </View>
        </>
      )}

      <TrackPicker
        visible={trackPickerOpen}
        initialQuery={trackPickerQuery}
        previewOnly={pickerMode === 'reaction' || pickerMode === 'listen'}
        onClose={() => {
          setTrackPickerOpen(false)
          if (pickerMode === 'reaction') {
            setPendingTrackReactionMessageId(null)
            setPickerMode('send')
          }
        }}
        onSelect={handleTrackPicked}
      />

      <MusicAttachSheet
        visible={attachMenuOpen}
        onClose={() => setAttachMenuOpen(false)}
        onPickImage={() => {
          void pickImage()
        }}
        onShareSong={() => {
          setPickerMode('send')
          setTrackPickerQuery('')
          setTrackPickerOpen(true)
        }}
        onPickAlbum={() => setAlbumPickerOpen(true)}
        onPickPlaylist={activeConversationId ? () => {
          router.push({ pathname: '/(home)/(match)/chat/playlist', params: { conversationId: activeConversationId } })
        } : undefined}
        onDedicate={() => {
          setPickerMode('dedicate')
          setTrackPickerQuery('')
          setTrackPickerOpen(true)
        }}
        onDropTimestamp={() => {
          setPickerMode('timestamp')
          setTrackPickerQuery('')
          setTrackPickerOpen(true)
        }}
        onBlindListen={() => {
          setPickerMode('blind')
          setTrackPickerQuery('')
          setTrackPickerOpen(true)
        }}
        onListenTogether={() => {
          setPickerMode('listen')
          setTrackPickerQuery('')
          setTrackPickerOpen(true)
        }}
        listenTogetherDisabled={listenTogetherDisabled}
        listenTogetherHint={listenTogetherHint}
      />

      <VoiceRecorderModal
        visible={voiceRecorderOpen}
        bed={pendingVoiceBed}
        onClose={() => {
          setVoiceRecorderOpen(false)
          setPendingVoiceBed(null)
        }}
        onSend={sendVoiceNote}
      />

      <TextPromptModal
        visible={pendingDedication !== null}
        title="Add a note (optional)"
        placeholder="This made me think of you…"
        multiline
        allowEmpty
        submitLabel="Dedicate"
        onClose={() => setPendingDedication(null)}
        onSubmit={(note) => {
          if (pendingDedication) sendDedication(pendingDedication, note)
          setPendingDedication(null)
          setPickerMode('send')
        }}
      />


      <TextPromptModal
        visible={pendingTimestampTrack !== null}
        title="Start time (m:ss)"
        placeholder="1:24"
        submitLabel="Drop timestamp"
        onClose={() => setPendingTimestampTrack(null)}
        onSubmit={(text) => {
          if (pendingTimestampTrack) sendTimestamp(pendingTimestampTrack, text)
          setPendingTimestampTrack(null)
          setPickerMode('send')
        }}
      />

      <AlbumPicker
        visible={albumPickerOpen}
        onClose={() => setAlbumPickerOpen(false)}
        onSelect={(album) => {
          setAlbumPickerOpen(false)
          sendAlbum(album)
        }}
      />

      <MusicUpsellSheet
        visible={musicGate.upsell.visible}
        mode={musicGate.upsell.mode}
        action={musicGate.upsell.action}
        onClose={musicGate.closeUpsell}
      />

      <MessageActionSheet
        visible={actionMessage !== null}
        actions={messageActions}
        onReact={(emoji) => {
          if (actionMessage) toggleReaction(actionMessage.id, emoji)
        }}
        onClose={() => setActionMessage(null)}
      />

      <ConversationOptionsSheet
        visible={conversationOptionsOpen}
        muted={Boolean(conversation?.mutedUntil && new Date(conversation.mutedUntil) > new Date())}
        onClose={() => setConversationOptionsOpen(false)}
        onMuteUntil={(until) => {
          if (conversationId) {
            void setConversationMute(conversationId, until)
          }
        }}
        onSafety={() => {
          if (!otherParticipant) return
          showModerationMenu({
            targetType: 'USER',
            targetId: otherParticipant.userId,
            userId: otherParticipant.userId,
            displayName: headerTitle,
            onBlocked: () => router.replace('/(home)/(match)/chat'),
          })
        }}
      />

      <TextPromptModal
        visible={pendingEdit !== null}
        title="Edit message"
        initialValue={pendingEdit?.content ?? ''}
        multiline
        submitLabel="Save"
        onClose={() => setPendingEdit(null)}
        onSubmit={(text) => {
          if (pendingEdit) editMessage(pendingEdit.id, text)
          setPendingEdit(null)
        }}
      />
    </KeyboardAvoidingView>
    </ChatActionsContext.Provider>
  )
}
