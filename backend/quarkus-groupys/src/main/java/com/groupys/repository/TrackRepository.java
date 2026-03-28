package com.groupys.repository;

import com.groupys.model.Track;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;

@ApplicationScoped
public class TrackRepository implements PanacheRepositoryBase<Track, Long> {

    public Optional<Track> findBySpotifyId(String spotifyId) {
        return find("spotifyId", spotifyId).firstResultOptional();
    }
}
