package com.groupys.repository;

import com.groupys.model.CollabPlaylist;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.UUID;

@ApplicationScoped
public class CollabPlaylistRepository implements PanacheRepositoryBase<CollabPlaylist, UUID> {

    public CollabPlaylist findByConversation(UUID conversationId) {
        return find("conversation.id = ?1", conversationId).firstResult();
    }
}
