package com.groupys.repository;

import com.groupys.model.UserTasteProfile;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class UserTasteProfileRepository implements PanacheRepositoryBase<UserTasteProfile, UUID> {

    public Optional<UserTasteProfile> findByUserId(UUID userId) {
        return find("user.id", userId).firstResultOptional();
    }

    public void updateEmbedding(UUID userId, String vectorLiteral, String model, Instant updatedAt) {
        getEntityManager().createNativeQuery("""
                UPDATE user_taste_profile
                SET taste_embedding = CAST(:embedding AS vector),
                    embedding_model = :model,
                    embedding_updated_at = :updatedAt,
                    embedding_status = 'READY'
                WHERE user_id = :userId
                """)
                .setParameter("embedding", vectorLiteral)
                .setParameter("model", model)
                .setParameter("updatedAt", updatedAt)
                .setParameter("userId", userId)
                .executeUpdate();
    }

    @SuppressWarnings("unchecked")
    public List<UUID> findTopKCandidateUserIds(UUID userId, String vectorLiteral, int limit) {
        List<Object> rows = getEntityManager().createNativeQuery("""
                SELECT utp.user_id
                FROM user_taste_profile utp
                JOIN users u ON u.id = utp.user_id
                WHERE utp.user_id <> :userId
                  AND utp.taste_embedding IS NOT NULL
                  AND u.discovery_visible = true
                  AND u.recommendation_opt_out = false
                ORDER BY utp.taste_embedding <=> CAST(:embedding AS vector)
                LIMIT :limit
                """)
                .setParameter("userId", userId)
                .setParameter("embedding", vectorLiteral)
                .setParameter("limit", limit)
                .getResultList();

        List<UUID> result = new ArrayList<>();
        for (Object row : rows) {
            if (row instanceof UUID uuid) {
                result.add(uuid);
            } else if (row != null) {
                try {
                    result.add(UUID.fromString(row.toString()));
                } catch (Exception ignored) {
                }
            }
        }
        return result;
    }

    public boolean hasEmbedding(UUID userId) {
        Number count = (Number) getEntityManager().createNativeQuery("""
                SELECT COUNT(1)
                FROM user_taste_profile
                WHERE user_id = :userId
                  AND taste_embedding IS NOT NULL
                """)
                .setParameter("userId", userId)
                .getSingleResult();
        return count != null && count.longValue() > 0L;
    }

    public Optional<String> findEmbeddingLiteral(UUID userId) {
        List<?> rows = getEntityManager().createNativeQuery("""
                SELECT taste_embedding::text
                FROM user_taste_profile
                WHERE user_id = :userId
                  AND taste_embedding IS NOT NULL
                LIMIT 1
                """)
                .setParameter("userId", userId)
                .getResultList();
        if (rows.isEmpty() || rows.getFirst() == null) {
            return Optional.empty();
        }
        return Optional.of(rows.getFirst().toString());
    }
}
