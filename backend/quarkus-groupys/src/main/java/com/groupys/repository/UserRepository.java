package com.groupys.repository;

import com.groupys.model.User;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class UserRepository implements PanacheRepositoryBase<User, UUID> {

    public Optional<User> findByUsername(String username) {
        return find("username", username).firstResultOptional();
    }

    public Optional<User> findByClerkId(String clerkId) {
        return find("clerkId", clerkId).firstResultOptional();
    }

    public List<User> searchByUsernameOrDisplayName(String query, UUID excludeUserId, int limit) {
        String normalized = "%" + query.toLowerCase() + "%";
        return getEntityManager().createQuery(
                "SELECT u FROM User u " +
                "WHERE (:excludeUserId IS NULL OR u.id <> :excludeUserId) " +
                "AND (" +
                "LOWER(u.username) LIKE :query " +
                "OR LOWER(COALESCE(u.displayName, '')) LIKE :query" +
                ") " +
                "ORDER BY LOWER(u.username) ASC",
                User.class
        )
                .setParameter("excludeUserId", excludeUserId)
                .setParameter("query", normalized)
                .setMaxResults(limit)
                .getResultList();
    }

    public List<User> listDiscoveryVisible(UUID excludeUserId) {
        return find("id <> ?1 and discoveryVisible = true and recommendationOptOut = false", excludeUserId).list();
    }

    public List<UUID> listActiveDiscoveryUserIds() {
        return getEntityManager().createQuery(
                "select u.id from User u where u.discoveryVisible = true and u.recommendationOptOut = false",
                UUID.class
        ).getResultList();
    }

    /** Single query: returns a map of userId -> clerkId for all given user IDs. */
    public Map<UUID, String> findClerkIdsByUserIds(List<UUID> userIds) {
        if (userIds.isEmpty()) return Map.of();
        return find("id IN ?1", userIds).stream()
                .collect(Collectors.toMap(u -> u.id, u -> u.clerkId));
    }
}
