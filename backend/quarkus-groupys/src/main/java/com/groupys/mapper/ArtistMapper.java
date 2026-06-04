package com.groupys.mapper;

import com.groupys.dto.ArtistResDto;
import com.groupys.dto.apple.AppleCatalogArtist;
import com.groupys.model.Artist;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class ArtistMapper {

    public ArtistResDto toResDto(Long id, AppleCatalogArtist artist, List<String> images) {
        return new ArtistResDto(
                id,
                artist != null ? artist.name() : null,
                images,
                null,
                null,
                artist != null ? firstNonBlank(artist.editorialNotesStandard(), artist.editorialNotesShort()) : null,
                artist != null ? pickGenre(artist.genreNames()) : null
        );
    }

    public ArtistResDto toResDto(Artist entity) {
        return toResDto(entity, null);
    }

    public ArtistResDto toResDto(Artist entity, String genreOverride) {
        String genre = (genreOverride != null && !genreOverride.isBlank())
                ? genreOverride.trim()
                : (entity.getPrimaryGenre() != null ? entity.getPrimaryGenre().name : null);
        return new ArtistResDto(
                entity.getId(),
                entity.getName(),
                entity.getImages(),
                entity.getListeners(),
                entity.getPlaycount(),
                entity.getSummary(),
                genre
        );
    }

    public String pickGenre(List<String> genreNames) {
        if (genreNames == null) {
            return null;
        }
        String fallback = null;
        for (String value : genreNames) {
            if (value == null || value.isBlank()) {
                continue;
            }
            String trimmed = value.trim();
            if (fallback == null) {
                fallback = trimmed;
            }
            if (!trimmed.equalsIgnoreCase("Music")) {
                return trimmed;
            }
        }
        return fallback;
    }

    private String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first;
        }
        if (second != null && !second.isBlank()) {
            return second;
        }
        return null;
    }
}
