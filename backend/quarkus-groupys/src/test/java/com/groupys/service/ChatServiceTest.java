package com.groupys.service;

import com.groupys.dto.ConversationResDto;
import com.groupys.model.Conversation;
import com.groupys.model.ConversationParticipant;
import com.groupys.model.User;
import com.groupys.repository.ConversationRepository;
import com.groupys.repository.MessageRepository;
import com.groupys.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class ChatServiceTest {

    @Test
    void getOrCreateDirectConversationReusesExistingConversation() {
        User me = user("me", "clerk-me", "alex");
        User other = user("other", "clerk-other", "luna");
        Conversation existing = conversation(me, other);

        StubConversationRepository conversationRepository = new StubConversationRepository(existing);

        ChatService service = new ChatService();
        service.userRepository = new StubUserRepository(Map.of(
                me.clerkId, me,
                other.clerkId, other
        ), Map.of(
                me.id, me,
                other.id, other
        ));
        service.conversationRepository = conversationRepository;
        service.messageRepository = new StubMessageRepository();

        ConversationResDto result = service.getOrCreateDirectConversation(me.clerkId, other.id);

        assertEquals(existing.id, result.id());
        assertEquals(List.of("alex", "luna"), result.participants().stream().map(p -> p.username()).sorted().toList());
        assertFalse(conversationRepository.persistCalled);
    }

    private static User user(String seed, String clerkId, String username) {
        User user = new User();
        user.id = UUID.nameUUIDFromBytes(seed.getBytes());
        user.clerkId = clerkId;
        user.username = username;
        user.displayName = username;
        return user;
    }

    private static Conversation conversation(User me, User other) {
        Conversation conversation = new Conversation();
        conversation.id = UUID.nameUUIDFromBytes("conversation".getBytes());
        conversation.createdAt = Instant.parse("2025-01-01T00:00:00Z");
        conversation.updatedAt = Instant.parse("2025-01-01T00:00:00Z");

        ConversationParticipant myParticipant = new ConversationParticipant();
        myParticipant.conversation = conversation;
        myParticipant.user = me;
        myParticipant.lastReadAt = Instant.parse("2025-01-01T00:00:00Z");

        ConversationParticipant otherParticipant = new ConversationParticipant();
        otherParticipant.conversation = conversation;
        otherParticipant.user = other;
        otherParticipant.lastReadAt = Instant.parse("2025-01-01T00:00:00Z");

        conversation.participants = List.of(myParticipant, otherParticipant);
        return conversation;
    }

    private static final class StubConversationRepository extends ConversationRepository {
        private final Conversation existingConversation;
        private boolean persistCalled;

        private StubConversationRepository(Conversation existingConversation) {
            this.existingConversation = existingConversation;
        }

        @Override
        public Optional<Conversation> findDirectConversation(UUID userAId, UUID userBId) {
            return Optional.of(existingConversation);
        }

        @Override
        public void persist(Conversation entity) {
            persistCalled = true;
        }
    }

    private static final class StubMessageRepository extends MessageRepository {
        @Override
        public com.groupys.model.Message findLatestInConversation(UUID conversationId) {
            return null;
        }

        @Override
        public long countUnread(UUID conversationId, UUID userId, Instant lastReadAt) {
            return 0;
        }
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
}
