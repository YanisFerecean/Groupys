package com.groupys.repository;

import com.groupys.model.Message;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class MessageRepository implements PanacheRepositoryBase<Message, UUID> {

    public List<Message> findByConversation(UUID conversationId, int page, int size) {
        return getEntityManager().createQuery(
                "SELECT m FROM Message m WHERE m.conversation.id = :cid AND m.isDeleted = false " +
                "ORDER BY m.createdAt DESC",
                Message.class
        ).setParameter("cid", conversationId)
         .setFirstResult(page * size)
         .setMaxResults(size)
         .getResultList();
    }

    public long countUnread(UUID conversationId, UUID userId, Instant lastReadAt) {
        return getEntityManager().createQuery(
                "SELECT COUNT(m) FROM Message m " +
                "WHERE m.conversation.id = :cid " +
                "AND m.isDeleted = false " +
                "AND m.sender.id != :uid " +
                "AND m.createdAt > :since",
                Long.class
        ).setParameter("cid", conversationId)
         .setParameter("uid", userId)
         .setParameter("since", lastReadAt)
         .getSingleResult();
    }

    public Message findLatestInConversation(UUID conversationId) {
        List<Message> results = getEntityManager().createQuery(
                "SELECT m FROM Message m WHERE m.conversation.id = :cid AND m.isDeleted = false " +
                "ORDER BY m.createdAt DESC",
                Message.class
        ).setParameter("cid", conversationId).setMaxResults(1).getResultList();
        return results.isEmpty() ? null : results.get(0);
    }
}
