import { API_URL } from '@/lib/api'
import type { WsInbound, WsOutbound } from '@/models/Chat'

type GetToken = () => Promise<string | null>

function deriveWsUrl() {
  if (process.env.EXPO_PUBLIC_WS_URL) {
    return process.env.EXPO_PUBLIC_WS_URL
  }

  const baseUrl = API_URL.replace(/\/api\/?$/, '')
  const wsBase = baseUrl
    .replace(/^http:\/\//, 'ws://')
    .replace(/^https:\/\//, 'wss://')

  return `${wsBase}/api/ws/chat`
}

export class ChatWebSocketClient {
  private ws: WebSocket | null = null
  private getToken: GetToken | null = null
  private backoff = 1000
  private readonly maxBackoff = 30000
  private isConnecting = false
  private isIntentionalClose = false
  private isAuthenticated = false
  private hasConnectedBefore = false
  private messageQueue: WsOutbound[] = []
  private readonly handlers = new Map<string, Array<(payload: unknown) => void>>()

  constructor(private readonly url: string) {}

  connect(getToken: GetToken) {
    this.getToken = getToken

    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return
    }

    this.isConnecting = true
    this.isIntentionalClose = false

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = async () => {
        this.isConnecting = false
        this.isAuthenticated = false
        this.backoff = 1000

        try {
          const token = await this.getToken?.()
          if (!token) {
            this.ws?.close()
            return
          }

          this.ws?.send(JSON.stringify({ type: 'AUTH', token }))
        } catch (error) {
          console.error('[chat-ws] auth failed', error)
          this.ws?.close()
        }
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WsInbound

          if (message.type === 'AUTH_OK') {
            this.isAuthenticated = true
            if (this.hasConnectedBefore) {
              this.ws?.send(JSON.stringify({ type: 'SYNC' }))
            }
            this.hasConnectedBefore = true
            this.flushQueue()
            return
          }

          this.emit(message.type, message.payload ?? message)
        } catch (error) {
          console.error('[chat-ws] failed to parse message', error)
        }
      }

      this.ws.onclose = () => {
        this.ws = null
        this.isConnecting = false
        this.isAuthenticated = false

        if (!this.isIntentionalClose) {
          this.scheduleReconnect()
        }
      }

      this.ws.onerror = (error) => {
        console.error('[chat-ws] websocket error', error)
      }
    } catch (error) {
      console.error('[chat-ws] failed to connect', error)
      this.isConnecting = false
      this.scheduleReconnect()
    }
  }

  disconnect(resetSession: boolean = true) {
    this.isIntentionalClose = true
    this.isAuthenticated = false
    if (resetSession) {
      this.hasConnectedBefore = false
      this.messageQueue = []
    }
    this.ws?.close()
    this.ws = null
  }

  send(message: WsOutbound) {
    if (this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated) {
      this.ws.send(JSON.stringify(message))
      return
    }

    if (!ChatWebSocketClient.EPHEMERAL_TYPES.has(message.type)) {
      this.messageQueue.push(message)
    }
  }

  on<T = unknown>(type: string, handler: (payload: T) => void): () => void {
    const handlers = this.handlers.get(type) ?? []
    handlers.push(handler as (payload: unknown) => void)
    this.handlers.set(type, handlers)

    return () => {
      const currentHandlers = this.handlers.get(type) ?? []
      this.handlers.set(
        type,
        currentHandlers.filter(existing => existing !== handler),
      )
    }
  }

  private emit(type: string, payload: unknown) {
    for (const handler of this.handlers.get(type) ?? []) {
      handler(payload)
    }
  }

  private flushQueue() {
    while (this.messageQueue.length > 0) {
      const next = this.messageQueue.shift()
      if (next) {
        this.send(next)
      }
    }
  }

  private scheduleReconnect() {
    if (this.isIntentionalClose || !this.getToken) {
      return
    }

    setTimeout(() => {
      if (this.getToken) {
        this.connect(this.getToken)
      }
    }, this.backoff)

    this.backoff = Math.min(this.backoff * 2, this.maxBackoff)
  }

  private static readonly EPHEMERAL_TYPES = new Set(['TYPING_START', 'TYPING_STOP'])
}

export const chatWs = new ChatWebSocketClient(deriveWsUrl())
