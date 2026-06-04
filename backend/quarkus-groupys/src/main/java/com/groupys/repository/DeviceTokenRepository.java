package com.groupys.repository;

import com.groupys.model.DeviceToken;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class DeviceTokenRepository implements PanacheRepositoryBase<DeviceToken, UUID> {

    public Optional<DeviceToken> findByToken(String expoToken) {
        return find("expoToken", expoToken).firstResultOptional();
    }

    public List<DeviceToken> findByUser(UUID userId) {
        return find("user.id", userId).list();
    }

    /** Active Expo tokens for a set of users — one query, used for fan-out sends. */
    public List<DeviceToken> findByUsers(List<UUID> userIds) {
        if (userIds.isEmpty()) return List.of();
        return find("user.id in ?1", userIds).list();
    }

    public long deleteByToken(String expoToken) {
        return delete("expoToken", expoToken);
    }
}
