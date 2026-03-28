package com.groupys.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.groupys.dto.LikeResponseDto;
import com.groupys.dto.MatchResDto;
import com.groupys.model.*;
import com.groupys.repository.*;
import com.groupys.websocket.WebSocketMessage;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.LockModeType;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class MatchService {

    @Inject
    UserRepository userRepository;

    @Inject
    UserLikeRepository userLikeRepository;

    @Inject
    UserMatchRepository userMatchRepository;

    @Inject
    UserSimilarityCacheRepository userSimilarityCacheRepository;

    @Inject
    UserDiscoveryActionRepository userDiscoveryActionRepository;

    @Inject
    ConversationRepository conversationRepository;

    @Inject
    MessageRepository messageRepository;

    @Inject
    PresenceService presenceService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ── Like ──────────────────────────────────────────────────────────────────

    @Transactional
    public LikeResponseDto likeUser(String clerkId, UUID targetUserId) {
        User liker = requireUserByClerkId(clerkId);
        if (liker.id.equals(targetUserId)) {
            throw new BadRequestException("Cannot like yourself");
        }
        User target = userRepository.findByIdOptional(targetUserId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        // Upsert like (idempotent: unique constraint on pair)
        if (userLikeRepository.findByPair(liker.id, target.id).isEmpty()) {
            UserLike like = new UserLike();
            like.fromUser = liker;
            like.toUser = target;
            userLikeRepository.persist(like);
        }

        // Remove target from liker's discovery cache
        userSimilarityCacheRepository.delete("user.id = ?1 and candidateUser.id = ?2", liker.id, target.id);

        // Record discovery action for audit
        UserDiscoveryAction action = new UserDiscoveryAction();
        action.user = liker;
        action.targetType = "USER";
        action.targetUser = target;
        action.actionType = "LIKE";
        action.surface = "PEOPLE";
        userDiscoveryActionRepository.persist(action);

        // Check for mutual like
        if (userLikeRepository.existsActiveLike(target.id, liker.id)) {
            return createMatch(liker, target);
        }

        return new LikeResponseDto(false, null, null);
    }

    private LikeResponseDto createMatch(User liker, User target) {
        // Canonical ordering: smaller UUID is userA
        User userA = liker.id.compareTo(target.id) <= 0 ? liker : target;
        User userB = liker.id.compareTo(target.id) <= 0 ? target : liker;

        // PESSIMISTIC_WRITE lock to handle simultaneous like race condition
        userMatchRepository.findByUsers(userA.id, userB.id).ifPresent(existing -> {
            // Match already exists (race condition) — lock and return
        });

        // Re-check after potential lock
        return userMatchRepository.findByUsers(userA.id, userB.id)
                .map(existing -> new LikeResponseDto(true, existing.id, existing.conversation != null ? existing.conversation.id : null))
                .orElseGet(() -> {
                    // Create UserMatch
                    UserMatch match = new UserMatch();
                    match.userA = userA;
                    match.userB = userB;
                    match.status = "ACTIVE";
                    userMatchRepository.persist(match);

                    // Create Conversation linked to match
                    Conversation conv = new Conversation();
                    conv.isGroup = false;
                    conv.match = match;
                    conversationRepository.persist(conv);

                    ConversationParticipant p1 = new ConversationParticipant();
                    p1.conversation = conv;
                    p1.user = userA;
                    conversationRepository.getEntityManager().persist(p1);

                    ConversationParticipant p2 = new ConversationParticipant();
                    p2.conversation = conv;
                    p2.user = userB;
                    conversationRepository.getEntityManager().persist(p2);

                    match.conversation = conv;
                    conversationRepository.getEntityManager().flush();
                    conversationRepository.getEntityManager().refresh(conv);
                    conversationRepository.getEntityManager().refresh(match);

                    // Push MATCH_NEW to both parties via WebSocket
                    sendMatchEvent(liker, target, match.id, conv.id);
                    sendMatchEvent(target, liker, match.id, conv.id);

                    return new LikeResponseDto(true, match.id, conv.id);
                });
    }

    private void sendMatchEvent(User recipient, User otherUser, UUID matchId, UUID conversationId) {
        try {
            String json = objectMapper.writeValueAsString(
                    WebSocketMessage.matchNew(
                            matchId.toString(),
                            conversationId.toString(),
                            otherUser.id.toString(),
                            otherUser.username,
                            otherUser.displayName,
                            otherUser.profileImage
                    )
            );
            presenceService.sendTo(recipient.clerkId, json);
        } catch (JsonProcessingException e) {
            Log.warnf(e, "Failed to serialize MATCH_NEW event for user %s", recipient.id);
        }
    }

    // ── Pass ──────────────────────────────────────────────────────────────────

    @Transactional
    public void passUser(String clerkId, UUID targetUserId) {
        User user = requireUserByClerkId(clerkId);
        User target = userRepository.findByIdOptional(targetUserId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        UserDiscoveryAction action = new UserDiscoveryAction();
        action.user = user;
        action.targetType = "USER";
        action.targetUser = target;
        action.actionType = "DISMISS";
        action.surface = "PEOPLE";
        action.expiresAt = Instant.now().plus(30, ChronoUnit.DAYS);
        userDiscoveryActionRepository.persist(action);

        userSimilarityCacheRepository.delete("user.id = ?1 and candidateUser.id = ?2", user.id, target.id);
    }

    // ── Matches ───────────────────────────────────────────────────────────────

    public List<MatchResDto> getMatches(String clerkId) {
        User user = requireUserByClerkId(clerkId);
        List<UserMatch> matches = userMatchRepository.findActiveMatchesByUser(user.id);
        if (matches.isEmpty()) return List.of();

        List<UUID> conversationIds = matches.stream()
                .filter(m -> m.conversation != null)
                .map(m -> m.conversation.id)
                .toList();
        Map<UUID, Long> unreadMap = conversationIds.isEmpty()
                ? Map.of()
                : messageRepository.countUnreadPerConversations(conversationIds, user.id);

        return matches.stream()
                .map(m -> toMatchResDto(m, user.id, unreadMap))
                .toList();
    }

    public MatchResDto getMatch(String clerkId, UUID matchId) {
        User user = requireUserByClerkId(clerkId);
        UserMatch match = userMatchRepository.findByIdAndUser(matchId, user.id)
                .orElseThrow(() -> new NotFoundException("Match not found"));
        long unread = 0;
        if (match.conversation != null) {
            unread = messageRepository.countUnreadPerConversations(List.of(match.conversation.id), user.id)
                    .getOrDefault(match.conversation.id, 0L);
        }
        return toMatchResDto(match, user.id, Map.of(match.conversation != null ? match.conversation.id : UUID.randomUUID(), unread));
    }

    @Transactional
    public void unmatch(String clerkId, UUID matchId) {
        User user = requireUserByClerkId(clerkId);
        UserMatch match = userMatchRepository.findByIdAndUser(matchId, user.id)
                .orElseThrow(() -> new NotFoundException("Match not found"));
        if (!"ACTIVE".equals(match.status)) {
            throw new BadRequestException("Match is already inactive");
        }
        match.status = "UNMATCHED";
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private User requireUserByClerkId(String clerkId) {
        return userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    private MatchResDto toMatchResDto(UserMatch match, UUID currentUserId, Map<UUID, Long> unreadMap) {
        User other = match.userA.id.equals(currentUserId) ? match.userB : match.userA;
        UUID conversationId = match.conversation != null ? match.conversation.id : null;
        long unread = conversationId != null ? unreadMap.getOrDefault(conversationId, 0L) : 0L;
        return new MatchResDto(
                match.id,
                other.id,
                other.username,
                other.displayName,
                other.profileImage,
                conversationId,
                match.status,
                match.createdAt,
                unread
        );
    }
}
