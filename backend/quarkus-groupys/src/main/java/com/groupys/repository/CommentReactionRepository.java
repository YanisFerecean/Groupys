package com.groupys.repository;

import com.groupys.model.CommentReaction;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
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

    /** Single query: returns like or dislike count for each comment in the list. */
    public Map<UUID, Long> countsByCommentIdsAndType(List<UUID> commentIds, String type) {
        if (commentIds.isEmpty()) return Map.of();
        List<Object[]> rows = getEntityManager().createQuery(
                "SELECT r.comment.id, COUNT(r) FROM CommentReaction r " +
                "WHERE r.comment.id IN :ids AND r.reactionType = :type " +
                "GROUP BY r.comment.id",
                Object[].class
        ).setParameter("ids", commentIds).setParameter("type", type).getResultList();
        Map<UUID, Long> map = new HashMap<>();
        for (Object[] row : rows) map.put((UUID) row[0], (Long) row[1]);
        return map;
    }

    /** Single query: returns each comment's reaction type for the given user. */
    public Map<UUID, String> findUserReactionsByCommentIds(List<UUID> commentIds, UUID userId) {
        if (commentIds.isEmpty()) return Map.of();
        List<Object[]> rows = getEntityManager().createQuery(
                "SELECT r.comment.id, r.reactionType FROM CommentReaction r " +
                "WHERE r.comment.id IN :ids AND r.user.id = :uid",
                Object[].class
        ).setParameter("ids", commentIds).setParameter("uid", userId).getResultList();
        Map<UUID, String> map = new HashMap<>();
        for (Object[] row : rows) map.put((UUID) row[0], (String) row[1]);
        return map;
    }

    /** Batch-deletes all reactions for the given comment IDs. */
    public void deleteByCommentIds(List<UUID> commentIds) {
        if (commentIds.isEmpty()) return;
        getEntityManager()
                .createQuery("DELETE FROM CommentReaction r WHERE r.comment.id IN :ids")
                .setParameter("ids", commentIds)
                .executeUpdate();
    }

    public long countByUser(UUID userId) {
        return count("user.id", userId);
    }

    public long countByCommunity(UUID communityId) {
        return count("comment.post.community.id", communityId);
    }
}
