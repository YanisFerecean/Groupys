package com.groupys.repository;

import com.groupys.model.UserGenrePreference;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class UserGenrePreferenceRepository implements PanacheRepositoryBase<UserGenrePreference, UUID> {

    public List<UserGenrePreference> findByUser(UUID userId) {
        return find("user.id = ?1 order by normalizedScore desc", userId).list();
    }

    public void deleteByUser(UUID userId) {
        delete("user.id", userId);
    }
}
