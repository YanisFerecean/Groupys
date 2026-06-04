package com.groupys.mapper;

import com.groupys.dto.AlbumResDto;
import com.groupys.dto.ArtistResDto;
import com.groupys.dto.TrackResDto;
import com.groupys.dto.apple.AppleCatalogSong;
import com.groupys.model.Album;
import com.groupys.model.Track;
import com.groupys.service.AppleCatalogEntityService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class TrackMapper {

    @Inject
    ArtistMapper artistMapper;

    @Inject
    AlbumMapper albumMapper;

    @Inject
    AppleCatalogEntityService entityService;

    public TrackResDto toResDto(Long id, AppleCatalogSong song, ArtistResDto artistDto, AlbumResDto albumDto) {
        return new TrackResDto(
                id,
                song.name(),
                song.previewUrl(),
                song.durationInMillis() != null ? Math.max(song.durationInMillis() / 1000, 0) : null,
                null,
                artistDto,
                albumDto
        );
    }

    public TrackResDto toResDto(Track entity) {
        ArtistResDto artistDto = entity.getArtist() != null ? artistMapper.toResDto(entity.getArtist()) : null;
        AlbumResDto albumDto = entity.getAlbum() != null ? albumMapper.toResDto(entity.getAlbum()) : null;
        return new TrackResDto(
                entity.getId(),
                entity.getTitle(),
                entity.getPreview(),
                entity.getDuration(),
                entity.getRank(),
                artistDto,
                albumDto
        );
    }

    public AlbumResDto toAlbumReference(Long id, String title, String artworkTemplate, Integer artworkWidth, Integer artworkHeight) {
        if (id == null && (title == null || title.isBlank()) && (artworkTemplate == null || artworkTemplate.isBlank())) {
            return null;
        }
        return new AlbumResDto(
                id,
                title,
                entityService.buildArtworkUrl(artworkTemplate, artworkWidth, artworkHeight, 120),
                entityService.buildArtworkUrl(artworkTemplate, artworkWidth, artworkHeight, 300),
                entityService.buildArtworkUrl(artworkTemplate, artworkWidth, artworkHeight, 600),
                entityService.buildArtworkUrl(artworkTemplate, artworkWidth, artworkHeight, 1200),
                null,
                null,
                null,
                null,
                null,
                java.util.List.of(),
                null,
                java.util.List.of()
        );
    }
}
