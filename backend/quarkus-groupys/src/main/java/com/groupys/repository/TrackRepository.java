package com.groupys.repository;

import com.groupys.model.Track;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;

@ApplicationScoped
public class TrackRepository implements PanacheRepositoryBase<Track, Long> {

    public Optional<Track> findByAppleMusicId(String appleMusicId) {
        return find("appleMusicId", appleMusicId).firstResultOptional();
    }

    public Optional<Track> findByExternalIsrc(String isrc) {
        if (isrc == null || isrc.isBlank()) {
            return Optional.empty();
        }
        return find("externalIsrc", isrc).firstResultOptional();
    }

    public Optional<Track> findByTitleAndArtistNameIgnoreCase(String title, String artistName) {
        if (title == null || title.isBlank() || artistName == null || artistName.isBlank()) {
            return Optional.empty();
        }
        return find("LOWER(title) = LOWER(?1) and LOWER(artist.name) = LOWER(?2)", title, artistName)
                .firstResultOptional();
    }
}
