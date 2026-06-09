package com.groupys.repository;

import com.groupys.model.MessageReaction;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class MessageReactionRepository implements PanacheRepositoryBase<MessageReaction, UUID> {

    public List<MessageReaction> findByMessage(UUID messageId) {
        return find("messageId = ?1 order by createdAt", messageId).list();
    }

    public List<MessageReaction> findByMessages(List<UUID> messageIds) {
        if (messageIds.isEmpty()) return List.of();
        return find("messageId in ?1 order by createdAt", messageIds).list();
    }

    public MessageReaction findOne(UUID messageId, UUID userId, String emoji) {
        return find("messageId = ?1 and user.id = ?2 and emoji = ?3", messageId, userId, emoji).firstResult();
    }
}
