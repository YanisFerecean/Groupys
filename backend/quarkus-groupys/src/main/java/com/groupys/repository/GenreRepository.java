package com.groupys.repository;

import com.groupys.model.Genre;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;

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
}
