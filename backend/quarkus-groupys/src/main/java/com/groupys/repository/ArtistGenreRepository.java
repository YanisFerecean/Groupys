package com.groupys.repository;

import com.groupys.model.ArtistGenre;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class ArtistGenreRepository implements PanacheRepositoryBase<ArtistGenre, UUID> {

    public List<ArtistGenre> findByArtist(Long artistId) {
        return find("artist.id", artistId).list();
    }

    public Optional<ArtistGenre> findByArtistGenreSource(Long artistId, Long genreId, String source) {
        return find("artist.id = ?1 and genre.id = ?2 and source = ?3", artistId, genreId, source)
                .firstResultOptional();
    }

    public void deleteByArtist(Long artistId) {
        delete("artist.id", artistId);
    }
}
