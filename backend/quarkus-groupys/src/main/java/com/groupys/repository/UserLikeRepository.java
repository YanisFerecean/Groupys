package com.groupys.repository;

import com.groupys.model.UserLike;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class UserLikeRepository implements PanacheRepositoryBase<UserLike, UUID> {

    public Optional<UserLike> findByPair(UUID fromUserId, UUID toUserId) {
        return find("fromUser.id = ?1 and toUser.id = ?2", fromUserId, toUserId)
                .firstResultOptional();
    }

    /**
     * Returns the IDs of all users that {@code fromUserId} has liked (non-expired).
     * Used to exclude already-liked users from the discovery feed.
     */
    public Set<UUID> findLikedUserIds(UUID fromUserId) {
        return find("""
                fromUser.id = ?1
                and (expiresAt is null or expiresAt > ?2)
                """, fromUserId, Instant.now())
                .list().stream()
                .map(like -> like.toUser.id)
                .collect(Collectors.toSet());
    }

    /**
     * Returns true if {@code fromUserId} has an active (non-expired) like for {@code toUserId}.
     */
    public boolean existsActiveLike(UUID fromUserId, UUID toUserId) {
        return count("""
                fromUser.id = ?1 and toUser.id = ?2
                and (expiresAt is null or expiresAt > ?3)
                """, fromUserId, toUserId, Instant.now()) > 0;
    }
}
