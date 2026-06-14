import { useAuth, useUser } from '@clerk/expo'
import { useCallback, useEffect, useRef, useState } from 'react'
import { postMessage, fetchMessages, searchMessages } from '@/lib/chat-api'
import { isEncrypted } from '@/lib/chat-crypto'
import { chatWs } from '@/lib/chat-ws'
import type { Message, MessageReaction } from '@/models/Chat'
import type { TrackPayload } from '@/models/ChatPayloads'
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
  // Bumped to re-run the decryption pass while the crypto session / partner key are still settling
  // (e.g. a cold start from a push notification), so messages don't stay shown as ciphertext.
  const [decryptRetry, setDecryptRetry] = useState(0)
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
    setDecryptRetry(0)
  }, [conversationId])

  useEffect(() => {
    if (!cryptoReady || !otherUsername) {
      return
    }

    const unprocessed = messages.filter(
      message => (isEncrypted(message.content) || (!!message.replyTo && isEncrypted(message.replyTo.snippet)))
        && !decryptedCacheRef.current.has(message.id),
    )
    if (unprocessed.length === 0) {
      return
    }

    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    void Promise.all(
      unprocessed.map(async (message) => {
        const [content, snippet] = await Promise.all([
          isEncrypted(message.content)
            ? decryptForUsername(otherUsername, message.content)
            : Promise.resolve(message.content),
          message.replyTo && isEncrypted(message.replyTo.snippet)
            ? decryptForUsername(otherUsername, message.replyTo.snippet)
            : Promise.resolve(null),
        ])
        return { id: message.id, content, snippet }
      }),
    ).then((results) => {
      if (cancelled) return
      // Only treat a message as decrypted when nothing is still ciphertext. If the keys weren't
      // ready yet, `decryptForUsername` returns the original ciphertext — don't cache that (it would
      // freeze the message as encrypted until an app reload); leave it for a bounded retry instead.
      const resolved = results.filter(
        r => !isEncrypted(r.content) && (r.snippet == null || !isEncrypted(r.snippet)),
      )
      if (resolved.length > 0) {
        const byId = new Map(resolved.map(r => [r.id, r]))
        resolved.forEach(r => decryptedCacheRef.current.set(r.id, r.content))
        setMessages(prev => prev.map((m) => {
          const r = byId.get(m.id)
          if (!r) return m
          return {
            ...m,
            content: r.content,
            replyTo: m.replyTo && r.snippet != null
              ? { ...m.replyTo, snippet: r.snippet.length <= 80 ? r.snippet : `${r.snippet.slice(0, 80)}…` }
              : m.replyTo,
          }
        }))
      }
      // Some still couldn't be decrypted (keys settling on cold start) — retry a few times.
      if (resolved.length < results.length && decryptRetry < 8) {
        retryTimer = setTimeout(() => setDecryptRetry(n => n + 1), 600)
      }
    })

    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [cryptoReady, decryptForUsername, messages, otherUsername, decryptRetry])

  const decryptPayload = useCallback(async (message: Message) => {
    const username = otherUsernameRef.current
    if (!username) {
      return message
    }

    // The reply preview's snippet is the referenced message's ciphertext, so it needs decrypting
    // too — independently of this message's own content (e.g. an image reply to a text message).
    const contentEncrypted = isEncrypted(message.content)
    const snippetEncrypted = !!message.replyTo && isEncrypted(message.replyTo.snippet)
    if (!contentEncrypted && !snippetEncrypted) {
      return message
    }

    const [content, snippet] = await Promise.all([
      contentEncrypted ? decryptRef.current(username, message.content) : Promise.resolve(message.content),
      snippetEncrypted ? decryptRef.current(username, message.replyTo!.snippet) : Promise.resolve(null),
    ])

    const next: Message = { ...message, content }
    if (snippetEncrypted && snippet != null && message.replyTo) {
      next.replyTo = { ...message.replyTo, snippet: snippet.length <= 80 ? snippet : `${snippet.slice(0, 80)}…` }
    }
    return next
  }, [])

  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      setHasMore(true)
      setLoadedConversationId(null)
      return
    }

    let cancelled = false
    const activeConversationId = conversationId
    setMessages([])
    setHasMore(true)
    setLoadedConversationId(null)

    async function loadInitialMessages() {
      setIsLoading(true)
      try {
        const token = await getTokenRef.current()
        const loaded = await fetchMessages(activeConversationId, 0, PAGE_SIZE, token)
        const decrypted = await Promise.all(loaded.map(decryptPayload))
        if (!cancelled) {
          setMessages(decrypted)
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
      chatWs.on('REACTION_UPDATE', (payload: { messageId: string; conversationId: string; reactions: MessageReaction[] }) => {
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
        setMessages(prev => {
          const existing = prev.find(message => message.id === payload.id)
          if (!existing && payload.messageType?.toUpperCase() === 'COLLAB_PLAYLIST') {
            return [payload, ...prev]
          }
          return prev.map(message => (
            message.id === payload.id
              ? { ...message, ...payload, status: message.status }
              : message
          ))
        })
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
      console.error('[chat] failed to load message', error)
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
      mediaUrl?: string | null
      replyTo?: import('@/models/Chat').ReplyStub | null
    },
  ) => {
    if (!conversationId || !user?.username) {
      return
    }

    const messageType = options?.messageType ?? 'text'
    const payload = options?.payload ?? null
    const mediaUrl = options?.mediaUrl ?? null
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
      mediaUrl,
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
      const saved = await postMessage(conversationId, outbound, token, {
        messageType,
        payload,
        replyToId,
        mediaUrl,
      })

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
      const mine = existing.some(r => (r.type ?? 'emoji') === 'emoji' && r.emoji === emoji && r.userId === myUserId)
      willAdd = !mine
      const reactions = mine
        ? existing.filter(r => !((r.type ?? 'emoji') === 'emoji' && r.emoji === emoji && r.userId === myUserId))
        : [...existing, { type: 'emoji' as const, emoji, userId: myUserId }]
      return { ...m, reactions }
    }))
    chatWs.send({ type: willAdd ? 'REACTION_ADD' : 'REACTION_REMOVE', messageId, emoji })
  }, [user?.id])

  const toggleTrackReaction = useCallback((messageId: string, track: TrackPayload) => {
    const myUserId = user?.id
    if (!myUserId || !track.id || !track.previewUrl) return
    let willAdd = true
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m
      const existing = m.reactions ?? []
      const mine = existing.some(r => r.type === 'track' && r.track?.id === track.id && r.userId === myUserId)
      willAdd = !mine
      const reactions = mine
        ? existing.filter(r => !(r.type === 'track' && r.track?.id === track.id && r.userId === myUserId))
        : [...existing, { type: 'track' as const, track, userId: myUserId }]
      return { ...m, reactions }
    }))
    chatWs.send({
      type: willAdd ? 'REACTION_TRACK_ADD' : 'REACTION_TRACK_REMOVE',
      messageId,
      track: willAdd ? track : undefined,
      trackId: track.id,
    })
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

  return {
    messages,
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
    toggleTrackReaction,
    editMessage,
    deleteMessage,
  }
}
