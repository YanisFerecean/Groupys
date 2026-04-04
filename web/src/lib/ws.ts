import { WsInbound, WsOutbound } from "@/types/chat";

type GetToken = () => Promise<string | null>;

export class ChatWebSocketClient {
  private ws: WebSocket | null = null;
  private getToken: GetToken | null = null;
  private backoff = 1000;
  private maxBackoff = 30000;
  private isConnecting = false;
  private isIntentionalClose = false;

  private messageQueue: WsOutbound[] = [];
  private hasConnectedBefore = false;
  private isAuthenticated = false;

  // Handlers for specific event types
  private handlers: Map<string, Array<(payload: unknown) => void>> = new Map();

  constructor(private url: string) {}

  public connect(getToken: GetToken) {
    this.getToken = getToken;

    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.isIntentionalClose = false;

    // Use ws:// if on localhost/dev, otherwise wss://
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const wsProtocol = isLocalhost ? "ws://" : "wss://";

    // Fallback URL if env var not set
    const baseUrl = this.url || `${wsProtocol}${window.location.host}/api/ws/chat`;

    // Ensure we don't duplicate the wss:// if it's already in this.url
    const wsUrl = baseUrl.startsWith("ws") ? baseUrl : `${wsProtocol}${baseUrl.replace(/^https?:\/\//, "")}`;

    console.log("[WS] Connecting to:", wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        console.log("[WS] Connected");
        this.isConnecting = false;
        this.isAuthenticated = false;
        this.backoff = 1000;

        // Fetch a fresh token on every (re)connect so it's never expired
        try {
          const token = await this.getToken!();
          if (!token) {
            console.error("[WS] No token available, closing");
            this.ws?.close();
            return;
          }
          // AUTH must be the first message — token is sent in the message body, not the URL
          // SYNC and queue flush happen only after AUTH_OK to avoid racing with AUTH processing
          this.ws!.send(JSON.stringify({ type: "AUTH", token }));
        } catch (e) {
          console.error("[WS] Failed to get token for AUTH:", e);
          this.ws?.close();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: WsInbound = JSON.parse(event.data);
          console.log("[WS Inbound]", msg.type);

          if (msg.type === "AUTH_OK") {
            // Server confirmed auth — now safe to send SYNC and flush queued messages
            this.isAuthenticated = true;
            if (this.hasConnectedBefore) {
              this.ws!.send(JSON.stringify({ type: "SYNC" }));
            }
            this.hasConnectedBefore = true;
            this.flushQueue();
            return;
          }

          this.emit(msg.type, msg.payload || msg);
        } catch (_err) {
          console.error("[WS] Failed to parse message:", event.data);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`[WS] Closed. Code: ${event.code}, Reason: ${event.reason}`);
        this.ws = null;
        this.isConnecting = false;
        this.isAuthenticated = false;

        if (!this.isIntentionalClose) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error("[WS] Error:", error);
      };
    } catch (err) {
      console.error("[WS] Failed to construct WebSocket:", err);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    this.isIntentionalClose = true;
    this.isAuthenticated = false;
    this.hasConnectedBefore = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private static readonly EPHEMERAL_TYPES = new Set(["TYPING_START", "TYPING_STOP"]);

  public send(msg: WsOutbound) {
    if (this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated) {
      console.log("[WS Outbound]", msg.type);
      this.ws.send(JSON.stringify(msg));
    } else if (!ChatWebSocketClient.EPHEMERAL_TYPES.has(msg.type)) {
      if (this.messageQueue.length < 100) {
        console.log("[WS] Queueing message (not connected or not yet authed)");
        this.messageQueue.push(msg);
      }
    }
  }

  public on<T = unknown>(type: string, handler: (payload: T) => void): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler as (payload: unknown) => void);

    // Return unsubscribe function
    return () => {
      const arr = this.handlers.get(type);
      if (arr) {
        this.handlers.set(type, arr.filter((h) => h !== (handler as (payload: unknown) => void)));
      }
    };
  }

  private emit(type: string, payload: unknown) {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.forEach((handler) => handler(payload));
    }
  }

  private flushQueue() {
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      if (msg) this.send(msg);
    }
  }

  private scheduleReconnect() {
    if (this.isIntentionalClose || !this.getToken) return;

    console.log(`[WS] Reconnecting in ${this.backoff}ms...`);
    setTimeout(() => {
      if (this.getToken) this.connect(this.getToken);
    }, this.backoff);

    // Exponential backoff
    this.backoff = Math.min(this.backoff * 2, this.maxBackoff);
  }
}

// Ensure the URL aligns with your Quarkus setup: process.env.NEXT_PUBLIC_WS_URL ideally,
// but fallback to the backend host
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/api/ws/chat";

// Export a singleton instance
export const chatWs = new ChatWebSocketClient(WS_URL);
