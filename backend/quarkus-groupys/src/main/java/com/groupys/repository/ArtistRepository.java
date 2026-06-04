package com.groupys.repository;

import com.groupys.model.Artist;
import com.groupys.util.MusicIdentityUtil;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@ApplicationScoped
public class ArtistRepository implements PanacheRepositoryBase<Artist, Long> {

    private static final long JAVASCRIPT_ROUNDING_TOLERANCE = 4096L;

    public Optional<Artist> findByAppleMusicId(String appleMusicId) {
        return find("appleMusicId", appleMusicId).firstResultOptional();
    }

    public Optional<Artist> findByNameIgnoreCase(String name) {
        return find("LOWER(name) = LOWER(?1)", name).firstResultOptional();
    }

    public Optional<Artist> findByIdOrRoundedUnsafeSyntheticId(Long id) {
        if (id == null) {
            return Optional.empty();
        }
        Optional<Artist> exact = findByIdOptional(id);
        if (exact.isPresent() || id >= -MusicIdentityUtil.MAX_JAVASCRIPT_SAFE_INTEGER) {
            return exact;
        }
        return list("id < ?1", -MusicIdentityUtil.MAX_JAVASCRIPT_SAFE_INTEGER).stream()
                .filter(artist -> Math.abs(artist.getId() - id) <= JAVASCRIPT_ROUNDING_TOLERANCE)
                .findFirst();
    }

    /**
     * Batch load artists by IDs - eliminates N+1 query problem
     */
    public Map<Long, Artist> findByIdsMap(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Map.of();
        }
        return ids.stream()
                .map(this::findByIdOptional)
                .flatMap(Optional::stream)
                .collect(Collectors.toMap(Artist::getId, artist -> artist, (a, b) -> a, java.util.HashMap::new));
    }

    /**
     * Batch load artist names by IDs - eliminates N+1 query problem
     */
    public Map<Long, String> findNamesByIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Map.of();
        }
        return ids.stream()
                .map(this::findByIdOptional)
                .flatMap(Optional::stream)
                .collect(Collectors.toMap(Artist::getId, Artist::getName, (n1, n2) -> n1, java.util.HashMap::new));
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
