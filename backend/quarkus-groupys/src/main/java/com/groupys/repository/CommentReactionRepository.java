package com.groupys.repository;

import com.groupys.model.CommentReaction;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class CommentReactionRepository implements PanacheRepositoryBase<CommentReaction, UUID> {

    public Optional<CommentReaction> findByCommentAndUser(UUID commentId, UUID userId) {
        return find("comment.id = ?1 and user.id = ?2", commentId, userId).firstResultOptional();
    }

    public long countByCommentAndType(UUID commentId, String reactionType) {
        return count("comment.id = ?1 and reactionType = ?2", commentId, reactionType);
    }
}
