package com.groupys.websocket;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.groupys.dto.MessageResDto;
import com.groupys.model.User;
import com.groupys.repository.UserRepository;
import com.groupys.service.ChatService;
import com.groupys.service.PresenceService;
import io.quarkus.arc.Arc;
import io.quarkus.runtime.ShutdownEvent;
import io.quarkus.websockets.next.*;
import jakarta.enterprise.context.control.ActivateRequestContext;
import jakarta.enterprise.event.Observes;
import io.smallrye.common.annotation.Blocking;
import io.smallrye.jwt.auth.principal.JWTParser;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.jboss.logging.Logger;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@WebSocket(path = "/ws/chat")
@ApplicationScoped
public class ChatWebSocket {

    private static final Logger LOG = Logger.getLogger(ChatWebSocket.class);

    // Map connection ID -> clerkId for authenticated sessions
    private static final ConcurrentHashMap<String, String> sessionToClerk = new ConcurrentHashMap<>();

    // Connections that have opened but not yet sent a valid AUTH message
    private static final ConcurrentHashMap<String, WebSocketConnection> pendingAuth = new ConcurrentHashMap<>();

    private static final ScheduledExecutorService authTimeoutScheduler =
            Executors.newSingleThreadScheduledExecutor();


    @Inject
    PresenceService presenceService;

    @Inject
    ChatService chatService;

    @Inject
    UserRepository userRepository;

    @Inject
    JWTParser jwtParser;

    private final ObjectMapper mapper = new ObjectMapper();
    private volatile boolean shuttingDown;

    void onShutdown(@Observes ShutdownEvent event) {
        shuttingDown = true;
    }

    // -- Lifecycle -------------------------------------------------------------

    @OnOpen
    public void onOpen(WebSocketConnection connection) {
        pendingAuth.put(connection.id(), connection);
        // Close unauthenticated connections after 10 seconds
        authTimeoutScheduler.schedule(() -> {
            if (pendingAuth.remove(connection.id()) != null) {
                closeWithError(connection, "Authentication timeout");
            }
        }, 10, TimeUnit.SECONDS);
    }

    @OnTextMessage
    @Blocking
    @ActivateRequestContext
    public void onMessage(String rawMessage, WebSocketConnection connection) {
        // If this connection hasn't authenticated yet, the first message must be AUTH
        if (pendingAuth.containsKey(connection.id())) {
            handleAuth(rawMessage, connection);
            return;
        }

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
            case "SYNC"         -> handleSync(connection, user);
            default -> sendJson(connection, WebSocketMessage.error("Unknown message type: " + type));
        }
    }

    @OnClose
    @Blocking
    @ActivateRequestContext
    public void onClose(WebSocketConnection connection) {
        pendingAuth.remove(connection.id()); // no-op if already authenticated
        String clerkId = sessionToClerk.remove(connection.id());
        if (clerkId == null) return;

        presenceService.remove(clerkId, connection); // conditional: won't wipe a newer connection
        LOG.infof("WS closed for clerkId=%s", clerkId);

        if (shuttingDown) {
            return;
        }

        // Only update lastSeen and broadcast offline if no other tab is still connected
        if (!presenceService.isOnline(clerkId)) {
            try {
                userRepository.findByClerkId(clerkId).ifPresent(user -> {
                    try {
                        Arc.container().instance(ChatWebSocket.class).get().updateLastSeen(user.id);
                        broadcastPresence(user, false);
                    } catch (Exception e) {
                        LOG.warnf("Failed to update lastSeenAt for %s: %s", clerkId, e.getMessage());
                    }
                });
            } catch (Exception e) {
                LOG.debugf("Skipping offline cleanup for %s: %s", clerkId, e.getMessage());
            }
        }
    }

    @OnError
    @Blocking
    @ActivateRequestContext
    public void onError(WebSocketConnection connection, Throwable error) {
        if (shuttingDown) {
            LOG.debugf("Ignoring WS error on session %s during shutdown: %s", connection.id(), error.getMessage());
            return;
        }
        LOG.errorf(error, "WS error on session %s", connection.id());
        onClose(connection);
    }

    @Transactional
    public void updateLastSeen(UUID userId) {
        userRepository.findByIdOptional(userId).ifPresent(u -> u.lastSeenAt = Instant.now());
    }

    // -- Message handlers ------------------------------------------------------

    private void handleAuth(String rawMessage, WebSocketConnection connection) {
        Map<String, Object> msg;
        try {
            //noinspection unchecked
            msg = mapper.readValue(rawMessage, Map.class);
        } catch (Exception e) {
            closeWithError(connection, "Invalid JSON");
            return;
        }

        if (!"AUTH".equals(msg.get("type"))) {
            closeWithError(connection, "First message must be AUTH");
            return;
        }

        String token = (String) msg.get("token");
        if (token == null || token.isBlank()) {
            closeWithError(connection, "Missing token");
            return;
        }

        String clerkId;
        User user;
        try {
            JsonWebToken jwt = jwtParser.parse(token);
            clerkId = jwt.getSubject();
            user = userRepository.findByClerkId(clerkId)
                    .orElseThrow(() -> new IllegalStateException("User not found: " + clerkId));
        } catch (Exception e) {
            LOG.warnf("WS auth failed [%s]: %s", e.getClass().getSimpleName(), e.getMessage());
            closeWithError(connection, "Invalid or expired token");
            return;
        }

        pendingAuth.remove(connection.id());
        presenceService.register(clerkId, connection);
        sessionToClerk.put(connection.id(), clerkId);
        LOG.infof("WS authenticated: %s (%s)", user.username, connection.id());
        sendJson(connection, WebSocketMessage.authOk());
        broadcastPresence(user, true);
    }

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

    private void handleSync(WebSocketConnection connection, User user) {
        if (user.lastSeenAt == null) return;

        Instant cap = Instant.now().minus(24, ChronoUnit.HOURS);
        Instant since = user.lastSeenAt.isBefore(cap) ? cap : user.lastSeenAt;

        List<MessageResDto> missed = chatService.getMissedMessages(user.clerkId, since);
        for (MessageResDto msg : missed) {
            Map<String, Object> data = buildMessageData(msg, null);
            sendJson(connection, WebSocketMessage.messageNew(data));
        }
        LOG.infof("Sync: pushed %d missed message(s) to %s", missed.size(), user.username);
    }

    // -- Helpers ---------------------------------------------------------------

    private void broadcastPresence(User user, boolean online) {
        String json = toJson(online
                ? WebSocketMessage.presenceOnline(user.id.toString(), user.username)
                : WebSocketMessage.presenceOffline(user.id.toString(), user.username));

        chatService.getConversationPartnerClerkIds(user.clerkId)
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
