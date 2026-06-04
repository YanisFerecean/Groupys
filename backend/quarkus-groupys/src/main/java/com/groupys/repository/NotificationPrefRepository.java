package com.groupys.repository;

import com.groupys.model.NotificationPref;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class NotificationPrefRepository implements PanacheRepositoryBase<NotificationPref, UUID> {

    public Optional<NotificationPref> findByUser(UUID userId) {
        return find("user.id", userId).firstResultOptional();
    }

    /** userId -> pref for the given users (missing entries imply all-default). */
    public Map<UUID, NotificationPref> findByUsers(List<UUID> userIds) {
        if (userIds.isEmpty()) return Map.of();
        return find("user.id in ?1", userIds).stream()
                .collect(Collectors.toMap(p -> p.user.id, p -> p));
    }
}
