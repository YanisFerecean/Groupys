package com.groupys.repository;

import com.groupys.model.Community;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class CommunityRepository implements PanacheRepositoryBase<Community, UUID> {

    public Optional<Community> findByName(String name) {
        return find("name", name).firstResultOptional();
    }

    public List<Community> findByGenre(String genre) {
        return find("genre", genre).list();
    }

    public List<Community> findByCountry(String country) {
        return find("country", country).list();
    }

    public List<Community> findByArtist(Long artistId) {
        return find("artist.id", artistId).list();
    }

    public List<Community> listDiscoverable() {
        return find("visibility = 'PUBLIC' and discoveryEnabled = true").list();
    }

    public List<Community> searchByName(String query, int limit) {
        return find(
                "LOWER(name) LIKE :query AND visibility = 'PUBLIC'",
                io.quarkus.panache.common.Parameters.with("query", "%" + query.toLowerCase() + "%"))
                .page(0, limit)
                .list();
    }
}
