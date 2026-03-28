package com.groupys.repository;

import com.groupys.model.UserTrackPreference;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.UUID;

@ApplicationScoped
public class UserTrackPreferenceRepository implements PanacheRepositoryBase<UserTrackPreference, UUID> {

    public void deleteByUser(UUID userId) {
        delete("user.id", userId);
    }
}
