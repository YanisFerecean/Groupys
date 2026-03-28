package com.groupys.repository;

import com.groupys.model.UserMatch;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class UserMatchRepository implements PanacheRepositoryBase<UserMatch, UUID> {

    /**
     * Find a match between two users using canonical pair ordering (smaller UUID = userA).
     */
    public Optional<UserMatch> findByUsers(UUID userId1, UUID userId2) {
        UUID userAId = userId1.compareTo(userId2) <= 0 ? userId1 : userId2;
        UUID userBId = userId1.compareTo(userId2) <= 0 ? userId2 : userId1;
        return find("userA.id = ?1 and userB.id = ?2", userAId, userBId)
                .firstResultOptional();
    }

    /**
     * Returns true if an ACTIVE match exists between the two users.
     * Used to gate chat creation and message sending.
     */
    public boolean matchExists(UUID userId1, UUID userId2) {
        UUID userAId = userId1.compareTo(userId2) <= 0 ? userId1 : userId2;
        UUID userBId = userId1.compareTo(userId2) <= 0 ? userId2 : userId1;
        return count("userA.id = ?1 and userB.id = ?2 and status = 'ACTIVE'", userAId, userBId) > 0;
    }

    /**
     * Returns all ACTIVE matches where the given user is either userA or userB,
     * ordered by most recently matched first.
     */
    public List<UserMatch> findActiveMatchesByUser(UUID userId) {
        return find("""
                (userA.id = ?1 or userB.id = ?1) and status = 'ACTIVE'
                order by createdAt desc
                """, userId)
                .list();
    }

    /**
     * Finds a specific match by ID, verifying the requesting user is a participant.
     */
    public Optional<UserMatch> findByIdAndUser(UUID matchId, UUID userId) {
        return find("id = ?1 and (userA.id = ?2 or userB.id = ?2)", matchId, userId)
                .firstResultOptional();
    }
}
