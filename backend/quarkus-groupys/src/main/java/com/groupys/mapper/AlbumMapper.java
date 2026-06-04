package com.groupys.mapper;

import com.groupys.dto.AlbumResDto;
import com.groupys.dto.ArtistResDto;
import com.groupys.dto.apple.AppleCatalogAlbum;
import com.groupys.dto.apple.AppleCatalogSong;
import com.groupys.model.Album;
import com.groupys.service.AppleCatalogEntityService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.Collections;
import java.util.List;

@ApplicationScoped
public class AlbumMapper {

    @Inject
    ArtistMapper artistMapper;

    @Inject
    AppleCatalogEntityService entityService;

    public AlbumResDto toResDto(Long id, AppleCatalogAlbum album, ArtistResDto artistDto) {
        List<AlbumResDto.TrackDto> tracks = album.tracks() == null
                ? List.of()
                : album.tracks().stream()
                .map(track -> toTrackDto(track))
                .toList();

        Integer duration = null;
        if (album.tracks() != null && !album.tracks().isEmpty()) {
            int totalMillis = album.tracks().stream()
                    .filter(track -> track != null && track.durationInMillis() != null)
                    .mapToInt(AppleCatalogSong::durationInMillis)
                    .sum();
            duration = totalMillis > 0 ? totalMillis / 1000 : null;
        }

        return new AlbumResDto(
                id,
                album.name(),
                entityService.buildArtworkUrl(album.artworkUrlTemplate(), album.artworkWidth(), album.artworkHeight(), 120),
                entityService.buildArtworkUrl(album.artworkUrlTemplate(), album.artworkWidth(), album.artworkHeight(), 300),
                entityService.buildArtworkUrl(album.artworkUrlTemplate(), album.artworkWidth(), album.artworkHeight(), 600),
                entityService.buildArtworkUrl(album.artworkUrlTemplate(), album.artworkWidth(), album.artworkHeight(), 1200),
                album.releaseDate(),
                album.recordLabel(),
                duration,
                album.trackCount(),
                null,
                album.genreNames() != null ? album.genreNames() : List.of(),
                artistDto,
                tracks
        );
    }

    public AlbumResDto toResDto(Album entity) {
        ArtistResDto artistDto = entity.getArtist() != null ? artistMapper.toResDto(entity.getArtist()) : null;
        return new AlbumResDto(
                entity.getId(),
                entity.getTitle(),
                entity.getCoverSmall(),
                entity.getCoverMedium(),
                entity.getCoverBig(),
                entity.getCoverXl(),
                entity.getReleaseDate(),
                entity.getLabel(),
                entity.getDuration(),
                entity.getNbTracks(),
                entity.getFans(),
                entity.getGenres(),
                artistDto,
                Collections.emptyList()
        );
    }

    private AlbumResDto.TrackDto toTrackDto(AppleCatalogSong track) {
        Long id = track.id() != null
                ? com.groupys.util.MusicIdentityUtil.syntheticTrackId(track.id(), track.name(), track.artistName())
                : null;
        return new AlbumResDto.TrackDto(
                id,
                track.name(),
                track.durationInMillis() != null ? Math.max(track.durationInMillis() / 1000, 0) : null,
                track.previewUrl(),
                track.trackNumber()
        );
    }
}
