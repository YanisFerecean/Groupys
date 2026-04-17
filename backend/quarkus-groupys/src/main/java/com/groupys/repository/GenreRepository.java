package com.groupys.repository;

import com.groupys.model.Genre;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@ApplicationScoped
public class GenreRepository implements PanacheRepository<Genre> {

    public List<Genre> search(String query) {
        if (query == null || query.isBlank()) {
            return listAll(io.quarkus.panache.common.Sort.ascending("name"));
        }
        return list("LOWER(name) LIKE LOWER(CONCAT('%', ?1, '%'))",
                io.quarkus.panache.common.Sort.ascending("name"), query);
    }

    public Optional<Genre> findByNameIgnoreCase(String name) {
        return find("LOWER(name) = LOWER(?1)", name).firstResultOptional();
    }

    public Optional<Genre> findByDeezerId(Long deezerId) {
        if (deezerId == null) {
            return Optional.empty();
        }
        return find("deezerId", deezerId).firstResultOptional();
    }

    /**
     * Batch load genres by IDs - eliminates N+1 query problem
     */
    public Map<Long, Genre> findByIdsMap(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Map.of();
        }
        return find("id in ?1", ids).stream()
                .collect(Collectors.toMap(g -> g.id, g -> g, (a, b) -> a, java.util.HashMap::new));
    }

    /**
     * Batch load genre names by IDs - eliminates N+1 query problem
     */
    public Map<Long, String> findNamesByIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Map.of();
        }
        return find("id in ?1", ids).project(GenreIdName.class).stream()
                .collect(Collectors.toMap(g -> g.id, g -> g.name, (n1, n2) -> n1, java.util.HashMap::new));
    }

    /**
     * Projection class for efficient batch queries
     */
    public static class GenreIdName {
        public final Long id;
        public final String name;

        public GenreIdName(Long id, String name) {
            this.id = id;
            this.name = name;
        }
    }
}
