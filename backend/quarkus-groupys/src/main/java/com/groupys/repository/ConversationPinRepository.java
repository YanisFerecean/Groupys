package com.groupys.repository;

import com.groupys.model.ConversationPin;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ConversationPinRepository implements PanacheRepositoryBase<ConversationPin, UUID> {

    public List<ConversationPin> findByConversation(UUID conversationId) {
        return find("conversationId = ?1 order by createdAt desc", conversationId).list();
    }

    public ConversationPin findOne(UUID conversationId, UUID messageId) {
        return find("conversationId = ?1 and messageId = ?2", conversationId, messageId).firstResult();
    }
}
