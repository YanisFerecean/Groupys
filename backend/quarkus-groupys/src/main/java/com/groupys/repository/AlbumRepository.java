package com.groupys.repository;

import com.groupys.model.Album;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;

@ApplicationScoped
public class AlbumRepository implements PanacheRepositoryBase<Album, Long> {

    public Optional<Album> findByAppleMusicId(String appleMusicId) {
        return find("appleMusicId", appleMusicId).firstResultOptional();
    }

    public Optional<Album> findByTitleAndArtistNameIgnoreCase(String title, String artistName) {
        if (title == null || title.isBlank() || artistName == null || artistName.isBlank()) {
            return Optional.empty();
        }
        return find("LOWER(title) = LOWER(?1) and LOWER(artist.name) = LOWER(?2)", title, artistName)
                .firstResultOptional();
    }
}
