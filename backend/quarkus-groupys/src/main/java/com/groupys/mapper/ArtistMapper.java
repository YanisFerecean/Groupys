package com.groupys.mapper;

import com.groupys.dto.ArtistResDto;
import com.groupys.dto.deezer.DeezerArtistDto;
import com.groupys.dto.lastfm.LastFmArtistInfoResponse;
import com.groupys.model.Artist;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.ArrayList;
import java.util.List;

@ApplicationScoped
public class ArtistMapper {

    public ArtistResDto toResDto(DeezerArtistDto deezer) {
        return new ArtistResDto(
                deezer.id(),
                deezer.name(),
                collectImages(deezer),
                null,
                null,
                null
        );
    }

    public ArtistResDto toResDto(DeezerArtistDto deezer, LastFmArtistInfoResponse.LastFmArtistDetail lastfm) {
        Long listeners = null;
        Long playcount = null;
        String summary = null;

        if (lastfm != null) {
            if (lastfm.stats() != null) {
                listeners = parseLong(lastfm.stats().listeners());
                playcount = parseLong(lastfm.stats().playcount());
            }
            if (lastfm.bio() != null) {
                summary = lastfm.bio().summary();
            }
        }

        return new ArtistResDto(
                deezer.id(),
                deezer.name(),
                collectImages(deezer),
                listeners,
                playcount,
                summary
        );
    }

    public ArtistResDto toResDto(Artist entity) {
        return new ArtistResDto(
                entity.getId(),
                entity.getName(),
                entity.getImages(),
                entity.getListeners(),
                entity.getPlaycount(),
                entity.getSummary()
        );
    }

    public Artist toEntity(DeezerArtistDto deezer, LastFmArtistInfoResponse.LastFmArtistDetail lastfm) {
        Artist artist = new Artist();
        artist.setId(deezer.id());
        artist.setName(deezer.name());
        artist.setImages(collectImages(deezer));

        if (lastfm != null) {
            if (lastfm.stats() != null) {
                artist.setListeners(parseLong(lastfm.stats().listeners()));
                artist.setPlaycount(parseLong(lastfm.stats().playcount()));
            }
            if (lastfm.bio() != null) {
                artist.setSummary(lastfm.bio().summary());
            }
        }

        return artist;
    }

    private List<String> collectImages(DeezerArtistDto dto) {
        List<String> images = new ArrayList<>();
        if (dto.pictureSmall() != null) images.add(dto.pictureSmall());
        if (dto.pictureMedium() != null) images.add(dto.pictureMedium());
        if (dto.pictureBig() != null) images.add(dto.pictureBig());
        if (dto.pictureXl() != null) images.add(dto.pictureXl());
        return images;
    }

    private Long parseLong(String value) {
        if (value == null || value.isBlank()) return null;
        return Long.parseLong(value);
    }
}
