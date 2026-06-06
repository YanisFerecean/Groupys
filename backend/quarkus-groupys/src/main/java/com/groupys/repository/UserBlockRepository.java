package com.groupys.repository;

import com.groupys.model.UserBlock;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class UserBlockRepository implements PanacheRepositoryBase<UserBlock, UUID> {

    public Optional<UserBlock> findByPair(UUID blockerId, UUID blockedId) {
        return find("blocker.id = ?1 and blocked.id = ?2", blockerId, blockedId).firstResultOptional();
    }

    /** True if {@code blockerId} has blocked {@code blockedId} (one direction only). */
    public boolean isBlocked(UUID blockerId, UUID blockedId) {
        return count("blocker.id = ?1 and blocked.id = ?2", blockerId, blockedId) > 0;
    }

    /** True if either user has blocked the other (used to gate chat/matching). */
    public boolean blockExistsBetween(UUID userId1, UUID userId2) {
        return count("(blocker.id = ?1 and blocked.id = ?2) or (blocker.id = ?2 and blocked.id = ?1)",
                userId1, userId2) > 0;
    }

    /** Blocks the given user created, most recent first. */
    public List<UserBlock> findByBlocker(UUID blockerId) {
        return find("blocker.id = ?1 order by createdAt desc", blockerId).list();
    }

    /** IDs the given user has blocked. */
    public Set<UUID> blockedUserIds(UUID blockerId) {
        return getEntityManager()
                .createQuery("select b.blocked.id from UserBlock b where b.blocker.id = :uid", UUID.class)
                .setParameter("uid", blockerId)
                .getResultStream()
                .collect(Collectors.toSet());
    }

    /**
     * All user IDs involved in a block with the given user, in either direction — users they
     * blocked plus users who blocked them. Used to hide content both ways.
     */
    public Set<UUID> blockedUserIdsInvolving(UUID userId) {
        return getEntityManager()
                .createQuery("""
                        select case when b.blocker.id = :uid then b.blocked.id else b.blocker.id end
                        from UserBlock b
                        where b.blocker.id = :uid or b.blocked.id = :uid
                        """, UUID.class)
                .setParameter("uid", userId)
                .getResultStream()
                .collect(Collectors.toSet());
    }
}
