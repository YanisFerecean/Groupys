package com.groupys.repository;

import com.groupys.model.Artist;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@ApplicationScoped
public class ArtistRepository implements PanacheRepositoryBase<Artist, Long> {

    public Optional<Artist> findByAppleMusicId(String appleMusicId) {
        return find("appleMusicId", appleMusicId).firstResultOptional();
    }

    public Optional<Artist> findByNameIgnoreCase(String name) {
        return find("LOWER(name) = LOWER(?1)", name).firstResultOptional();
    }

    /**
     * Batch load artists by IDs - eliminates N+1 query problem
     */
    public Map<Long, Artist> findByIdsMap(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Map.of();
        }
        return find("id in ?1", ids).stream()
                .collect(Collectors.toMap(Artist::getId, artist -> artist, (a, b) -> a, java.util.HashMap::new));
    }

    /**
     * Batch load artist names by IDs - eliminates N+1 query problem
     */
    public Map<Long, String> findNamesByIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Map.of();
        }
        return find("id in ?1", ids).project(ArtistIdName.class).stream()
                .collect(Collectors.toMap(a -> a.id, a -> a.name, (n1, n2) -> n1, java.util.HashMap::new));
    }

    /**
     * Projection class for efficient batch queries
     */
    public static class ArtistIdName {
        public final Long id;
        public final String name;

        public ArtistIdName(Long id, String name) {
            this.id = id;
            this.name = name;
        }
    }
}
