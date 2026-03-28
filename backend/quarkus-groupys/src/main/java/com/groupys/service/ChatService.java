package com.groupys.service;

import com.groupys.dto.ConversationResDto;
import com.groupys.dto.MessageResDto;
import com.groupys.dto.ParticipantDto;
import com.groupys.model.Conversation;
import com.groupys.model.ConversationParticipant;
import com.groupys.model.Message;
import com.groupys.model.User;
import com.groupys.repository.ConversationRepository;
import com.groupys.repository.MessageRepository;
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
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@ApplicationScoped
public class ChatService {

    private static final String REQUEST_STATUS_ACCEPTED = "ACCEPTED";
    private static final String REQUEST_STATUS_PENDING = "PENDING";
    private static final String REQUEST_STATUS_PENDING_INCOMING = "PENDING_INCOMING";
    private static final String REQUEST_STATUS_PENDING_OUTGOING = "PENDING_OUTGOING";

    @Inject
    ConversationRepository conversationRepository;

    @Inject
    MessageRepository messageRepository;

    @Inject
    UserRepository userRepository;

    @Inject
    DiscoveryService discoveryService;

    // ── Rate limiting ─────────────────────────────────────────────────────────

    private static final int RATE_LIMIT_MAX = 20;
    private static final long RATE_LIMIT_WINDOW_MS = 10_000; // 10 seconds
    private static final ConcurrentHashMap<String, long[]> rateLimitMap = new ConcurrentHashMap<>();

    private void checkRateLimit(String clerkId) {
        long now = System.currentTimeMillis();
        long[] bucket = rateLimitMap.compute(clerkId, (k, v) -> {
            if (v == null || now - v[1] >= RATE_LIMIT_WINDOW_MS) {
                return new long[]{1, now};
            }
            v[0]++;
            return v;
        });
        if (bucket[0] > RATE_LIMIT_MAX) {
            throw new jakarta.ws.rs.ClientErrorException("Rate limit exceeded: too many messages", 429);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private User requireUserByClerkId(String clerkId) {
        return userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    private void requireParticipant(UUID conversationId, UUID userId) {
        conversationRepository.findParticipant(conversationId, userId)
                .orElseThrow(() -> new ForbiddenException("Not a participant in this conversation"));
    }

    private ParticipantDto toParticipantDto(ConversationParticipant cp) {
        return new ParticipantDto(
                cp.user.id,
                cp.user.username,
                cp.user.displayName,
                cp.user.profileImage,
                cp.lastReadAt,
                cp.user.lastSeenAt
        );
    }

    private MessageResDto toMessageDto(Message m) {
        return new MessageResDto(
                m.id,
                m.conversation.id,
                m.sender.id,
                m.sender.username,
                m.sender.displayName,
                m.sender.profileImage,
                m.content,
                m.messageType,
                m.isDeleted,
                m.replyToId,
                m.createdAt
        );
    }

    private String resolveRequestStatus(Conversation conversation, UUID currentUserId) {
        if (conversation.isGroup || REQUEST_STATUS_ACCEPTED.equals(conversation.requestStatus)
                || conversation.requestStatus == null || conversation.requestedByUser == null) {
            return REQUEST_STATUS_ACCEPTED;
        }

        return conversation.requestedByUser.id.equals(currentUserId)
                ? REQUEST_STATUS_PENDING_OUTGOING
                : REQUEST_STATUS_PENDING_INCOMING;
    }

    private ConversationResDto toConversationDto(Conversation c, UUID currentUserId) {
        Message latest = messageRepository.findLatestInConversation(c.id);
        long unread = 0;

        ConversationParticipant myParticipant = c.participants.stream()
                .filter(cp -> cp.user.id.equals(currentUserId))
                .findFirst().orElse(null);
        if (myParticipant != null) {
            Instant since = myParticipant.lastReadAt != null ? myParticipant.lastReadAt : Instant.EPOCH;
            unread = messageRepository.countUnread(c.id, currentUserId, since);
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
                latest != null ? latest.content : null,
                latest != null ? latest.createdAt : null,
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

    private List<ConversationResDto> toConversationDtoList(List<Conversation> convs, UUID userId) {
        List<UUID> ids = convs.stream().map(c -> c.id).toList();
        Map<UUID, Message> latestMap = messageRepository.findLatestPerConversations(ids);
        Map<UUID, Long> unreadMap = messageRepository.countUnreadPerConversations(ids, userId);

        return convs.stream()
                .map(c -> {
                    Message latest = latestMap.get(c.id);
                    long unread = unreadMap.getOrDefault(c.id, 0L);
                    List<ParticipantDto> participants = c.participants.stream()
                            .map(this::toParticipantDto).collect(Collectors.toList());
                    return new ConversationResDto(
                            c.id, c.isGroup, c.groupName, participants, resolveRequestStatus(c, userId),
                            latest != null ? latest.content : null,
                            latest != null ? latest.createdAt : null,
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

        // Return existing conversation if found
        return conversationRepository.findDirectConversation(me.id, target.id)
                .map(c -> toConversationDto(c, me.id))
                .orElseGet(() -> {
                    Conversation conv = new Conversation();
                    conv.isGroup = false;
                    conv.requestStatus = REQUEST_STATUS_PENDING;
                    conv.requestedByUser = me;
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
        checkRateLimit(clerkId);

        User sender = requireUserByClerkId(clerkId);
        requireParticipant(conversationId, sender.id);

        Conversation conv = conversationRepository.findByIdOptional(conversationId)
                .orElseThrow(() -> new NotFoundException("Conversation not found"));

        if (REQUEST_STATUS_PENDING.equals(conv.requestStatus)) {
            throw new ForbiddenException("Chat request must be accepted before messaging");
        }

        // Validate content
        if (content == null || content.isBlank()) {
            throw new jakarta.ws.rs.BadRequestException("Message content cannot be empty");
        }
        if (content.length() > 2000) {
            throw new jakarta.ws.rs.BadRequestException("Message too long (max 2000 chars)");
        }

        Message msg = new Message();
        msg.conversation = conv;
        msg.sender = sender;
        msg.content = content.strip();
        msg.messageType = "text";
        msg.createdAt = Instant.now(); // set before persist so DTO is populated without flush()
        messageRepository.persist(msg);

        // Update conversation updatedAt to bubble it to top of inbox
        conv.updatedAt = Instant.now();

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
    }

    @Transactional
    public void markRead(UUID conversationId, String clerkId) {
        User user = requireUserByClerkId(clerkId);
        ConversationParticipant cp = conversationRepository.findParticipant(conversationId, user.id)
                .orElseThrow(() -> new ForbiddenException("Not a participant in this conversation"));
        cp.lastReadAt = Instant.now();
    }

    public List<MessageResDto> getMissedMessages(String clerkId, Instant since) {
        User user = requireUserByClerkId(clerkId);
        List<Conversation> convs = conversationRepository.findByUserId(user.id);
        if (convs.isEmpty()) return List.of();
        List<UUID> ids = convs.stream().map(c -> c.id).toList();
        return messageRepository.findMissedMessages(ids, user.id, since)
                .stream().map(this::toMessageDto).collect(Collectors.toList());
    }

    public List<UUID> getParticipantUserIds(UUID conversationId) {
        Conversation conv = conversationRepository.findByIdOptional(conversationId).orElse(null);
        if (conv == null) return List.of();
        return conv.participants.stream().map(cp -> cp.user.id).collect(Collectors.toList());
    }

    public String getClerkIdByUserId(UUID userId) {
        return userRepository.findByIdOptional(userId).map(u -> u.clerkId).orElse(null);
    }

    /**
     * Returns the clerkIds of all users who share at least one conversation with the given user,
     * excluding the user themselves. Uses two queries instead of N+1.
     */
    public List<String> getConversationPartnerClerkIds(String clerkId) {
        User user = requireUserByClerkId(clerkId);
        List<Conversation> convs = conversationRepository.findByUserId(user.id);
        if (convs.isEmpty()) return List.of();

        List<UUID> partnerIds = convs.stream()
                .flatMap(c -> c.participants.stream())
                .map(cp -> cp.user.id)
                .filter(id -> !id.equals(user.id))
                .distinct()
                .toList();

        if (partnerIds.isEmpty()) return List.of();

        return new java.util.ArrayList<>(userRepository.findClerkIdsByUserIds(partnerIds).values());
    }

    private void refreshDiscoveryCandidates(UUID... userIds) {
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
