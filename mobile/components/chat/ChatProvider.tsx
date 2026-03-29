import { useAuth } from '@clerk/expo'
import { AppState, type AppStateStatus } from 'react-native'
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { BackendUser } from '@/lib/api'
import {
  acceptConversationRequest,
  denyConversationRequest,
  fetchConversation,
  fetchConversations,
  fetchPublicKey as fetchRemotePublicKey,
  markRead,
  searchUsers,
  startConversation,
  uploadPublicKey,
} from '@/lib/chat-api'
import { useMatchStore } from '@/store/matchStore'
import {
  decryptMessage,
  encryptMessage,
  ensureKeyPair,
  isEncrypted,
  type ChatKeyPair,
} from '@/lib/chat-crypto'
import { chatWs } from '@/lib/chat-ws'
import type { Conversation, Message, PresenceStatus } from '@/models/Chat'

const PAGE_SIZE = 20

interface ChatContextValue {
  conversations: Conversation[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  totalUnread: number
  cryptoReady: boolean
  refreshConversations: () => Promise<void>
  loadMoreConversations: () => Promise<void>
  fetchConversationById: (conversationId: string) => Promise<Conversation | null>
  startDirectConversation: (targetUserId: string) => Promise<Conversation>
  acceptDirectRequest: (conversationId: string) => Promise<Conversation>
  denyDirectRequest: (conversationId: string) => Promise<void>
  searchChatUsers: (query: string, limit?: number) => Promise<BackendUser[]>
  markConversationRead: (conversationId: string) => Promise<void>
  upsertConversation: (conversation: Conversation, moveToTop?: boolean) => void
  applyOutgoingMessage: (message: Message, preview?: string) => void
  isUserOnline: (userId: string) => boolean
  getPublicKeyForUsername: (username: string) => Promise<string | null>
  encryptForUsername: (username: string, plaintext: string) => Promise<string>
  decryptForUsername: (username: string, content: string) => Promise<string>
}

export const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const getTokenRef = useRef(getToken)
  const cursorRef = useRef<string | undefined>(undefined)
  const publicKeyCacheRef = useRef(new Map<string, string>())
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [keyPair, setKeyPair] = useState<ChatKeyPair | null>(null)
  const [cryptoReady, setCryptoReady] = useState(false)

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  const upsertConversation = useCallback((conversation: Conversation, moveToTop: boolean = true) => {
    setConversations(prev => {
      const next = [...prev]
      const index = next.findIndex(existing => existing.id === conversation.id)

      if (index !== -1) {
        const merged = {
          ...next[index],
          ...conversation,
        }
        next.splice(index, 1)
        if (moveToTop) {
          next.unshift(merged)
        } else {
          next.splice(index, 0, merged)
        }
        return next
      }

      if (moveToTop) {
        return [conversation, ...next]
      }

      return [...next, conversation]
    })
  }, [])

  const removeConversation = useCallback((conversationId: string) => {
    setConversations(prev => prev.filter(conversation => conversation.id !== conversationId))
  }, [])

  const refreshConversations = useCallback(async () => {
    setIsLoading(true)
    cursorRef.current = undefined

    try {
      const token = await getTokenRef.current()
      if (!token) {
        setConversations([])
        setHasMore(false)
        return
      }

      const loaded = await fetchConversations(token, undefined, PAGE_SIZE)
      setConversations(loaded)
      setHasMore(loaded.length === PAGE_SIZE)
      cursorRef.current = loaded.length > 0
        ? (loaded[loaded.length - 1].updatedAt ?? loaded[loaded.length - 1].createdAt)
        : undefined
    } catch (error) {
      console.error('[chat] failed to refresh conversations', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadMoreConversations = useCallback(async () => {
    if (isLoadingMore || !hasMore) {
      return
    }

    setIsLoadingMore(true)
    try {
      const token = await getTokenRef.current()
      if (!token) {
        return
      }

      const loaded = await fetchConversations(token, cursorRef.current, PAGE_SIZE)
      setConversations(prev => [...prev, ...loaded])
      setHasMore(loaded.length === PAGE_SIZE)
      cursorRef.current = loaded.length > 0
        ? (loaded[loaded.length - 1].updatedAt ?? loaded[loaded.length - 1].createdAt)
        : cursorRef.current
    } catch (error) {
      console.error('[chat] failed to load more conversations', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [hasMore, isLoadingMore])

  const fetchConversationById = useCallback(async (conversationId: string) => {
    try {
      const token = await getTokenRef.current()
      if (!token) {
        return null
      }

      const conversation = await fetchConversation(conversationId, token)
      upsertConversation(conversation)
      return conversation
    } catch (error) {
      console.error('[chat] failed to hydrate conversation', error)
      return null
    }
  }, [upsertConversation])

  const startDirectConversation = useCallback(async (targetUserId: string) => {
    const token = await getTokenRef.current()
    if (!token) {
      throw new Error('Missing auth token')
    }

    const conversation = await startConversation(targetUserId, token)
    upsertConversation(conversation)
    return conversation
  }, [upsertConversation])

  const acceptDirectRequest = useCallback(async (conversationId: string) => {
    const token = await getTokenRef.current()
    if (!token) {
      throw new Error('Missing auth token')
    }

    const conversation = await acceptConversationRequest(conversationId, token)
    upsertConversation(conversation)
    return conversation
  }, [upsertConversation])

  const denyDirectRequest = useCallback(async (conversationId: string) => {
    const token = await getTokenRef.current()
    if (!token) {
      throw new Error('Missing auth token')
    }

    await denyConversationRequest(conversationId, token)
    removeConversation(conversationId)
  }, [removeConversation])

  const searchChatUsers = useCallback(async (query: string, limit: number = 10) => {
    const token = await getTokenRef.current()
    return searchUsers(query, token, limit)
  }, [])

  const markConversationRead = useCallback(async (conversationId: string) => {
    try {
      const token = await getTokenRef.current()
      await markRead(conversationId, token)
      chatWs.send({ type: 'READ_RECEIPT', conversationId })

      setConversations(prev => prev.map(conversation => (
        conversation.id === conversationId
          ? { ...conversation, unreadCount: 0 }
          : conversation
      )))
    } catch (error) {
      console.error('[chat] failed to mark conversation read', error)
    }
  }, [])

  const applyOutgoingMessage = useCallback((message: Message, preview: string = message.content) => {
    setConversations(prev => {
      const next = [...prev]
      const index = next.findIndex(conversation => conversation.id === message.conversationId)
      if (index === -1) {
        void fetchConversationById(message.conversationId)
        return prev
      }

      const updated = {
        ...next[index],
        lastMessage: preview,
        lastMessageAt: message.createdAt,
        updatedAt: message.createdAt,
      }
      next.splice(index, 1)
      next.unshift(updated)
      return next
    })
  }, [fetchConversationById])

  const fetchPublicKeyForUsername = useCallback(async (username: string, forceRefresh: boolean = false) => {
    if (!forceRefresh) {
      const cachedKey = publicKeyCacheRef.current.get(username)
      if (cachedKey) {
        return cachedKey
      }
    }

    const token = await getTokenRef.current()
    const publicKey = await fetchRemotePublicKey(username, token)
    if (publicKey) {
      publicKeyCacheRef.current.set(username, publicKey)
      return publicKey
    }

    publicKeyCacheRef.current.delete(username)
    return null
  }, [])

  const getPublicKeyForUsername = useCallback(async (username: string) => {
    return fetchPublicKeyForUsername(username)
  }, [fetchPublicKeyForUsername])

  const encryptForUsername = useCallback(async (username: string, plaintext: string) => {
    if (!keyPair || !cryptoReady) {
      return plaintext
    }

    const publicKey = await fetchPublicKeyForUsername(username)
    if (!publicKey) {
      return plaintext
    }

    return encryptMessage(keyPair.privateKey, publicKey, plaintext)
  }, [cryptoReady, fetchPublicKeyForUsername, keyPair])

  const decryptForUsername = useCallback(async (username: string, content: string) => {
    if (!keyPair || !isEncrypted(content)) {
      return content
    }

    let publicKey = await fetchPublicKeyForUsername(username)
    if (!publicKey) {
      return content
    }

    try {
      return await decryptMessage(keyPair.privateKey, publicKey, content)
    } catch {
      publicKeyCacheRef.current.delete(username)
      publicKey = await fetchPublicKeyForUsername(username, true)
      if (!publicKey) {
        return '[Encrypted message]'
      }

      try {
        return await decryptMessage(keyPair.privateKey, publicKey, content)
      } catch {
        return '[Encrypted message]'
      }
    }
  }, [fetchPublicKeyForUsername, keyPair])

  const isUserOnline = useCallback((userId: string) => onlineUsers.has(userId), [onlineUsers])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setConversations([])
      setHasMore(false)
      setOnlineUsers(new Set())
      publicKeyCacheRef.current.clear()
      setKeyPair(null)
      setCryptoReady(false)
      chatWs.disconnect()
      return
    }

    void refreshConversations()
  }, [isLoaded, isSignedIn, refreshConversations])

  useEffect(() => {
    if (!isSignedIn) {
      return
    }

    let cancelled = false

    async function initCrypto() {
      try {
        const pair = await ensureKeyPair()
        if (cancelled) {
          return
        }

        setKeyPair(pair)

        const token = await getTokenRef.current()
        if (token) {
          await uploadPublicKey(pair.publicKey, token)
        }

        if (!cancelled) {
          setCryptoReady(true)
        }
      } catch (error) {
        console.error('[chat] failed to initialise crypto', error)
        if (!cancelled) {
          setCryptoReady(false)
        }
      }
    }

    void initCrypto()
    return () => {
      cancelled = true
    }
  }, [isSignedIn])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return
    }

    const tokenProvider = () => getTokenRef.current()
    chatWs.connect(tokenProvider)

    const appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        chatWs.connect(tokenProvider)
      } else if (state === 'background' || state === 'inactive') {
        chatWs.disconnect(false)
      }
    })

    return () => {
      appStateSubscription.remove()
    }
  }, [isLoaded, isSignedIn])

  useEffect(() => {
    const unsubs = [
      chatWs.on('PRESENCE', (payload: { userId: string; status: PresenceStatus }) => {
        setOnlineUsers(prev => {
          const next = new Set(prev)
          if (payload.status === 'online') {
            next.add(payload.userId)
          } else {
            next.delete(payload.userId)
          }
          return next
        })
      }),
      chatWs.on('MESSAGE_NEW', (payload: Message) => {
        setConversations(prev => {
          const next = [...prev]
          const index = next.findIndex(conversation => conversation.id === payload.conversationId)
          if (index === -1) {
            void fetchConversationById(payload.conversationId)
            return prev
          }

          const updated = {
            ...next[index],
            lastMessage: payload.content,
            lastMessageAt: payload.createdAt,
            updatedAt: payload.createdAt,
            unreadCount: next[index].unreadCount + 1,
          }
          next.splice(index, 1)
          next.unshift(updated)
          return next
        })
      }),
      chatWs.on('READ', (payload: { conversationId: string; userId: string; readAt: string }) => {
        setConversations(prev => prev.map(conversation => (
          conversation.id === payload.conversationId
            ? {
                ...conversation,
                participants: conversation.participants.map(participant => (
                  participant.userId === payload.userId
                    ? { ...participant, lastReadAt: payload.readAt }
                    : participant
                )),
              }
            : conversation
        )))
      }),
      chatWs.on('MATCH_NEW', (payload: {
        matchId: string
        conversationId: string
        otherUserId: string
        otherUsername: string
        otherDisplayName: string
        otherProfileImage: string
      }) => {
        useMatchStore.getState().setPendingMatchModal({
          matchId: payload.matchId,
          otherUserId: payload.otherUserId,
          otherUsername: payload.otherUsername,
          otherDisplayName: payload.otherDisplayName || null,
          otherProfileImage: payload.otherProfileImage || null,
          conversationId: payload.conversationId,
          status: 'ACTIVE',
          matchedAt: new Date().toISOString(),
          unreadCount: 0,
        })
        useMatchStore.getState().addMatch({
          matchId: payload.matchId,
          otherUserId: payload.otherUserId,
          otherUsername: payload.otherUsername,
          otherDisplayName: payload.otherDisplayName || null,
          otherProfileImage: payload.otherProfileImage || null,
          conversationId: payload.conversationId,
          status: 'ACTIVE',
          matchedAt: new Date().toISOString(),
          unreadCount: 0,
        })
        void fetchConversationById(payload.conversationId)
      }),
    ]

    return () => {
      unsubs.forEach(unsub => unsub())
    }
  }, [fetchConversationById])

  const totalUnread = useMemo(
    () => conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0),
    [conversations],
  )

  const value = useMemo<ChatContextValue>(() => ({
    conversations,
    isLoading,
    isLoadingMore,
    hasMore,
    totalUnread,
    cryptoReady,
    refreshConversations,
    loadMoreConversations,
    fetchConversationById,
    startDirectConversation,
    acceptDirectRequest,
    denyDirectRequest,
    searchChatUsers,
    markConversationRead,
    upsertConversation,
    applyOutgoingMessage,
    isUserOnline,
    getPublicKeyForUsername,
    encryptForUsername,
    decryptForUsername,
  }), [
    conversations,
    isLoading,
    isLoadingMore,
    hasMore,
    totalUnread,
    cryptoReady,
    refreshConversations,
    loadMoreConversations,
    fetchConversationById,
    startDirectConversation,
    acceptDirectRequest,
    denyDirectRequest,
    searchChatUsers,
    markConversationRead,
    upsertConversation,
    applyOutgoingMessage,
    isUserOnline,
    getPublicKeyForUsername,
    encryptForUsername,
    decryptForUsername,
  ])

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}
