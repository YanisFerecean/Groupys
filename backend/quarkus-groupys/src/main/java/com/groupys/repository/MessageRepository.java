package com.groupys.repository;

import com.groupys.model.Message;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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

    public Map<UUID, Message> findLatestPerConversations(List<UUID> conversationIds) {
        if (conversationIds.isEmpty()) return Map.of();
        List<Message> results = getEntityManager().createQuery(
                "SELECT m FROM Message m WHERE m.conversation.id IN :ids " +
                "AND m.isDeleted = false " +
                "AND m.createdAt = (" +
                "  SELECT MAX(m2.createdAt) FROM Message m2 " +
                "  WHERE m2.conversation.id = m.conversation.id AND m2.isDeleted = false" +
                ")",
                Message.class
        ).setParameter("ids", conversationIds).getResultList();
        Map<UUID, Message> map = new LinkedHashMap<>();
        for (Message m : results) {
            map.putIfAbsent(m.conversation.id, m);
        }
        return map;
    }

    public List<Message> findMissedMessages(List<UUID> conversationIds, UUID userId, Instant since) {
        if (conversationIds.isEmpty()) return List.of();
        return getEntityManager().createQuery(
                "SELECT m FROM Message m WHERE m.conversation.id IN :ids " +
                "AND m.sender.id != :uid " +
                "AND m.isDeleted = false " +
                "AND m.createdAt > :since " +
                "ORDER BY m.createdAt ASC",
                Message.class
        ).setParameter("ids", conversationIds)
         .setParameter("uid", userId)
         .setParameter("since", since)
         .getResultList();
    }

    public Map<UUID, Long> countUnreadPerConversations(List<UUID> conversationIds, UUID userId) {
        if (conversationIds.isEmpty()) return Map.of();
        List<Object[]> rows = getEntityManager().createQuery(
                "SELECT m.conversation.id, COUNT(m) FROM Message m " +
                "JOIN ConversationParticipant cp ON cp.conversation = m.conversation AND cp.user.id = :uid " +
                "WHERE m.conversation.id IN :ids " +
                "AND m.isDeleted = false " +
                "AND m.sender.id != :uid " +
                "AND (cp.lastReadAt IS NULL OR m.createdAt > cp.lastReadAt) " +
                "GROUP BY m.conversation.id",
                Object[].class
        ).setParameter("ids", conversationIds).setParameter("uid", userId).getResultList();
        Map<UUID, Long> map = new HashMap<>();
        for (Object[] row : rows) map.put((UUID) row[0], (Long) row[1]);
        return map;
    }
}
