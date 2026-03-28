package com.groupys.repository;

import com.groupys.model.UserSimilarityCache;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class UserSimilarityCacheRepository implements PanacheRepositoryBase<UserSimilarityCache, UUID> {

    public List<UserSimilarityCache> findFreshByUser(UUID userId, int limit) {
        return find("user.id = ?1 and expiresAt > ?2 order by score desc", userId, Instant.now())
                .page(0, limit)
                .list();
    }

    public void deleteByUser(UUID userId) {
        delete("user.id", userId);
    }
}
