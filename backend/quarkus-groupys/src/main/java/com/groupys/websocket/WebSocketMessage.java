package com.groupys.websocket;

import java.util.Map;
import java.util.UUID;

/**
 * JSON envelope for all WebSocket messages (inbound and outbound).
 */
public record WebSocketMessage(
        String type,
        Map<String, Object> payload
) {
    // ── Outbound factory helpers ──────────────────────────────────────────────

    public static WebSocketMessage presenceOnline(String userId, String username) {
        return new WebSocketMessage("PRESENCE", Map.of(
                "userId", userId,
                "username", username,
                "status", "online"
        ));
    }

    public static WebSocketMessage presenceOffline(String userId, String username) {
        return new WebSocketMessage("PRESENCE", Map.of(
                "userId", userId,
                "username", username,
                "status", "offline"
        ));
    }

    public static WebSocketMessage messageNew(Map<String, Object> messageData) {
        return new WebSocketMessage("MESSAGE_NEW", messageData);
    }

    public static WebSocketMessage messageAck(String tempId, UUID messageId, String createdAt) {
        return new WebSocketMessage("MESSAGE_ACK", Map.of(
                "tempId", tempId != null ? tempId : "",
                "messageId", messageId.toString(),
                "createdAt", createdAt
        ));
    }

    public static WebSocketMessage typing(UUID conversationId, String userId, String username, boolean isTyping) {
        return new WebSocketMessage("TYPING", Map.of(
                "conversationId", conversationId.toString(),
                "userId", userId,
                "username", username,
                "isTyping", isTyping
        ));
    }

    public static WebSocketMessage readReceipt(UUID conversationId, String userId, String readAt) {
        return new WebSocketMessage("READ", Map.of(
                "conversationId", conversationId.toString(),
                "userId", userId,
                "readAt", readAt
        ));
    }

    public static WebSocketMessage authOk() {
        return new WebSocketMessage("AUTH_OK", Map.of());
    }

    public static WebSocketMessage error(String message) {
        return new WebSocketMessage("ERROR", Map.of("message", message));
    }
}
