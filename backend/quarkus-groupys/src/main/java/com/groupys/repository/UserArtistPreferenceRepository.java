package com.groupys.repository;

import com.groupys.model.UserArtistPreference;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class UserArtistPreferenceRepository implements PanacheRepositoryBase<UserArtistPreference, UUID> {

    public List<UserArtistPreference> findByUser(UUID userId) {
        return find("user.id = ?1 order by normalizedScore desc", userId).list();
    }

    public void deleteByUser(UUID userId) {
        delete("user.id", userId);
    }
}
