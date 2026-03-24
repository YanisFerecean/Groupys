package com.groupys.websocket;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.groupys.dto.MessageResDto;
import com.groupys.model.User;
import com.groupys.repository.UserRepository;
import com.groupys.service.ChatService;
import com.groupys.service.PresenceService;
import io.quarkus.arc.Arc;
import io.quarkus.websockets.next.*;
import io.smallrye.common.annotation.Blocking;
import io.smallrye.jwt.auth.principal.JWTParser;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.jboss.logging.Logger;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@WebSocket(path = "/ws/chat")
@ApplicationScoped
public class ChatWebSocket {

    private static final Logger LOG = Logger.getLogger(ChatWebSocket.class);

    // Map connection ID -> clerkId for lookup on close/error
    private static final ConcurrentHashMap<String, String> sessionToClerk = new ConcurrentHashMap<>();

    @Inject
    PresenceService presenceService;

    @Inject
    ChatService chatService;

    @Inject
    UserRepository userRepository;

    @Inject
    JWTParser jwtParser;

    private final ObjectMapper mapper = new ObjectMapper();

    // -- Lifecycle -------------------------------------------------------------

    @OnOpen
    @Blocking
    public void onOpen(WebSocketConnection connection) {
        String token = extractToken(connection.handshakeRequest().query());
        if (token == null) {
            closeWithError(connection, "Missing token");
            return;
        }

        String clerkId;
        User user;
        try {
            JsonWebToken jwt = jwtParser.parse(token);
            clerkId = jwt.getSubject();
            user = userRepository.findByClerkId(clerkId)
                    .orElseThrow(() -> new IllegalStateException("User not found"));
        } catch (Exception e) {
            LOG.warnf("Invalid WS token: %s", e.getMessage());
            closeWithError(connection, "Invalid or expired token");
            return;
        }

        presenceService.register(clerkId, connection);
        sessionToClerk.put(connection.id(), clerkId);
        LOG.infof("WS connected (Next): %s (%s)", user.username, connection.id());

        // Broadcast online presence
        broadcastPresence(user, true);
    }

    @OnTextMessage
    @Blocking
    public void onMessage(String rawMessage, WebSocketConnection connection) {
        String clerkId = sessionToClerk.get(connection.id());
        if (clerkId == null) return;

        User user = userRepository.findByClerkId(clerkId).orElse(null);
        if (user == null) return;

        Map<String, Object> msg;
        try {
            //noinspection unchecked
            msg = mapper.readValue(rawMessage, Map.class);
        } catch (Exception e) {
            sendJson(connection, WebSocketMessage.error("Invalid JSON"));
            return;
        }

        String type = (String) msg.get("type");
        if (type == null) {
            sendJson(connection, WebSocketMessage.error("Missing type field"));
            return;
        }

        switch (type) {
            case "MESSAGE_SEND" -> handleMessageSend(connection, user, msg);
            case "TYPING_START" -> handleTyping(user, msg, true);
            case "TYPING_STOP"  -> handleTyping(user, msg, false);
            case "READ_RECEIPT" -> handleReadReceipt(user, msg);
            default -> sendJson(connection, WebSocketMessage.error("Unknown message type: " + type));
        }
    }

    @OnClose
    @Blocking
    public void onClose(WebSocketConnection connection) {
        String clerkId = sessionToClerk.remove(connection.id());
        if (clerkId == null) return;

        presenceService.remove(clerkId);
        LOG.infof("WS closed for clerkId=%s", clerkId);

        userRepository.findByClerkId(clerkId).ifPresent(user -> {
            try {
                Arc.container().instance(ChatWebSocket.class).get().updateLastSeen(user.id);
                broadcastPresence(user, false);
            } catch (Exception e) {
                LOG.warnf("Failed to update lastSeenAt for %s: %s", clerkId, e.getMessage());
            }
        });
    }

    @OnError
    @Blocking
    public void onError(WebSocketConnection connection, Throwable error) {
        LOG.errorf(error, "WS error on session %s", connection.id());
        onClose(connection);
    }

    @Transactional
    public void updateLastSeen(UUID userId) {
        userRepository.findByIdOptional(userId).ifPresent(u -> u.lastSeenAt = Instant.now());
    }

    // -- Message handlers ------------------------------------------------------

    private void handleMessageSend(WebSocketConnection connection, User sender, Map<String, Object> msg) {
        String convIdStr = (String) msg.get("conversationId");
        String content = (String) msg.get("content");
        String tempId = (String) msg.getOrDefault("tempId", "");

        if (convIdStr == null || content == null) {
            sendJson(connection, WebSocketMessage.error("conversationId and content required"));
            return;
        }

        UUID conversationId;
        try {
            conversationId = UUID.fromString(convIdStr);
        } catch (IllegalArgumentException e) {
            sendJson(connection, WebSocketMessage.error("Invalid conversationId"));
            return;
        }

        MessageResDto saved;
        try {
            saved = chatService.sendMessage(conversationId, sender.clerkId, content);
        } catch (jakarta.ws.rs.ForbiddenException e) {
            sendJson(connection, WebSocketMessage.error("Not a participant in this conversation"));
            return;
        } catch (jakarta.ws.rs.BadRequestException e) {
            sendJson(connection, WebSocketMessage.error(e.getMessage()));
            return;
        } catch (Exception e) {
            LOG.errorf(e, "Failed to persist message");
            sendJson(connection, WebSocketMessage.error("Internal error sending message"));
            return;
        }

        // ACK to sender
        sendJson(connection, WebSocketMessage.messageAck(tempId, saved.id(), saved.createdAt().toString()));

        // Broadcast MESSAGE_NEW
        Map<String, Object> messageData = buildMessageData(saved, tempId);
        String json = toJson(WebSocketMessage.messageNew(messageData));

        List<UUID> participantIds = chatService.getParticipantUserIds(conversationId);
        for (UUID pid : participantIds) {
            if (!pid.equals(sender.id)) {
                String participantClerkId = chatService.getClerkIdByUserId(pid);
                if (participantClerkId != null) {
                    presenceService.sendTo(participantClerkId, json);
                }
            }
        }
    }

    private void handleTyping(User user, Map<String, Object> msg, boolean isTyping) {
        String convIdStr = (String) msg.get("conversationId");
        if (convIdStr == null) return;

        UUID conversationId;
        try {
            conversationId = UUID.fromString(convIdStr);
        } catch (IllegalArgumentException e) { return; }

        String json = toJson(WebSocketMessage.typing(
                conversationId, user.id.toString(), user.username, isTyping));

        List<UUID> participantIds = chatService.getParticipantUserIds(conversationId);
        for (UUID pid : participantIds) {
            if (!pid.equals(user.id)) {
                String clerkId = chatService.getClerkIdByUserId(pid);
                if (clerkId != null) presenceService.sendTo(clerkId, json);
            }
        }
    }

    private void handleReadReceipt(User user, Map<String, Object> msg) {
        String convIdStr = (String) msg.get("conversationId");
        if (convIdStr == null) return;

        UUID conversationId;
        try {
            conversationId = UUID.fromString(convIdStr);
        } catch (IllegalArgumentException e) { return; }

        try {
            chatService.markRead(conversationId, user.clerkId);
        } catch (Exception ignored) { return; }

        String readAt = Instant.now().toString();
        String json = toJson(WebSocketMessage.readReceipt(conversationId, user.id.toString(), readAt));

        List<UUID> participantIds = chatService.getParticipantUserIds(conversationId);
        for (UUID pid : participantIds) {
            if (!pid.equals(user.id)) {
                String clerkId = chatService.getClerkIdByUserId(pid);
                if (clerkId != null) presenceService.sendTo(clerkId, json);
            }
        }
    }

    // -- Helpers ---------------------------------------------------------------

    private void broadcastPresence(User user, boolean online) {
        String json = toJson(online
                ? WebSocketMessage.presenceOnline(user.id.toString(), user.username)
                : WebSocketMessage.presenceOffline(user.id.toString(), user.username));

        chatService.getConversations(user.clerkId).stream()
                .flatMap(c -> c.participants().stream())
                .map(p -> chatService.getClerkIdByUserId(p.userId()))
                .filter(Objects::nonNull)
                .filter(clerkId -> !clerkId.equals(user.clerkId))
                .distinct()
                .forEach(clerkId -> presenceService.sendTo(clerkId, json));
    }

    private void sendJson(WebSocketConnection connection, WebSocketMessage message) {
        try {
            connection.sendTextAndAwait(mapper.writeValueAsString(message));
        } catch (Exception e) {
            LOG.warnf("Failed to send WS message: %s", e.getMessage());
        }
    }

    private String toJson(WebSocketMessage message) {
        try {
            return mapper.writeValueAsString(message);
        } catch (JsonProcessingException e) {
            return "{\"type\":\"ERROR\",\"payload\":{\"message\":\"serialisation error\"}}";
        }
    }

    private String extractToken(String query) {
        if (query == null) return null;
        for (String param : query.split("&")) {
            if (param.startsWith("token=")) {
                return param.substring("token=".length());
            }
        }
        return null;
    }

    private void closeWithError(WebSocketConnection connection, String reason) {
        try {
            connection.sendTextAndAwait(toJson(WebSocketMessage.error(reason)));
            connection.close();
        } catch (Exception ignored) {}
    }

    private Map<String, Object> buildMessageData(MessageResDto m, String tempId) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", m.id().toString());
        data.put("conversationId", m.conversationId().toString());
        data.put("senderId", m.senderId().toString());
        data.put("senderUsername", m.senderUsername());
        data.put("senderDisplayName", m.senderDisplayName());
        data.put("senderProfileImage", m.senderProfileImage());
        data.put("content", m.content());
        data.put("messageType", m.messageType());
        data.put("createdAt", m.createdAt().toString());
        if (tempId != null && !tempId.isEmpty()) {
            data.put("tempId", tempId);
        }
        return data;
    }
}
