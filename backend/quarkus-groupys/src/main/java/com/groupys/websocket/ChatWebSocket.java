package com.groupys.websocket;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.groupys.dto.MessageResDto;
import com.groupys.model.User;
import com.groupys.repository.UserRepository;
import com.groupys.service.ChatService;
import com.groupys.service.ListeningRoomService;
import com.groupys.service.NotificationService;
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
import org.owasp.encoder.Encode;

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

    // Now-playing broadcast throttle (ticket 1.1): one fan-out per user per window unless the track changes.
    private static final long NOW_PLAYING_THROTTLE_MS = 5000;
    private static final ConcurrentHashMap<UUID, Long> lastNowPlayingMs = new ConcurrentHashMap<>();
    private static final ConcurrentHashMap<UUID, String> lastNowPlayingKey = new ConcurrentHashMap<>();


    @Inject
    PresenceService presenceService;

    @Inject
    ListeningRoomService listeningRoomService;

    @Inject
    ChatService chatService;

    @Inject
    NotificationService notificationService;

    @Inject
    UserRepository userRepository;

    @Inject
    JWTParser jwtParser;

    private final ObjectMapper mapper = createSecureObjectMapper();

    /**
     * Creates a secure ObjectMapper with safe defaults to prevent deserialization attacks.
     */
    private static ObjectMapper createSecureObjectMapper() {
        ObjectMapper om = new ObjectMapper();
        // Disable default typing to prevent deserialization attacks
        om.deactivateDefaultTyping();
        // Don't fail on unknown properties - safer for forward compatibility
        om.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        return om;
    }
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
            case "NOW_PLAYING_UPDATE"  -> handleNowPlayingUpdate(user, msg);
            case "NOW_PLAYING_REQUEST" -> handleNowPlayingRequest(connection, user);
            case "BLIND_GUESS"         -> handleBlindGuess(connection, user, msg);
            case "REACTION_ADD"        -> handleReaction(connection, user, msg, true);
            case "REACTION_REMOVE"     -> handleReaction(connection, user, msg, false);
            case "MESSAGE_EDIT"        -> handleMessageEdit(connection, user, msg);
            case "MESSAGE_DELETE"      -> handleMessageDelete(connection, user, msg);
            case "PIN_ADD"             -> handlePin(connection, user, msg, true);
            case "PIN_REMOVE"          -> handlePin(connection, user, msg, false);
            case "ROOM_JOIN"           -> handleRoomJoin(connection, user, msg);
            case "ROOM_STATE"          -> handleRoomState(user, msg);
            case "ROOM_LEAVE"          -> handleRoomLeave(user, msg);
            case "REACTION_FLOAT"      -> handleReactionFloat(user, msg);
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
                        // Withdraw now-playing presence when the user goes fully offline (ticket 1.1).
                        if (presenceService.getNowPlaying(clerkId) != null) {
                            presenceService.clearNowPlaying(clerkId);
                            broadcastNowPlaying(user, null, false);
                        }
                        lastNowPlayingMs.remove(user.id);
                        lastNowPlayingKey.remove(user.id);
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
        String messageType = (String) msg.get("messageType");
        String replyToIdStr = (String) msg.get("replyToId");
        Object payloadObj = msg.get("payload");

        // Serialise the structured payload (if any) back to a raw JSON string for the service.
        String payloadJson = null;
        if (payloadObj != null) {
            try {
                payloadJson = mapper.writeValueAsString(payloadObj);
            } catch (Exception e) {
                sendJson(connection, WebSocketMessage.error("Invalid message payload"));
                return;
            }
        }

        if (convIdStr == null || (content == null && payloadJson == null)) {
            sendJson(connection, WebSocketMessage.error("conversationId and content/payload required"));
            return;
        }

        UUID conversationId;
        try {
            conversationId = UUID.fromString(convIdStr);
        } catch (IllegalArgumentException e) {
            sendJson(connection, WebSocketMessage.error("Invalid conversationId"));
            return;
        }

        UUID replyToId = null;
        if (replyToIdStr != null && !replyToIdStr.isBlank()) {
            try {
                replyToId = UUID.fromString(replyToIdStr);
            } catch (IllegalArgumentException ignored) {
                // ignore malformed reply id
            }
        }

        MessageResDto saved;
        try {
            saved = chatService.sendMessage(conversationId, sender.clerkId, content, messageType, payloadJson, replyToId);
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
        String deeplink = "/(home)/(match)/chat/" + saved.conversationId();
        String senderName = saved.senderDisplayName() != null && !saved.senderDisplayName().isBlank()
                ? saved.senderDisplayName() : saved.senderUsername();

        chatService.getParticipantClerkIds(conversationId).forEach((pid, participantClerkId) -> {
            if (!pid.equals(sender.id)) {
                presenceService.sendTo(participantClerkId, json);
                NotificationService.Content pushContent = NotificationService.Content
                        .of(senderName, "Sent you a message", deeplink)
                        .withImage(saved.senderProfileImage());
                if (!chatService.isConversationMuted(conversationId, pid)) {
                    notificationService.notify(pid, NotificationService.Type.MESSAGE, pushContent);
                }
            }
        });
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

        chatService.getParticipantClerkIds(conversationId).forEach((pid, clerkId) -> {
            if (!pid.equals(user.id)) presenceService.sendTo(clerkId, json);
        });
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
        } catch (Exception e) {
            LOG.warnf("markRead failed for conversation %s: %s", conversationId, e.getMessage());
            return;
        }

        String readAt = Instant.now().toString();
        String json = toJson(WebSocketMessage.readReceipt(conversationId, user.id.toString(), readAt));

        chatService.getParticipantClerkIds(conversationId).forEach((pid, clerkId) -> {
            if (!pid.equals(user.id)) presenceService.sendTo(clerkId, json);
        });
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

    // -- Edit / delete (ticket 3.3) --------------------------------------------

    private void handleMessageEdit(WebSocketConnection connection, User user, Map<String, Object> msg) {
        UUID messageId = parseMessageId(connection, msg);
        if (messageId == null) return;
        String content = (String) msg.get("content");
        MessageResDto updated;
        try {
            updated = chatService.editMessage(messageId, user.clerkId, content);
        } catch (jakarta.ws.rs.WebApplicationException e) {
            sendJson(connection, WebSocketMessage.error(e.getMessage()));
            return;
        } catch (Exception e) {
            sendJson(connection, WebSocketMessage.error("Internal error"));
            return;
        }
        broadcastMessageUpdated(updated);
    }

    private void handleMessageDelete(WebSocketConnection connection, User user, Map<String, Object> msg) {
        UUID messageId = parseMessageId(connection, msg);
        if (messageId == null) return;
        MessageResDto updated;
        try {
            updated = chatService.deleteMessageAndReturn(messageId, user.clerkId);
        } catch (jakarta.ws.rs.WebApplicationException e) {
            sendJson(connection, WebSocketMessage.error(e.getMessage()));
            return;
        } catch (Exception e) {
            sendJson(connection, WebSocketMessage.error("Internal error"));
            return;
        }
        broadcastMessageUpdated(updated);
    }

    private UUID parseMessageId(WebSocketConnection connection, Map<String, Object> msg) {
        String idStr = (String) msg.get("messageId");
        if (idStr == null) {
            sendJson(connection, WebSocketMessage.error("messageId required"));
            return null;
        }
        try {
            return UUID.fromString(idStr);
        } catch (IllegalArgumentException e) {
            sendJson(connection, WebSocketMessage.error("Invalid messageId"));
            return null;
        }
    }

    private void broadcastMessageUpdated(MessageResDto updated) {
        String json = toJson(WebSocketMessage.messageUpdated(buildMessageData(updated, null)));
        chatService.getParticipantClerkIds(updated.conversationId())
                .forEach((pid, clerkId) -> presenceService.sendTo(clerkId, json));
    }

    // -- Pins (ticket 3.4) -----------------------------------------------------

    private void handlePin(WebSocketConnection connection, User user, Map<String, Object> msg, boolean add) {
        UUID messageId = parseMessageId(connection, msg);
        if (messageId == null) return;

        UUID conversationId;
        try {
            conversationId = add
                    ? chatService.pinMessage(messageId, user.clerkId).conversationId()
                    : chatService.unpinMessage(messageId, user.clerkId);
        } catch (jakarta.ws.rs.WebApplicationException e) {
            sendJson(connection, WebSocketMessage.error(e.getMessage()));
            return;
        } catch (Exception e) {
            LOG.errorf(e, "Failed to update pin");
            sendJson(connection, WebSocketMessage.error("Internal error"));
            return;
        }

        List<Map<String, Object>> pins = chatService.getPins(conversationId, user.clerkId).stream()
                .map(pin -> buildMessageData(pin, null))
                .toList();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("conversationId", conversationId.toString());
        payload.put("pins", pins);
        String json = toJson(new WebSocketMessage("PIN_UPDATE", payload));
        chatService.getParticipantClerkIds(conversationId)
                .forEach((pid, clerkId) -> presenceService.sendTo(clerkId, json));
    }

    // -- Reactions (ticket 3.2) ------------------------------------------------

    private void handleReaction(WebSocketConnection connection, User user, Map<String, Object> msg, boolean add) {
        String messageIdStr = (String) msg.get("messageId");
        String emoji = (String) msg.get("emoji");
        if (messageIdStr == null || emoji == null) {
            sendJson(connection, WebSocketMessage.error("messageId and emoji required"));
            return;
        }
        UUID messageId;
        try {
            messageId = UUID.fromString(messageIdStr);
        } catch (IllegalArgumentException e) {
            sendJson(connection, WebSocketMessage.error("Invalid messageId"));
            return;
        }

        MessageResDto updated;
        try {
            updated = add ? chatService.addReaction(messageId, user.clerkId, emoji)
                          : chatService.removeReaction(messageId, user.clerkId, emoji);
        } catch (jakarta.ws.rs.ForbiddenException e) {
            sendJson(connection, WebSocketMessage.error("Not a participant in this conversation"));
            return;
        } catch (Exception e) {
            LOG.errorf(e, "Failed to update reaction");
            sendJson(connection, WebSocketMessage.error("Internal error"));
            return;
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("messageId", messageId.toString());
        payload.put("conversationId", updated.conversationId().toString());
        payload.put("reactions", updated.reactions());
        String json = toJson(new WebSocketMessage("REACTION_UPDATE", payload));
        chatService.getParticipantClerkIds(updated.conversationId())
                .forEach((pid, clerkId) -> presenceService.sendTo(clerkId, json));
    }

    // -- Listen Together (ticket 7.1) ------------------------------------------
    // Only playback metadata (track ref / position / play-pause) is relayed — never audio.

    private UUID parseConversationId(WebSocketConnection connection, Map<String, Object> msg) {
        String convIdStr = (String) msg.get("conversationId");
        if (convIdStr == null) return null;
        try {
            return UUID.fromString(convIdStr);
        } catch (IllegalArgumentException e) {
            if (connection != null) sendJson(connection, WebSocketMessage.error("Invalid conversationId"));
            return null;
        }
    }

    private boolean isParticipant(UUID conversationId, User user) {
        return chatService.getParticipantClerkIds(conversationId).containsValue(user.clerkId);
    }

    private void relayToRoom(UUID conversationId, User sender, String json) {
        chatService.getParticipantClerkIds(conversationId).forEach((pid, clerkId) -> {
            if (!pid.equals(sender.id)) presenceService.sendTo(clerkId, json);
        });
    }

    private void handleRoomJoin(WebSocketConnection connection, User user, Map<String, Object> msg) {
        UUID conversationId = parseConversationId(connection, msg);
        if (conversationId == null || !isParticipant(conversationId, user)) return;
        listeningRoomService.join(conversationId.toString(), user.clerkId);

        // Send current room state to the joiner so they can sync immediately.
        ListeningRoomService.Room room = listeningRoomService.get(conversationId.toString());
        if (room != null && room.track != null && room.hostClerkId != null) {
            sendJson(connection, new WebSocketMessage("ROOM_STATE", roomStatePayload(conversationId, room)));
        }
    }

    private void handleRoomState(User user, Map<String, Object> msg) {
        UUID conversationId = parseConversationId(null, msg);
        if (conversationId == null || !isParticipant(conversationId, user)) return;

        Map<String, Object> track = (msg.get("track") instanceof Map<?, ?> raw) ? sanitizeTrack(raw) : null;
        long positionMs = toLong(msg.get("positionMs"));
        boolean isPlaying = Boolean.TRUE.equals(msg.get("isPlaying"));

        listeningRoomService.updateState(conversationId.toString(), user.clerkId, user.id.toString(),
                track, positionMs, isPlaying);

        ListeningRoomService.Room room = listeningRoomService.get(conversationId.toString());
        String json = toJson(new WebSocketMessage("ROOM_STATE", roomStatePayload(conversationId, room)));
        relayToRoom(conversationId, user, json);
    }

    private void handleRoomLeave(User user, Map<String, Object> msg) {
        UUID conversationId = parseConversationId(null, msg);
        if (conversationId == null) return;
        listeningRoomService.leave(conversationId.toString(), user.clerkId);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("conversationId", conversationId.toString());
        payload.put("userId", user.id.toString());
        relayToRoom(conversationId, user, toJson(new WebSocketMessage("ROOM_LEAVE", payload)));
    }

    private void handleReactionFloat(User user, Map<String, Object> msg) {
        UUID conversationId = parseConversationId(null, msg);
        if (conversationId == null || !isParticipant(conversationId, user)) return;
        String emoji = (String) msg.get("emoji");
        if (emoji == null || emoji.length() > 8) return;
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("conversationId", conversationId.toString());
        payload.put("userId", user.id.toString());
        payload.put("emoji", emoji);
        relayToRoom(conversationId, user, toJson(new WebSocketMessage("REACTION_FLOAT", payload)));
    }

    private Map<String, Object> roomStatePayload(UUID conversationId, ListeningRoomService.Room room) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("conversationId", conversationId.toString());
        payload.put("hostUserId", room.hostUserId);
        payload.put("track", room.track);
        payload.put("positionMs", room.positionMs);
        payload.put("isPlaying", room.isPlaying);
        payload.put("updatedAt", room.updatedAt);
        return payload;
    }

    private long toLong(Object value) {
        if (value instanceof Number n) return n.longValue();
        if (value instanceof String s) {
            try { return Long.parseLong(s); } catch (NumberFormatException e) { return 0L; }
        }
        return 0L;
    }

    // -- Blind listen (ticket 4.6) ---------------------------------------------

    private void handleBlindGuess(WebSocketConnection connection, User user, Map<String, Object> msg) {
        String messageIdStr = (String) msg.get("messageId");
        String guess = (String) msg.get("guess");
        if (messageIdStr == null) {
            sendJson(connection, WebSocketMessage.error("messageId required"));
            return;
        }
        UUID messageId;
        try {
            messageId = UUID.fromString(messageIdStr);
        } catch (IllegalArgumentException e) {
            sendJson(connection, WebSocketMessage.error("Invalid messageId"));
            return;
        }

        MessageResDto updated;
        try {
            updated = chatService.revealBlindListen(messageId, user.clerkId, guess);
        } catch (jakarta.ws.rs.ForbiddenException e) {
            sendJson(connection, WebSocketMessage.error("Not a participant in this conversation"));
            return;
        } catch (jakarta.ws.rs.WebApplicationException e) {
            sendJson(connection, WebSocketMessage.error(e.getMessage()));
            return;
        } catch (Exception e) {
            LOG.errorf(e, "Failed to reveal blind listen");
            sendJson(connection, WebSocketMessage.error("Internal error"));
            return;
        }

        // Broadcast the revealed card to all participants (including the guesser) so both update.
        String json = toJson(WebSocketMessage.messageUpdated(buildMessageData(updated, null)));
        chatService.getParticipantClerkIds(updated.conversationId())
                .forEach((pid, clerkId) -> presenceService.sendTo(clerkId, json));
    }

    // -- Now-playing (ticket 1.1) ----------------------------------------------

    private void handleNowPlayingUpdate(User user, Map<String, Object> msg) {
        // Privacy + capability gate: must opt-in and have a connected Apple Music account.
        boolean canShare = user.shareNowPlaying
                && user.appleMusicUserToken != null && !user.appleMusicUserToken.isBlank();
        if (!canShare) {
            // Withdraw any previously broadcast now-playing.
            if (presenceService.getNowPlaying(user.clerkId) != null) {
                presenceService.clearNowPlaying(user.clerkId);
                broadcastNowPlaying(user, null, false);
            }
            lastNowPlayingMs.remove(user.id);
            lastNowPlayingKey.remove(user.id);
            return;
        }

        Map<String, Object> track = (msg.get("track") instanceof Map<?, ?> raw) ? sanitizeTrack(raw) : null;
        boolean isPlaying = Boolean.TRUE.equals(msg.get("isPlaying"));

        String key = (track != null ? track.get("id") + "|" + track.get("title") : "null") + "|" + isPlaying;
        long now = System.currentTimeMillis();
        boolean changed = !key.equals(lastNowPlayingKey.get(user.id));
        Long prevMs = lastNowPlayingMs.get(user.id);
        if (!changed && prevMs != null && now - prevMs < NOW_PLAYING_THROTTLE_MS) {
            return; // throttle rapid identical updates
        }
        lastNowPlayingMs.put(user.id, now);
        lastNowPlayingKey.put(user.id, key);

        Map<String, Object> stored = new LinkedHashMap<>();
        stored.put("userId", user.id.toString());
        stored.put("track", track);
        stored.put("isPlaying", isPlaying);
        presenceService.setNowPlaying(user.clerkId, stored);

        broadcastNowPlaying(user, track, isPlaying);
    }

    private void handleNowPlayingRequest(WebSocketConnection connection, User user) {
        for (String partnerClerkId : chatService.getNowPlayingAudienceClerkIds(user.clerkId)) {
            Map<String, Object> stored = presenceService.getNowPlaying(partnerClerkId);
            if (stored == null) continue;
            String userId = (String) stored.get("userId");
            @SuppressWarnings("unchecked")
            Map<String, Object> track = (Map<String, Object>) stored.get("track");
            boolean isPlaying = Boolean.TRUE.equals(stored.get("isPlaying"));
            sendJson(connection, WebSocketMessage.nowPlaying(userId, track, isPlaying));
        }
    }

    private void broadcastNowPlaying(User user, Map<String, Object> track, boolean isPlaying) {
        String json = toJson(WebSocketMessage.nowPlaying(user.id.toString(), track, isPlaying));
        chatService.getNowPlayingAudienceClerkIds(user.clerkId)
                .forEach(clerkId -> presenceService.sendTo(clerkId, json));
    }

    private Map<String, Object> sanitizeTrack(Map<?, ?> raw) {
        String title = sanitizeForHtml(asString(raw.get("title")));
        if (title == null || title.isBlank()) {
            return null; // a track with no title is meaningless
        }
        Map<String, Object> track = new LinkedHashMap<>();
        track.put("id", asString(raw.get("id")));
        track.put("title", title);
        track.put("artist", sanitizeForHtml(asString(raw.get("artist"))));
        track.put("album", sanitizeForHtml(asString(raw.get("album"))));
        track.put("artworkUrl", asString(raw.get("artworkUrl")));
        return track;
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
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
        } catch (Exception e) {
            LOG.debugf("Failed to close WS connection cleanly: %s", e.getMessage());
        }
    }

    private Map<String, Object> buildMessageData(MessageResDto m, String tempId) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", m.id().toString());
        data.put("conversationId", m.conversationId().toString());
        data.put("senderId", m.senderId().toString());
        data.put("senderUsername", sanitizeForHtml(m.senderUsername()));
        data.put("senderDisplayName", sanitizeForHtml(m.senderDisplayName()));
        data.put("senderProfileImage", m.senderProfileImage());
        // Sanitize message content to prevent XSS
        data.put("content", sanitizeForHtml(m.content()));
        data.put("messageType", m.messageType());
        data.put("isDeleted", m.isDeleted());
        data.put("edited", m.edited());
        if (m.payload() != null) {
            data.put("payload", m.payload());
        }
        if (m.replyToId() != null) {
            data.put("replyToId", m.replyToId().toString());
        }
        if (m.replyTo() != null) {
            data.put("replyTo", m.replyTo());
        }
        if (m.reactions() != null && !m.reactions().isEmpty()) {
            data.put("reactions", m.reactions());
        }
        data.put("createdAt", m.createdAt().toString());
        if (tempId != null && !tempId.isEmpty()) {
            data.put("tempId", tempId);
        }
        return data;
    }

    /**
     * Sanitizes a string for safe HTML output by escaping special characters.
     * This prevents XSS attacks by encoding HTML entities.
     */
    private String sanitizeForHtml(String input) {
        if (input == null) {
            return null;
        }
        // Use OWASP Encoder to HTML-encode the content
        return Encode.forHtml(input);
    }
}
