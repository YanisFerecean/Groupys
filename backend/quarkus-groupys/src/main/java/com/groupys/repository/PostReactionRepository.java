package com.groupys.repository;

import com.groupys.model.PostReaction;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class PostReactionRepository implements PanacheRepositoryBase<PostReaction, UUID> {

    public Optional<PostReaction> findByPostAndUser(UUID postId, UUID userId) {
        return find("post.id = ?1 and user.id = ?2", postId, userId).firstResultOptional();
    }

    public long countByPostAndType(UUID postId, String reactionType) {
        return count("post.id = ?1 and reactionType = ?2", postId, reactionType);
    }
}
