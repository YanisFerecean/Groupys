package com.groupys.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.groupys.config.PerformanceFeatureFlags;
import com.groupys.dto.ConversationResDto;
import com.groupys.dto.MessageResDto;
import com.groupys.dto.ParticipantDto;
import com.groupys.model.Conversation;
import com.groupys.model.ConversationParticipant;
import com.groupys.model.Message;
import com.groupys.model.MessageType;
import com.groupys.model.User;
import com.groupys.model.Friendship;
import com.groupys.repository.ConversationRepository;
import com.groupys.repository.FriendshipRepository;
import com.groupys.repository.MessageRepository;
import com.groupys.repository.UserBlockRepository;
import com.groupys.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class ChatService {

    private static final String REQUEST_STATUS_ACCEPTED = "ACCEPTED";
    private static final String REQUEST_STATUS_PENDING = "PENDING";
    private static final String REQUEST_STATUS_PENDING_INCOMING = "PENDING_INCOMING";
    private static final String REQUEST_STATUS_PENDING_OUTGOING = "PENDING_OUTGOING";

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final FriendshipRepository friendshipRepository;
    private final UserBlockRepository userBlockRepository;
    private final DiscoveryService discoveryService;
    private final PerformanceFeatureFlags flags;
    private final ChatRedisStateService chatRedisStateService;
    private final RateLimitingService rateLimitingService;
    private final ObjectMapper objectMapper;

    @Inject
    public ChatService(
            ConversationRepository conversationRepository,
            MessageRepository messageRepository,
            UserRepository userRepository,
            FriendshipRepository friendshipRepository,
            UserBlockRepository userBlockRepository,
            DiscoveryService discoveryService,
            PerformanceFeatureFlags flags,
            ChatRedisStateService chatRedisStateService,
            RateLimitingService rateLimitingService,
            ObjectMapper objectMapper) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.friendshipRepository = friendshipRepository;
        this.userBlockRepository = userBlockRepository;
        this.discoveryService = discoveryService;
        this.flags = flags;
        this.chatRedisStateService = chatRedisStateService;
        this.rateLimitingService = rateLimitingService;
        this.objectMapper = objectMapper;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    User requireUserByClerkId(String clerkId) {
        return userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    void requireParticipant(UUID conversationId, UUID userId) {
        conversationRepository.findParticipant(conversationId, userId)
                .orElseThrow(() -> new ForbiddenException("Not a participant in this conversation"));
    }

    ParticipantDto toParticipantDto(ConversationParticipant cp) {
        return new ParticipantDto(
                cp.user.id,
                cp.user.username,
                cp.user.displayName,
                cp.user.profileImage,
                cp.lastReadAt,
                cp.user.lastSeenAt
        );
    }

    MessageResDto toMessageDto(Message m) {
        return new MessageResDto(
                m.id,
                m.conversation.id,
                m.sender.id,
                m.sender.username,
                m.sender.displayName,
                m.sender.profileImage,
                m.content,
                m.messageType,
                parsePayload(m.payload),
                m.isDeleted,
                m.replyToId,
                m.createdAt
        );
    }

    /** Per-type payload shape validation (ticket 2.1). Keeps known card types well-formed. */
    void validatePayloadShape(String type, JsonNode payload) {
        if (payload == null || !payload.isObject()) {
            throw new jakarta.ws.rs.BadRequestException("Message payload must be a JSON object");
        }
        if (MessageType.TRACK.equals(type)) {
            String title = payload.path("title").asText(null);
            if (title == null || title.isBlank()) {
                throw new jakarta.ws.rs.BadRequestException("TRACK payload requires a title");
            }
        }
    }

    /** Parse the stored raw JSON payload into a JsonNode; null/blank → null, malformed → null. */
    JsonNode parsePayload(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readTree(raw);
        } catch (Exception e) {
            return null;
        }
    }

    String resolveRequestStatus(Conversation conversation, UUID currentUserId) {
        if (conversation.isGroup || REQUEST_STATUS_ACCEPTED.equals(conversation.requestStatus)
                || conversation.requestStatus == null || conversation.requestedByUser == null) {
            return REQUEST_STATUS_ACCEPTED;
        }

        return conversation.requestedByUser.id.equals(currentUserId)
                ? REQUEST_STATUS_PENDING_OUTGOING
                : REQUEST_STATUS_PENDING_INCOMING;
    }

    ConversationResDto toConversationDto(Conversation c, UUID currentUserId) {
        ConversationParticipant myParticipant = c.participants.stream()
                .filter(cp -> cp.user.id.equals(currentUserId))
                .findFirst().orElse(null);

        Message latest = null;
        String latestMessage = c.lastMessagePreview;
        Instant latestAt = c.lastMessageAt;
        if (!readModelReadEnabled()) {
            latest = messageRepository.findLatestInConversation(c.id);
            latestMessage = latest != null ? latest.content : null;
            latestAt = latest != null ? latest.createdAt : null;
        }

        long unread = 0;
        if (myParticipant != null) {
            if (readModelReadEnabled()) {
                unread = Math.max(0L, myParticipant.unreadCount);
            } else {
                Instant since = myParticipant.lastReadAt != null ? myParticipant.lastReadAt : Instant.EPOCH;
                unread = messageRepository.countUnread(c.id, currentUserId, since);
            }
        }

        List<ParticipantDto> participants = c.participants.stream()
                .map(this::toParticipantDto)
                .collect(Collectors.toList());

        return new ConversationResDto(
                c.id,
                c.isGroup,
                c.groupName,
                participants,
                resolveRequestStatus(c, currentUserId),
                latestMessage,
                latestAt,
                unread,
                c.createdAt,
                c.updatedAt
        );
    }

    // ── Conversations ─────────────────────────────────────────────────────────

    public List<ConversationResDto> getConversations(String clerkId) {
        User user = requireUserByClerkId(clerkId);
        List<Conversation> convs = conversationRepository.findByUserId(user.id);
        if (convs.isEmpty()) return List.of();
        return toConversationDtoList(convs, user.id);
    }

    public List<ConversationResDto> getConversationsPaged(String clerkId, int size, Instant cursor) {
        User user = requireUserByClerkId(clerkId);
        List<Conversation> convs = conversationRepository.findByUserIdPaged(user.id, size, cursor);
        if (convs.isEmpty()) return List.of();
        return toConversationDtoList(convs, user.id);
    }

    List<ConversationResDto> toConversationDtoList(List<Conversation> convs, UUID userId) {
        Map<UUID, Message> latestMapTmp = Map.of();
        Map<UUID, Long> unreadMapTmp = Map.of();
        if (!readModelReadEnabled()) {
            List<UUID> ids = convs.stream().map(c -> c.id).toList();
            latestMapTmp = messageRepository.findLatestPerConversations(ids);
            unreadMapTmp = messageRepository.countUnreadPerConversations(ids, userId);
        }
        final Map<UUID, Message> latestMap = latestMapTmp;
        final Map<UUID, Long> unreadMap = unreadMapTmp;

        return convs.stream()
                .map(c -> {
                    Message latest = latestMap.get(c.id);
                    long unread = unreadMap.getOrDefault(c.id, 0L);
                    String lastMessage = c.lastMessagePreview;
                    Instant lastMessageAt = c.lastMessageAt;
                    if (!readModelReadEnabled()) {
                        lastMessage = latest != null ? latest.content : null;
                        lastMessageAt = latest != null ? latest.createdAt : null;
                    } else {
                        ConversationParticipant mine = c.participants.stream()
                                .filter(cp -> cp.user.id.equals(userId))
                                .findFirst()
                                .orElse(null);
                        unread = mine != null ? Math.max(0L, mine.unreadCount) : 0L;
                    }
                    List<ParticipantDto> participants = c.participants.stream()
                            .map(this::toParticipantDto).collect(Collectors.toList());
                    return new ConversationResDto(
                            c.id, c.isGroup, c.groupName, participants, resolveRequestStatus(c, userId),
                            lastMessage,
                            lastMessageAt,
                            unread, c.createdAt, c.updatedAt
                    );
                })
                .collect(Collectors.toList());
    }

    public ConversationResDto getConversation(UUID conversationId, String clerkId) {
        User user = requireUserByClerkId(clerkId);
        requireParticipant(conversationId, user.id);
        Conversation c = conversationRepository.findByIdOptional(conversationId)
                .orElseThrow(() -> new NotFoundException("Conversation not found"));
        return toConversationDto(c, user.id);
    }

    @Transactional
    public ConversationResDto getOrCreateDirectConversation(String clerkId, UUID targetUserId) {
        User me = requireUserByClerkId(clerkId);
        User target = userRepository.findByIdOptional(targetUserId)
                .orElseThrow(() -> new NotFoundException("Target user not found"));

        if (userBlockRepository.blockExistsBetween(me.id, target.id)) {
            throw new ForbiddenException("Cannot start a conversation with this user");
        }

        // Return existing conversation if found
        return conversationRepository.findDirectConversation(me.id, target.id)
                .map(c -> toConversationDto(c, me.id))
                .orElseGet(() -> {
                    boolean areFriends = friendshipRepository.findBetween(me.id, target.id)
                            .map(f -> f.status == Friendship.Status.ACCEPTED)
                            .orElse(false);

                    Conversation conv = new Conversation();
                    conv.isGroup = false;
                    conv.requestStatus = areFriends ? REQUEST_STATUS_ACCEPTED : REQUEST_STATUS_PENDING;
                    conv.requestedByUser = areFriends ? null : me;
                    conversationRepository.persist(conv);

                    ConversationParticipant p1 = new ConversationParticipant();
                    p1.conversation = conv;
                    p1.user = me;
                    conversationRepository.getEntityManager().persist(p1);

                    ConversationParticipant p2 = new ConversationParticipant();
                    p2.conversation = conv;
                    p2.user = target;
                    conversationRepository.getEntityManager().persist(p2);

                    // Re-fetch with participants loaded
                    conversationRepository.getEntityManager().flush();
                    conversationRepository.getEntityManager().refresh(conv);
                    refreshDiscoveryCandidates(me.id, target.id);
                    return toConversationDto(conv, me.id);
                });
    }

    @Transactional
    public ConversationResDto acceptConversationRequest(UUID conversationId, String clerkId) {
        User currentUser = requireUserByClerkId(clerkId);
        requireParticipant(conversationId, currentUser.id);

        Conversation conversation = conversationRepository.findByIdOptional(conversationId)
                .orElseThrow(() -> new NotFoundException("Conversation not found"));

        if (!REQUEST_STATUS_PENDING.equals(conversation.requestStatus) || conversation.requestedByUser == null) {
            return toConversationDto(conversation, currentUser.id);
        }

        if (conversation.requestedByUser.id.equals(currentUser.id)) {
            throw new ForbiddenException("You cannot accept your own chat request");
        }

        conversation.requestStatus = REQUEST_STATUS_ACCEPTED;
        conversation.acceptedAt = Instant.now();
        conversation.requestedByUser = null;

        return toConversationDto(conversation, currentUser.id);
    }

    @Transactional
    public void denyConversationRequest(UUID conversationId, String clerkId) {
        User currentUser = requireUserByClerkId(clerkId);
        requireParticipant(conversationId, currentUser.id);

        Conversation conversation = conversationRepository.findByIdOptional(conversationId)
                .orElseThrow(() -> new NotFoundException("Conversation not found"));

        if (!REQUEST_STATUS_PENDING.equals(conversation.requestStatus)) {
            throw new ForbiddenException("Only pending chat requests can be removed");
        }

        List<UUID> participantIds = conversation.participants.stream()
                .map(cp -> cp.user.id)
                .distinct()
                .toList();
        conversationRepository.delete(conversation);
        conversationRepository.getEntityManager().flush();
        refreshDiscoveryCandidates(participantIds.toArray(UUID[]::new));
    }

    // ── Messages ──────────────────────────────────────────────────────────────

    public List<MessageResDto> getMessages(UUID conversationId, String clerkId, int page, int size) {
        User user = requireUserByClerkId(clerkId);
        requireParticipant(conversationId, user.id);
        return messageRepository.findByConversation(conversationId, page, size).stream()
                .map(this::toMessageDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public MessageResDto sendMessage(UUID conversationId, String clerkId, String content) {
        return sendMessage(conversationId, clerkId, content, MessageType.TEXT, null);
    }

    @Transactional
    public MessageResDto sendMessage(UUID conversationId, String clerkId, String content,
                                     String messageType, String payloadJson) {
        User sender = requireUserByClerkId(clerkId);
        rateLimitingService.checkRateLimit(sender.id, clerkId);
        requireParticipant(conversationId, sender.id);

        Conversation conv = conversationRepository.findByIdOptional(conversationId)
                .orElseThrow(() -> new NotFoundException("Conversation not found"));

        if (REQUEST_STATUS_PENDING.equals(conv.requestStatus)) {
            throw new ForbiddenException("Chat request must be accepted before messaging");
        }

        // Block enforcement: no messaging if any participant is blocked by / has blocked the sender.
        boolean blocked = conv.participants.stream()
                .map(cp -> cp.user.id)
                .filter(uid -> !uid.equals(sender.id))
                .anyMatch(uid -> userBlockRepository.blockExistsBetween(sender.id, uid));
        if (blocked) {
            throw new ForbiddenException("Cannot send messages in this conversation");
        }

        // Validate message type against the known set.
        String type = MessageType.normalize(messageType);
        if (!MessageType.isValid(type)) {
            throw new jakarta.ws.rs.BadRequestException("Unknown message type: " + messageType);
        }

        // Validate content. Plain text requires non-blank content; structured cards carry their
        // meaning in the payload, so content may be empty (a short fallback label at most).
        boolean structured = MessageType.isStructured(type);
        if (!structured && (content == null || content.isBlank())) {
            throw new jakarta.ws.rs.BadRequestException("Message content cannot be empty");
        }
        if (content != null && content.length() > 2000) {
            throw new jakarta.ws.rs.BadRequestException("Message too long (max 2000 chars)");
        }

        // Validate payload JSON when present, and require it for structured types.
        String normalizedPayload = null;
        if (payloadJson != null && !payloadJson.isBlank()) {
            if (payloadJson.length() > 16000) {
                throw new jakarta.ws.rs.BadRequestException("Message payload too large");
            }
            JsonNode parsed;
            try {
                parsed = objectMapper.readTree(payloadJson);
            } catch (Exception e) {
                throw new jakarta.ws.rs.BadRequestException("Invalid message payload JSON");
            }
            validatePayloadShape(type, parsed);
            try {
                normalizedPayload = objectMapper.writeValueAsString(parsed);
            } catch (Exception e) {
                throw new jakarta.ws.rs.BadRequestException("Invalid message payload JSON");
            }
        } else if (structured) {
            throw new jakarta.ws.rs.BadRequestException("Structured message requires a payload");
        }

        Message msg = new Message();
        msg.conversation = conv;
        msg.sender = sender;
        msg.content = content != null ? content.strip() : "";
        msg.messageType = type;
        msg.payload = normalizedPayload;
        msg.createdAt = Instant.now(); // set before persist so DTO is populated without flush()
        messageRepository.persist(msg);

        // Update conversation updatedAt to bubble it to top of inbox
        Instant now = msg.createdAt;
        conv.updatedAt = now;
        List<UUID> participantIds = conv.participants.stream().map(cp -> cp.user.id).toList();
        if (readModelWriteEnabled()) {
            conv.lastMessageAt = now;
            conv.lastMessagePreview = truncatePreview(msg.content);

            for (ConversationParticipant participant : conv.participants) {
                if (participant.user.id.equals(sender.id)) {
                    participant.lastReadAt = now;
                    participant.unreadCount = 0;
                } else {
                    participant.unreadCount = Math.max(0, participant.unreadCount + 1);
                }
            }
        }
        if (redisUnreadEnabled()) {
            chatRedisStateService.resetUnread(sender.id, conv.id);
            chatRedisStateService.incrementUnreadForRecipients(conv.id, sender.id, participantIds);
        }

        return toMessageDto(msg);
    }

    @Transactional
    public void deleteMessage(UUID messageId, String clerkId) {
        User user = requireUserByClerkId(clerkId);
        Message msg = messageRepository.findByIdOptional(messageId)
                .orElseThrow(() -> new NotFoundException("Message not found"));
        if (!msg.sender.id.equals(user.id)) {
            throw new ForbiddenException("Cannot delete another user's message");
        }
        msg.isDeleted = true;
        if (readModelWriteEnabled()) {
            recomputeConversationReadModel(msg.conversation.id);
        }
    }

    @Transactional
    public void markRead(UUID conversationId, String clerkId) {
        User user = requireUserByClerkId(clerkId);
        ConversationParticipant cp = conversationRepository.findParticipant(conversationId, user.id)
                .orElseThrow(() -> new ForbiddenException("Not a participant in this conversation"));
        cp.lastReadAt = Instant.now();
        if (readModelWriteEnabled()) {
            cp.unreadCount = 0;
        }
        if (redisUnreadEnabled()) {
            chatRedisStateService.resetUnread(user.id, conversationId);
        }
    }

    public List<MessageResDto> getMissedMessages(String clerkId, Instant since) {
        User user = requireUserByClerkId(clerkId);
        // Cap at 100 most-recent conversations to bound the sync query scope
        List<Conversation> convs = conversationRepository.findByUserIdPaged(user.id, 100, null);
        if (convs.isEmpty()) return List.of();
        List<UUID> ids = convs.stream().map(c -> c.id).toList();
        return messageRepository.findMissedMessages(ids, user.id, since)
                .stream().map(this::toMessageDto).collect(Collectors.toList());
    }

    /**
     * Returns a userId->clerkId map for all participants in the given conversation.
     * Uses a single JOIN query — avoids N+1 individual user lookups.
     */
    public Map<UUID, String> getParticipantClerkIds(UUID conversationId) {
        return conversationRepository.findParticipantUserIdToClerkId(conversationId);
    }

    /**
     * Returns the clerkIds of all users who share at least one conversation with the given user,
     * excluding the user themselves. Uses a single JOIN query instead of loading all conversations.
     */
    public List<String> getConversationPartnerClerkIds(String clerkId) {
        User user = requireUserByClerkId(clerkId);
        List<UUID> partnerIds = conversationRepository.findAllConversationPartnerIds(user.id);
        if (partnerIds.isEmpty()) return List.of();
        return new java.util.ArrayList<>(userRepository.findClerkIdsByUserIds(partnerIds).values());
    }

    String truncatePreview(String content) {
        if (content == null) {
            return null;
        }
        String normalized = content.strip();
        return normalized.length() <= 200 ? normalized : normalized.substring(0, 200);
    }

    void recomputeConversationReadModel(UUID conversationId) {
        Conversation conversation = conversationRepository.findByIdOptional(conversationId).orElse(null);
        if (conversation == null) {
            return;
        }
        Message latest = messageRepository.findLatestInConversation(conversationId);
        conversation.lastMessageAt = latest != null ? latest.createdAt : null;
        conversation.lastMessagePreview = latest != null ? truncatePreview(latest.content) : null;
        conversation.updatedAt = Instant.now();

        for (ConversationParticipant participant : conversation.participants) {
            Instant since = participant.lastReadAt != null ? participant.lastReadAt : Instant.EPOCH;
            long unread = messageRepository.countUnread(conversationId, participant.user.id, since);
            participant.unreadCount = (int) Math.min(Integer.MAX_VALUE, Math.max(0L, unread));
            if (redisUnreadEnabled()) {
                chatRedisStateService.setUnread(participant.user.id, conversationId, unread);
            }
        }
    }

    boolean readModelReadEnabled() {
        return flags != null && flags.readModelReadEnabled();
    }

    boolean readModelWriteEnabled() {
        return flags != null && flags.readModelWriteEnabled();
    }

    boolean redisUnreadEnabled() {
        return flags != null && flags.redisEnabled() && flags.redisUnreadCountersEnabled();
    }

    void refreshDiscoveryCandidates(UUID... userIds) {
        if (discoveryService == null) {
            return;
        }

        for (UUID userId : userIds) {
            if (userId != null) {
                discoveryService.refreshAfterUserChange(userId);
            }
        }
    }
}
