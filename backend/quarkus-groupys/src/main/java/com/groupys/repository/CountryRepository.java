package com.groupys.repository;

import com.groupys.model.Country;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class CountryRepository implements PanacheRepository<Country> {

    public List<Country> search(String query) {
        if (query == null || query.isBlank()) {
            return listAll(io.quarkus.panache.common.Sort.ascending("name"));
        }
        return list("LOWER(name) LIKE LOWER(CONCAT('%', ?1, '%'))",
                io.quarkus.panache.common.Sort.ascending("name"), query);
    }
}
