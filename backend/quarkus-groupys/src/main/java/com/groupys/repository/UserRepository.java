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

    /** Single query: returns a map of userId -> clerkId for all given user IDs. */
    public Map<UUID, String> findClerkIdsByUserIds(List<UUID> userIds) {
        if (userIds.isEmpty()) return Map.of();
        return find("id IN ?1", userIds).stream()
                .collect(Collectors.toMap(u -> u.id, u -> u.clerkId));
    }
}
