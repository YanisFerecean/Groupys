package com.groupys.repository;

import com.groupys.model.UserTrackPreference;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class UserTrackPreferenceRepository implements PanacheRepositoryBase<UserTrackPreference, UUID> {

    public void deleteByUser(UUID userId) {
        delete("user.id", userId);
    }

    public List<UserTrackPreference> findByUser(UUID userId) {
        return find("user.id", userId).list();
    }
}
