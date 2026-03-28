package com.groupys.repository;

import com.groupys.model.UserTasteProfile;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class UserTasteProfileRepository implements PanacheRepositoryBase<UserTasteProfile, UUID> {

    public Optional<UserTasteProfile> findByUserId(UUID userId) {
        return find("user.id", userId).firstResultOptional();
    }
}
