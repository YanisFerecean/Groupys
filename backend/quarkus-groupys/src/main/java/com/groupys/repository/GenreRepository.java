package com.groupys.repository;

import com.groupys.model.Genre;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class GenreRepository implements PanacheRepository<Genre> {

    public List<Genre> search(String query) {
        if (query == null || query.isBlank()) {
            return listAll(io.quarkus.panache.common.Sort.ascending("name"));
        }
        return list("LOWER(name) LIKE LOWER(CONCAT('%', ?1, '%'))",
                io.quarkus.panache.common.Sort.ascending("name"), query);
    }
}
