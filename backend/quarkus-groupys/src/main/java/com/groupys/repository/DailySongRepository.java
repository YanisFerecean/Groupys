package com.groupys.repository;

import com.groupys.model.DailySong;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class DailySongRepository implements PanacheRepositoryBase<DailySong, UUID> {

    public Optional<DailySong> findByUser(UUID userId) {
        return find("user.id", userId).firstResultOptional();
    }

    /** Active (non-expired) daily songs for the given users, newest first. */
    public List<DailySong> findActiveForUsers(List<UUID> userIds, Instant now) {
        if (userIds.isEmpty()) {
            return List.of();
        }
        return find("user.id in ?1 and expiresAt > ?2 order by createdAt desc", userIds, now).list();
    }

    public long deleteExpired(Instant now) {
        return delete("expiresAt <= ?1", now);
    }
}
