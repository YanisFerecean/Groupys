package com.groupys.repository;

import com.groupys.model.Conversation;
import com.groupys.model.ConversationParticipant;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class ConversationRepository implements PanacheRepositoryBase<Conversation, UUID> {

    /**
     * Find all conversations where the user is a participant,
     * ordered by updatedAt descending (most recent first).
     */
    public List<Conversation> findByUserId(UUID userId) {
        return getEntityManager().createQuery(
                "SELECT DISTINCT c FROM Conversation c " +
                "JOIN c.participants cp " +
                "WHERE cp.user.id = :userId " +
                "ORDER BY c.updatedAt DESC NULLS LAST",
                Conversation.class
        ).setParameter("userId", userId).getResultList();
    }

    /**
     * Find a direct (non-group) conversation shared by exactly the two given users.
     */
    public Optional<Conversation> findDirectConversation(UUID userAId, UUID userBId) {
        List<Conversation> results = getEntityManager().createQuery(
                "SELECT c FROM Conversation c " +
                "WHERE c.isGroup = false " +
                "AND EXISTS (SELECT 1 FROM ConversationParticipant p1 WHERE p1.conversation = c AND p1.user.id = :userA) " +
                "AND EXISTS (SELECT 1 FROM ConversationParticipant p2 WHERE p2.conversation = c AND p2.user.id = :userB) " +
                "AND (SELECT COUNT(p) FROM ConversationParticipant p WHERE p.conversation = c) = 2",
                Conversation.class
        ).setParameter("userA", userAId).setParameter("userB", userBId).getResultList();
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    /**
     * Find a participant record for the given user in the given conversation.
     */
    public Optional<ConversationParticipant> findParticipant(UUID conversationId, UUID userId) {
        return getEntityManager().createQuery(
                "SELECT cp FROM ConversationParticipant cp WHERE cp.conversation.id = :cid AND cp.user.id = :uid",
                ConversationParticipant.class
        ).setParameter("cid", conversationId).setParameter("uid", userId).getResultStream().findFirst();
    }
}
