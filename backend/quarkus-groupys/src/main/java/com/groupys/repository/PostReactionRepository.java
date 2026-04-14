package com.groupys.repository;

import com.groupys.model.PostReaction;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
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

    /** Single query: returns like or dislike count for each post in the list. */
    public Map<UUID, Long> countsByPostIdsAndType(List<UUID> postIds, String type) {
        if (postIds.isEmpty()) return Map.of();
        List<Object[]> rows = getEntityManager().createQuery(
                "SELECT r.post.id, COUNT(r) FROM PostReaction r " +
                "WHERE r.post.id IN :ids AND r.reactionType = :type " +
                "GROUP BY r.post.id",
                Object[].class
        ).setParameter("ids", postIds).setParameter("type", type).getResultList();
        Map<UUID, Long> map = new HashMap<>();
        for (Object[] row : rows) map.put((UUID) row[0], (Long) row[1]);
        return map;
    }

    /** Single query: returns each post's reaction type for the given user. */
    public Map<UUID, String> findUserReactionsByPostIds(List<UUID> postIds, UUID userId) {
        if (postIds.isEmpty()) return Map.of();
        List<Object[]> rows = getEntityManager().createQuery(
                "SELECT r.post.id, r.reactionType FROM PostReaction r " +
                "WHERE r.post.id IN :ids AND r.user.id = :uid",
                Object[].class
        ).setParameter("ids", postIds).setParameter("uid", userId).getResultList();
        Map<UUID, String> map = new HashMap<>();
        for (Object[] row : rows) map.put((UUID) row[0], (String) row[1]);
        return map;
    }

    /**
     * Returns likes and dislikes for all given posts in a single query.
     * The returned long[] has length 2: [0] = like count, [1] = dislike count.
     * Replaces two separate calls to {@link #countsByPostIdsAndType}.
     */
    public Map<UUID, long[]> countAllReactionsByPostIds(List<UUID> postIds) {
        if (postIds.isEmpty()) return Map.of();
        List<Object[]> rows = getEntityManager().createQuery(
                "SELECT r.post.id, r.reactionType, COUNT(r) FROM PostReaction r " +
                "WHERE r.post.id IN :ids GROUP BY r.post.id, r.reactionType",
                Object[].class)
                .setParameter("ids", postIds)
                .getResultList();
        Map<UUID, long[]> result = new HashMap<>();
        for (Object[] row : rows) {
            UUID id = (UUID) row[0];
            String type = (String) row[1];
            long count = (Long) row[2];
            long[] counts = result.computeIfAbsent(id, k -> new long[2]);
            if ("like".equals(type)) counts[0] = count;
            else if ("dislike".equals(type)) counts[1] = count;
        }
        return result;
    }

    public long countByUser(UUID userId) {
        return count("user.id", userId);
    }

    public long countByCommunity(UUID communityId) {
        return count("post.community.id", communityId);
    }
}
