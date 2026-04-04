package com.groupys.repository;

import com.groupys.model.Artist;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;

@ApplicationScoped
public class ArtistRepository implements PanacheRepositoryBase<Artist, Long> {

    public Optional<Artist> findBySpotifyId(String spotifyId) {
        return find("spotifyId", spotifyId).firstResultOptional();
    }

    public Optional<Artist> findByNameIgnoreCase(String name) {
        return find("LOWER(name) = LOWER(?1)", name).firstResultOptional();
    }
}
