import { useAuth, useUser } from '@clerk/expo'
import { useCallback, useEffect, useRef, useState } from 'react'
import { postMessage, fetchMessages, fetchPins, searchMessages } from '@/lib/chat-api'
import { isEncrypted } from '@/lib/chat-crypto'
import { chatWs } from '@/lib/chat-ws'
import type { Message } from '@/models/Chat'
import { useChat } from '@/hooks/useChat'

const PAGE_SIZE = 30

export function useChatMessages(
  conversationId: string | null,
  otherUsername: string | null,
) {
  const { getToken } = useAuth()
  const { user } = useUser()
  const { applyOutgoingMessage, cryptoReady, decryptForUsername, encryptForUsername } = useChat()
  const [messages, setMessages] = useState<Message[]>([])
  const [pins, setPins] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [loadedConversationId, setLoadedConversationId] = useState<string | null>(null)
  const getTokenRef = useRef(getToken)
  const decryptRef = useRef(decryptForUsername)
  const otherUsernameRef = useRef(otherUsername)
  const decryptedCacheRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  useEffect(() => {
    decryptRef.current = decryptForUsername
  }, [decryptForUsername])

  useEffect(() => {
    otherUsernameRef.current = otherUsername
  }, [otherUsername])

  useEffect(() => {
    decryptedCacheRef.current.clear()
  }, [conversationId])

  useEffect(() => {
    if (!cryptoReady || !otherUsername) {
      return
    }

    const unprocessed = messages.filter(
      message => isEncrypted(message.content) && !decryptedCacheRef.current.has(message.id),
    )
    if (unprocessed.length === 0) {
      return
    }

    let cancelled = false

    void Promise.all(
      unprocessed.map(async (message) => {
        const content = await decryptForUsername(otherUsername, message.content)
        return { id: message.id, content }
      }),
    ).then((results) => {
      if (cancelled) return
      results.forEach(r => decryptedCacheRef.current.set(r.id, r.content))
      setMessages(prev => prev.map(m => ({
        ...m,
        content: decryptedCacheRef.current.get(m.id) ?? m.content,
      })))
    })

    return () => {
      cancelled = true
    }
  }, [cryptoReady, decryptForUsername, messages, otherUsername])

  const decryptPayload = useCallback(async (message: Message) => {
    const username = otherUsernameRef.current
    if (!username || !isEncrypted(message.content)) {
      return message
    }

    const content = await decryptRef.current(username, message.content)
    return { ...message, content }
  }, [])

  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      setPins([])
      setHasMore(true)
      setLoadedConversationId(null)
      return
    }

    let cancelled = false
    const activeConversationId = conversationId
    setMessages([])
    setPins([])
    setHasMore(true)
    setLoadedConversationId(null)

    async function loadInitialMessages() {
      setIsLoading(true)
      try {
        const token = await getTokenRef.current()
        const [loaded, loadedPins] = await Promise.all([
          fetchMessages(activeConversationId, 0, PAGE_SIZE, token),
          fetchPins(activeConversationId, token),
        ])
        const [decrypted, decryptedPins] = await Promise.all([
          Promise.all(loaded.map(decryptPayload)),
          Promise.all(loadedPins.map(decryptPayload)),
        ])
        if (!cancelled) {
          setMessages(decrypted)
          setPins(decryptedPins)
          setHasMore(loaded.length === PAGE_SIZE)
          setLoadedConversationId(activeConversationId)
        }
      } catch (error) {
        console.error('[chat] failed to load messages', error)
        if (!cancelled) {
          setLoadedConversationId(activeConversationId)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadInitialMessages()
    return () => {
      cancelled = true
    }
  }, [conversationId, decryptPayload])

  useEffect(() => {
    if (!conversationId) {
      return
    }

    const unsubs = [
      chatWs.on('MESSAGE_NEW', async (payload: Message) => {
        if (payload.conversationId !== conversationId) {
          return
        }

        const nextMessage = await decryptPayload(payload)
        setMessages(prev => {
          if (prev.some(existing => existing.id === nextMessage.id)) {
            return prev
          }
          if (payload.tempId) {
            const existingIndex = prev.findIndex(existing => existing.tempId === payload.tempId)
            if (existingIndex !== -1) {
              const next = [...prev]
              next[existingIndex] = {
                ...nextMessage,
                content: next[existingIndex].content,
                status: 'sent',
              }
              return next
            }
          }
          return [nextMessage, ...prev]
        })
      }),
      chatWs.on('REACTION_UPDATE', (payload: { messageId: string; conversationId: string; reactions: { emoji: string; userId: string }[] }) => {
        if (payload.conversationId !== conversationId) {
          return
        }
        setMessages(prev => prev.map(m => (
          m.id === payload.messageId ? { ...m, reactions: payload.reactions ?? [] } : m
        )))
      }),
      chatWs.on('MESSAGE_UPDATED', (payload: Message) => {
        if (payload.conversationId !== conversationId) {
          return
        }
        // Replace an existing message in place (e.g. blind-listen reveal, ticket 4.6).
        setMessages(prev => prev.map(existing => (
          existing.id === payload.id
            ? { ...existing, ...payload, status: existing.status }
            : existing
        )))
        if (payload.isDeleted) {
          setPins(prev => prev.filter(pin => pin.id !== payload.id))
        } else {
          setPins(prev => prev.map(pin => (pin.id === payload.id ? { ...pin, ...payload } : pin)))
        }
      }),
      chatWs.on('PIN_UPDATE', async (payload: { conversationId: string; pins: Message[] }) => {
        if (payload.conversationId !== conversationId) {
          return
        }
        const decrypted = await Promise.all((payload.pins ?? []).map(decryptPayload))
        setPins(decrypted)
      }),
      chatWs.on('MESSAGE_ACK', (payload: { tempId: string; messageId: string; createdAt: string }) => {
        setMessages(prev => prev.map(message => (
          message.tempId === payload.tempId
            ? {
                ...message,
                id: payload.messageId,
                createdAt: payload.createdAt,
                status: 'sent',
              }
            : message
        )))
      }),
    ]

    return () => {
      unsubs.forEach(unsub => unsub())
    }
  }, [conversationId, decryptPayload])

  const loadMore = useCallback(async () => {
    if (!conversationId || isLoadingMore || !hasMore) {
      return
    }

    setIsLoadingMore(true)
    try {
      const token = await getTokenRef.current()
      const page = Math.floor(messages.length / PAGE_SIZE)
      const loaded = await fetchMessages(conversationId, page, PAGE_SIZE, token)
      const decrypted = await Promise.all(loaded.map(decryptPayload))
      setMessages(prev => {
        const existingIds = new Set(prev.map(message => message.id))
        const nextMessages = decrypted.filter(message => !existingIds.has(message.id))
        return [...prev, ...nextMessages]
      })
      if (loaded.length < PAGE_SIZE) {
        setHasMore(false)
      }
    } catch (error) {
      console.error('[chat] failed to load older messages', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [conversationId, decryptPayload, hasMore, isLoadingMore, messages.length])

  const loadUntilMessage = useCallback(async (messageId: string) => {
    if (!conversationId || messages.some(message => message.id === messageId)) {
      return true
    }

    let page = Math.floor(messages.length / PAGE_SIZE)
    let accumulated = messages
    try {
      while (true) {
        const token = await getTokenRef.current()
        const loaded = await fetchMessages(conversationId, page, PAGE_SIZE, token)
        const decrypted = await Promise.all(loaded.map(decryptPayload))
        const existingIds = new Set(accumulated.map(message => message.id))
        accumulated = [
          ...accumulated,
          ...decrypted.filter(message => !existingIds.has(message.id)),
        ]
        if (accumulated.some(message => message.id === messageId) || loaded.length < PAGE_SIZE) {
          break
        }
        page += 1
      }
      setMessages(accumulated)
      setHasMore(accumulated.length % PAGE_SIZE === 0)
      return accumulated.some(message => message.id === messageId)
    } catch (error) {
      console.error('[chat] failed to load pinned message', error)
      return false
    }
  }, [conversationId, decryptPayload, messages])

  const searchConversationMessages = useCallback(async (query: string) => {
    if (!conversationId) return []
    const normalized = query.trim().toLocaleLowerCase()
    if (normalized.length < 2) return []

    const token = await getTokenRef.current()
    const remote = await searchMessages(conversationId, query.trim(), token)
    const decryptedRemote = await Promise.all(remote.map(decryptPayload))
    // Recent E2E text is searchable after decryption even though the server cannot inspect it.
    const local = messages.filter(message => (
      `${message.content} ${JSON.stringify(message.payload ?? {})}`.toLocaleLowerCase().includes(normalized)
    ))
    const merged = [...local, ...decryptedRemote]
    return merged.filter((message, index) => (
      merged.findIndex(candidate => candidate.id === message.id) === index
    ))
  }, [conversationId, decryptPayload, messages])

  const sendMessage = useCallback(async (
    content: string,
    options?: {
      messageType?: string
      payload?: Record<string, unknown> | null
      replyTo?: import('@/models/Chat').ReplyStub | null
    },
  ) => {
    if (!conversationId || !user?.username) {
      return
    }

    const messageType = options?.messageType ?? 'text'
    const payload = options?.payload ?? null
    const replyTo = options?.replyTo ?? null
    const replyToId = replyTo?.id ?? null
    // Only plain-text bodies are E2E-encrypted; structured card payloads travel as-is
    // (their content field is at most a short fallback label used for inbox previews).
    const isStructured = messageType.toLowerCase() !== 'text'

    const tempId = Math.random().toString(36).slice(2)
    const optimistic: Message = {
      id: `temp-${tempId}`,
      conversationId,
      senderId: user.id,
      senderUsername: user.username,
      senderDisplayName: user.fullName ?? null,
      senderProfileImage: user.imageUrl ?? null,
      content,
      messageType,
      payload,
      isDeleted: false,
      replyToId,
      replyTo,
      createdAt: new Date().toISOString(),
      tempId,
      status: 'sending',
    }

    setMessages(prev => [optimistic, ...prev])

    try {
      const token = await getTokenRef.current()
      const outbound = otherUsername && !isStructured
        ? await encryptForUsername(otherUsername, content)
        : content
      const saved = await postMessage(conversationId, outbound, token, { messageType, payload, replyToId })

      setMessages(prev => prev.map(message => (
        message.tempId === tempId
          ? {
              ...saved,
              content,
              tempId,
              status: 'sent',
            }
          : message
      )))
      applyOutgoingMessage(saved, content)
    } catch (error) {
      console.error('[chat] failed to send message', error)
      setMessages(prev => prev.map(message => (
        message.tempId === tempId
          ? { ...message, status: 'failed' }
          : message
      )))
    }
  }, [applyOutgoingMessage, conversationId, encryptForUsername, otherUsername, user])

  const resendMessage = useCallback(async (tempId: string, content: string) => {
    setMessages(prev => prev.map(message => (
      message.tempId === tempId
        ? { ...message, status: 'sending' }
        : message
    )))

    try {
      const token = await getTokenRef.current()
      if (!conversationId) {
        return
      }

      const outbound = otherUsername
        ? await encryptForUsername(otherUsername, content)
        : content
      const saved = await postMessage(conversationId, outbound, token)
      setMessages(prev => prev.map(message => (
        message.tempId === tempId
          ? {
              ...saved,
              content,
              tempId,
              status: 'sent',
            }
          : message
      )))
      applyOutgoingMessage(saved, content)
    } catch (error) {
      console.error('[chat] failed to resend message', error)
      setMessages(prev => prev.map(message => (
        message.tempId === tempId
          ? { ...message, status: 'failed' }
          : message
      )))
    }
  }, [applyOutgoingMessage, conversationId, encryptForUsername, otherUsername])

  // Optimistically toggle my reaction on a message and sync over WS (ticket 3.2).
  const toggleReaction = useCallback((messageId: string, emoji: string) => {
    const myUserId = user?.id
    if (!myUserId) return
    let willAdd = true
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m
      const existing = m.reactions ?? []
      const mine = existing.some(r => r.emoji === emoji && r.userId === myUserId)
      willAdd = !mine
      const reactions = mine
        ? existing.filter(r => !(r.emoji === emoji && r.userId === myUserId))
        : [...existing, { emoji, userId: myUserId }]
      return { ...m, reactions }
    }))
    chatWs.send({ type: willAdd ? 'REACTION_ADD' : 'REACTION_REMOVE', messageId, emoji })
  }, [user?.id])

  // Edit / delete own messages (ticket 3.3): optimistic + WS sync.
  const editMessage = useCallback((messageId: string, content: string) => {
    const trimmed = content.trim()
    if (!trimmed) return
    setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, content: trimmed, edited: true } : m)))
    chatWs.send({ type: 'MESSAGE_EDIT', messageId, content: trimmed })
  }, [])

  const deleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, isDeleted: true } : m)))
    chatWs.send({ type: 'MESSAGE_DELETE', messageId })
  }, [])

  const togglePin = useCallback((message: Message) => {
    const isPinned = pins.some(pin => pin.id === message.id)
    setPins(prev => (
      isPinned
        ? prev.filter(pin => pin.id !== message.id)
        : [message, ...prev]
    ))
    chatWs.send({ type: isPinned ? 'PIN_REMOVE' : 'PIN_ADD', messageId: message.id })
  }, [pins])

  return {
    messages,
    pins,
    isLoading,
    isInitialLoadPending: Boolean(conversationId) && loadedConversationId !== conversationId,
    isLoadingMore,
    hasMore,
    loadMore,
    loadUntilMessage,
    searchConversationMessages,
    sendMessage,
    resendMessage,
    toggleReaction,
    editMessage,
    deleteMessage,
    togglePin,
  }
}
