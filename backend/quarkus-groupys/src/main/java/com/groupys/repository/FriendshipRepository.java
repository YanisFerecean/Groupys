package com.groupys.repository;

import com.groupys.model.Friendship;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class FriendshipRepository implements PanacheRepositoryBase<Friendship, UUID> {

    /** Any friendship row between two users regardless of direction. */
    public Optional<Friendship> findBetween(UUID userId1, UUID userId2) {
        return find(
            "(requester.id = ?1 AND recipient.id = ?2) OR (requester.id = ?2 AND recipient.id = ?1)",
            userId1, userId2
        ).firstResultOptional();
    }

    public List<Friendship> findAcceptedByUser(UUID userId) {
        return list(
            "(requester.id = ?1 OR recipient.id = ?1) AND status = ?2",
            userId, Friendship.Status.ACCEPTED
        );
    }

    public List<Friendship> findPendingReceivedBy(UUID recipientId) {
        return list("recipient.id = ?1 AND status = ?2", recipientId, Friendship.Status.PENDING);
    }

    public List<Friendship> findPendingSentBy(UUID requesterId) {
        return list("requester.id = ?1 AND status = ?2", requesterId, Friendship.Status.PENDING);
    }

    public long countAcceptedFriends(UUID userId) {
        return count(
            "(requester.id = ?1 OR recipient.id = ?1) AND status = ?2",
            userId, Friendship.Status.ACCEPTED
        );
    }

    /** Returns the IDs of all accepted friends for a user (both directions). */
    public Set<UUID> findAcceptedFriendIds(UUID userId) {
        return findAcceptedByUser(userId).stream()
                .map(f -> f.requester.id.equals(userId) ? f.recipient.id : f.requester.id)
                .collect(Collectors.toSet());
    }
}
