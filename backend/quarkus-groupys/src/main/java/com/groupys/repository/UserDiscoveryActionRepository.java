package com.groupys.repository;

import com.groupys.model.UserDiscoveryAction;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class UserDiscoveryActionRepository implements PanacheRepositoryBase<UserDiscoveryAction, UUID> {

    public Set<UUID> findSuppressedCommunityIds(UUID userId) {
        return find("""
                user.id = ?1 and targetCommunity is not null
                and actionType in ('DISMISS','HIDE')
                and (expiresAt is null or expiresAt > ?2)
                """, userId, Instant.now())
                .list().stream()
                .map(action -> action.targetCommunity.id)
                .collect(Collectors.toSet());
    }

    public Set<UUID> findSuppressedUserIds(UUID userId) {
        return find("""
                user.id = ?1 and targetUser is not null
                and actionType in ('DISMISS','HIDE')
                and (expiresAt is null or expiresAt > ?2)
                """, userId, Instant.now())
                .list().stream()
                .map(action -> action.targetUser.id)
                .collect(Collectors.toSet());
    }

    public List<UserDiscoveryAction> findByUser(UUID userId) {
        return find("user.id = ?1 order by createdAt desc", userId).list();
    }
}
