import { WsInbound, WsOutbound } from "@/types/chat";

export class ChatWebSocketClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private backoff = 1000;
  private maxBackoff = 30000;
  private isConnecting = false;
  private isIntentionalClose = false;

  private messageQueue: WsOutbound[] = [];
  
  // Handlers for specific event types
  private handlers: Map<string, Array<(payload: any) => void>> = new Map();

  constructor(private url: string) {}

  public connect(token: string) {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.token = token;
    this.isConnecting = true;
    this.isIntentionalClose = false;

    // Use ws:// if on localhost/dev, otherwise wss://
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const wsProtocol = isLocalhost ? "ws://" : "wss://";
    
    // Fallback URL if env var not set
    const baseUrl = this.url || `${wsProtocol}${window.location.host}/api/ws/chat`;
    
    // Ensure we don't duplicate the wss:// if it's already in this.url
    const wsUrl = baseUrl.startsWith('ws') ? baseUrl : `${wsProtocol}${baseUrl.replace(/^https?:\/\//, '')}`;
    
    const urlWithToken = `${wsUrl}?token=${encodeURIComponent(token)}`;

    console.log("[WS] Connecting to:", urlWithToken.split('?')[0]); // Hide token in logs

    try {
      this.ws = new WebSocket(urlWithToken);

      this.ws.onopen = () => {
        console.log("[WS] Connected");
        this.isConnecting = false;
        this.backoff = 1000; // Reset backoff
        this.flushQueue();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: WsInbound = JSON.parse(event.data);
          console.log("[WS Inbound]", msg.type, msg.payload || msg);
          this.emit(msg.type, msg.payload || msg);
        } catch (err) {
          console.error("[WS] Failed to parse message:", event.data);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`[WS] Closed. Code: ${event.code}, Reason: ${event.reason}`);
        this.ws = null;
        this.isConnecting = false;
        
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public send(msg: WsOutbound) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log("[WS Outbound]", msg);
      this.ws.send(JSON.stringify(msg));
    } else {
      console.log("[WS] Queueing message (not connected)");
      this.messageQueue.push(msg);
    }
  }

  public on(type: string, handler: (payload: any) => void) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
    
    // Return unsubscribe function
    return () => {
      const arr = this.handlers.get(type);
      if (arr) {
        this.handlers.set(type, arr.filter(h => h !== handler));
      }
    };
  }

  private emit(type: string, payload: any) {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.forEach(handler => handler(payload));
    }
  }

  private flushQueue() {
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      if (msg) this.send(msg);
    }
  }

  private scheduleReconnect() {
    if (this.isIntentionalClose || !this.token) return;
    
    console.log(`[WS] Reconnecting in ${this.backoff}ms...`);
    setTimeout(() => {
      if (this.token) this.connect(this.token);
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
