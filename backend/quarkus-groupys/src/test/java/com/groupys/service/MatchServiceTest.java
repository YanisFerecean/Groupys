package com.groupys.service;

import com.groupys.dto.LikeResponseDto;
import com.groupys.dto.MatchResDto;
import com.groupys.dto.SentLikeResDto;
import com.groupys.model.Conversation;
import com.groupys.model.ConversationParticipant;
import com.groupys.model.User;
import com.groupys.model.UserDiscoveryAction;
import com.groupys.model.UserLike;
import com.groupys.model.UserMatch;
import com.groupys.repository.ConversationRepository;
import com.groupys.repository.MessageRepository;
import com.groupys.repository.UserDiscoveryActionRepository;
import com.groupys.repository.UserLikeRepository;
import com.groupys.repository.UserMatchRepository;
import com.groupys.repository.UserRepository;
import com.groupys.repository.UserSimilarityCacheRepository;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;

class MatchServiceTest {

    @Test
    void likeUserPromotesExistingDirectRequestIntoAcceptedMatchConversation() {
        User liker = user("liker", "clerk-liker", "alex");
        User target = user("target", "clerk-target", "luna");
        Conversation existingConversation = pendingConversation(liker, target);

        StubConversationRepository conversationRepository = new StubConversationRepository(existingConversation);
        StubUserMatchRepository userMatchRepository = new StubUserMatchRepository();

        MatchService service = new MatchService();
        service.userRepository = new StubUserRepository(Map.of(
                liker.clerkId, liker,
                target.clerkId, target
        ), Map.of(
                liker.id, liker,
                target.id, target
        ));
        service.userLikeRepository = new StubUserLikeRepository(target.id, liker.id);
        service.userMatchRepository = userMatchRepository;
        service.userSimilarityCacheRepository = new StubUserSimilarityCacheRepository();
        service.userDiscoveryActionRepository = new StubUserDiscoveryActionRepository();
        service.conversationRepository = conversationRepository;
        service.messageRepository = new MessageRepository();
        service.presenceService = new StubPresenceService();

        LikeResponseDto response = service.likeUser(liker.clerkId, target.id);

        assertEquals(true, response.isMatch());
        assertEquals(existingConversation.id, response.conversationId());
        assertNotNull(response.matchId());
        assertSame(existingConversation, userMatchRepository.persistedMatch.conversation);
        assertSame(userMatchRepository.persistedMatch, existingConversation.match);
        assertEquals("ACCEPTED", existingConversation.requestStatus);
        assertNull(existingConversation.requestedByUser);
        assertNotNull(existingConversation.acceptedAt);
        assertNotNull(existingConversation.updatedAt);
        assertEquals(0, conversationRepository.persistCount);
    }

    @Test
    void getMatchHistoryIncludesInactiveMatchesInCreatedOrder() {
        User me = user("me", "clerk-me", "alex");
        User current = user("current", "clerk-current", "luna");
        User previous = user("previous", "clerk-previous", "zoe");

        UserMatch newerActiveMatch = match("match-newer", me, current, "ACTIVE", "2025-01-03T00:00:00Z");
        UserMatch olderInactiveMatch = match("match-older", me, previous, "UNMATCHED", "2025-01-02T00:00:00Z");

        MatchService service = new MatchService();
        service.userRepository = new StubUserRepository(Map.of(me.clerkId, me), Map.of(me.id, me));
        service.userLikeRepository = new StubUserLikeRepository(null, null);
        service.userMatchRepository = new StubUserMatchRepository(newerActiveMatch, olderInactiveMatch);
        service.userSimilarityCacheRepository = new StubUserSimilarityCacheRepository();
        service.userDiscoveryActionRepository = new StubUserDiscoveryActionRepository();
        service.conversationRepository = new StubConversationRepository(null);
        service.messageRepository = new StubMessageRepository();
        service.presenceService = new StubPresenceService();

        List<MatchResDto> history = service.getMatchHistory(me.clerkId, 0, 20);

        assertEquals(List.of(newerActiveMatch.id, olderInactiveMatch.id), history.stream().map(MatchResDto::matchId).toList());
        assertEquals(List.of("ACTIVE", "UNMATCHED"), history.stream().map(MatchResDto::status).toList());
    }

    @Test
    void getPendingSentLikesReturnsOutgoingLikesForHistoryScreen() {
        User me = user("me", "clerk-me", "alex");
        User pending = user("pending", "clerk-pending", "luna");
        UserLike pendingLike = like(me, pending, "2025-01-03T00:00:00Z");

        MatchService service = new MatchService();
        service.userRepository = new StubUserRepository(Map.of(me.clerkId, me), Map.of(me.id, me));
        service.userLikeRepository = new StubUserLikeRepository(null, null, pendingLike);
        service.userMatchRepository = new StubUserMatchRepository();
        service.userSimilarityCacheRepository = new StubUserSimilarityCacheRepository();
        service.userDiscoveryActionRepository = new StubUserDiscoveryActionRepository();
        service.conversationRepository = new StubConversationRepository(null);
        service.messageRepository = new StubMessageRepository();
        service.presenceService = new StubPresenceService();

        List<SentLikeResDto> likes = service.getPendingSentLikes(me.clerkId, 0, 20);

        assertEquals(1, likes.size());
        assertEquals(pending.id, likes.getFirst().targetUserId());
    }

    @Test
    void withdrawLikeDeletesPendingLikeAndRefreshesDiscovery() {
        User me = user("me", "clerk-me", "alex");
        User pending = user("pending", "clerk-pending", "luna");
        UserLike pendingLike = like(me, pending, "2025-01-03T00:00:00Z");

        StubUserLikeRepository userLikeRepository = new StubUserLikeRepository(null, null, pendingLike);
        StubDiscoveryService discoveryService = new StubDiscoveryService();

        MatchService service = new MatchService();
        service.userRepository = new StubUserRepository(Map.of(
                me.clerkId, me,
                pending.clerkId, pending
        ), Map.of(
                me.id, me,
                pending.id, pending
        ));
        service.userLikeRepository = userLikeRepository;
        service.userMatchRepository = new StubUserMatchRepository();
        service.userSimilarityCacheRepository = new StubUserSimilarityCacheRepository();
        service.userDiscoveryActionRepository = new StubUserDiscoveryActionRepository();
        service.conversationRepository = new StubConversationRepository(null);
        service.messageRepository = new StubMessageRepository();
        service.presenceService = new StubPresenceService();
        service.discoveryService = discoveryService;

        service.withdrawLike(me.clerkId, pending.id);

        assertEquals(0, userLikeRepository.findPendingOutgoingLikesByUser(me.id, 0, 20).size());
        assertEquals(me.id, discoveryService.refreshedUserId);
    }

    private static User user(String seed, String clerkId, String username) {
        User user = new User();
        user.id = UUID.nameUUIDFromBytes(seed.getBytes());
        user.clerkId = clerkId;
        user.username = username;
        user.displayName = username;
        return user;
    }

    private static Conversation pendingConversation(User requester, User recipient) {
        Conversation conversation = new Conversation();
        conversation.id = UUID.nameUUIDFromBytes("conversation".getBytes());
        conversation.isGroup = false;
        conversation.requestStatus = "PENDING";
        conversation.requestedByUser = requester;
        conversation.createdAt = Instant.parse("2025-01-01T00:00:00Z");
        conversation.updatedAt = Instant.parse("2025-01-01T00:00:00Z");

        ConversationParticipant requesterParticipant = new ConversationParticipant();
        requesterParticipant.conversation = conversation;
        requesterParticipant.user = requester;

        ConversationParticipant recipientParticipant = new ConversationParticipant();
        recipientParticipant.conversation = conversation;
        recipientParticipant.user = recipient;

        conversation.participants = java.util.List.of(requesterParticipant, recipientParticipant);
        return conversation;
    }

    private static UserMatch match(String seed, User userA, User userB, String status, String createdAt) {
        UserMatch match = new UserMatch();
        match.id = UUID.nameUUIDFromBytes(seed.getBytes());
        match.userA = userA;
        match.userB = userB;
        match.status = status;
        match.createdAt = Instant.parse(createdAt);
        match.updatedAt = match.createdAt;
        return match;
    }

    private static UserLike like(User fromUser, User toUser, String createdAt) {
        UserLike like = new UserLike();
        like.id = UUID.nameUUIDFromBytes((fromUser.id + ":" + toUser.id).getBytes());
        like.fromUser = fromUser;
        like.toUser = toUser;
        like.createdAt = Instant.parse(createdAt);
        return like;
    }

    private static final class StubUserRepository extends UserRepository {
        private final Map<String, User> byClerkId;
        private final Map<UUID, User> byId;

        private StubUserRepository(Map<String, User> byClerkId, Map<UUID, User> byId) {
            this.byClerkId = byClerkId;
            this.byId = byId;
        }

        @Override
        public Optional<User> findByClerkId(String clerkId) {
            return Optional.ofNullable(byClerkId.get(clerkId));
        }

        @Override
        public Optional<User> findByIdOptional(UUID id) {
            return Optional.ofNullable(byId.get(id));
        }
    }

    private static final class StubUserLikeRepository extends UserLikeRepository {
        private final Map<String, UserLike> likes = new HashMap<>();
        private final UUID mutualFromUserId;
        private final UUID mutualToUserId;

        private StubUserLikeRepository(UUID mutualFromUserId, UUID mutualToUserId, UserLike... initialLikes) {
            this.mutualFromUserId = mutualFromUserId;
            this.mutualToUserId = mutualToUserId;
            for (UserLike like : initialLikes) {
                likes.put(key(like.fromUser.id, like.toUser.id), like);
            }
        }

        @Override
        public Optional<UserLike> findByPair(UUID fromUserId, UUID toUserId) {
            return Optional.ofNullable(likes.get(key(fromUserId, toUserId)));
        }

        @Override
        public boolean existsActiveLike(UUID fromUserId, UUID toUserId) {
            return mutualFromUserId != null
                    && mutualToUserId != null
                    && mutualFromUserId.equals(fromUserId)
                    && mutualToUserId.equals(toUserId);
        }

        @Override
        public Optional<UserLike> findActiveByPair(UUID fromUserId, UUID toUserId) {
            return findByPair(fromUserId, toUserId);
        }

        @Override
        public List<UserLike> findPendingOutgoingLikesByUser(UUID userId, int page, int size) {
            return likes.values().stream()
                    .filter(like -> like.fromUser.id.equals(userId))
                    .sorted((left, right) -> right.createdAt.compareTo(left.createdAt))
                    .skip((long) page * size)
                    .limit(size)
                    .toList();
        }

        @Override
        public void persist(UserLike entity) {
            likes.put(key(entity.fromUser.id, entity.toUser.id), entity);
        }

        @Override
        public void delete(UserLike entity) {
            likes.remove(key(entity.fromUser.id, entity.toUser.id));
        }

        private String key(UUID fromUserId, UUID toUserId) {
            return fromUserId + ":" + toUserId;
        }
    }

    private static final class StubUserMatchRepository extends UserMatchRepository {
        private UserMatch persistedMatch;
        private final List<UserMatch> matches;

        private StubUserMatchRepository(UserMatch... initialMatches) {
            this.matches = new java.util.ArrayList<>(List.of(initialMatches));
            if (!this.matches.isEmpty()) {
                this.persistedMatch = this.matches.getFirst();
            }
        }

        @Override
        public Optional<UserMatch> findByUsers(UUID userAId, UUID userBId) {
            return matches.stream()
                    .filter(match -> {
                        boolean matchesA = match.userA.id.equals(userAId) && match.userB.id.equals(userBId);
                        boolean matchesB = match.userA.id.equals(userBId) && match.userB.id.equals(userAId);
                        return matchesA || matchesB;
                    })
                    .findFirst();
        }

        @Override
        public boolean matchExists(UUID userId1, UUID userId2) {
            return findByUsers(userId1, userId2)
                    .filter(match -> "ACTIVE".equals(match.status))
                    .isPresent();
        }

        @Override
        public List<UserMatch> findMatchesByUserPaged(UUID userId, int page, int size) {
            return matches.stream()
                    .filter(match -> match.userA.id.equals(userId) || match.userB.id.equals(userId))
                    .sorted((left, right) -> right.createdAt.compareTo(left.createdAt))
                    .skip((long) page * size)
                    .limit(size)
                    .toList();
        }

        @Override
        public void persist(UserMatch entity) {
            if (entity.id == null) {
                entity.id = UUID.nameUUIDFromBytes("match".getBytes());
            }
            persistedMatch = entity;
            matches.add(entity);
        }
    }

    private static final class StubUserSimilarityCacheRepository extends UserSimilarityCacheRepository {
        @Override
        public long delete(String query, Object... params) {
            return 0;
        }

        @Override
        public void deleteByUser(UUID userId) {
            // No-op for this unit test.
        }
    }

    private static final class StubMessageRepository extends MessageRepository {
        @Override
        public Map<UUID, Long> countUnreadPerConversations(List<UUID> conversationIds, UUID userId) {
            return Map.of();
        }
    }

    private static final class StubUserDiscoveryActionRepository extends UserDiscoveryActionRepository {
        @Override
        public void persist(UserDiscoveryAction entity) {
            // No-op for this unit test.
        }

        @Override
        public long delete(String query, Object... params) {
            return 0;
        }
    }

    private static final class StubConversationRepository extends ConversationRepository {
        private final Conversation existingConversation;
        private int persistCount;

        private StubConversationRepository(Conversation existingConversation) {
            this.existingConversation = existingConversation;
        }

        @Override
        public Optional<Conversation> findDirectConversation(UUID userAId, UUID userBId) {
            return Optional.ofNullable(existingConversation);
        }

        @Override
        public void persist(Conversation entity) {
            persistCount++;
        }
    }

    private static final class StubPresenceService extends PresenceService {
        @Override
        public void sendTo(String clerkId, String json) {
            // No-op for this unit test.
        }
    }

    private static final class StubDiscoveryService extends DiscoveryService {
        private UUID refreshedUserId;

        @Override
        public void refreshAfterUserChange(UUID userId) {
            refreshedUserId = userId;
        }
    }
}
