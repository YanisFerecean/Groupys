package com.groupys.mapper;

import com.groupys.dto.AlbumResDto;
import com.groupys.dto.ArtistResDto;
import com.groupys.dto.deezer.DeezerAlbumDto;
import com.groupys.model.Album;
import com.groupys.model.Artist;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.Collections;
import java.util.List;

@ApplicationScoped
public class AlbumMapper {

    @Inject
    ArtistMapper artistMapper;

    public AlbumResDto toResDto(DeezerAlbumDto deezer) {
        ArtistResDto artistDto = null;
        if (deezer.artist() != null) {
            artistDto = artistMapper.toResDto(deezer.artist());
        }
        List<String> genres = deezer.genres() != null && deezer.genres().data() != null
                ? deezer.genres().data().stream().map(g -> g.name()).toList()
                : Collections.emptyList();
        List<AlbumResDto.TrackDto> tracks = deezer.tracks() != null && deezer.tracks().data() != null
                ? deezer.tracks().data().stream()
                        .map(t -> new AlbumResDto.TrackDto(t.id(), t.title(), t.duration(), t.preview(), t.trackPosition()))
                        .toList()
                : Collections.emptyList();

        return new AlbumResDto(
                deezer.id(),
                deezer.title(),
                deezer.coverSmall(),
                deezer.coverMedium(),
                deezer.coverBig(),
                deezer.coverXl(),
                deezer.releaseDate(),
                deezer.label(),
                deezer.duration(),
                deezer.nbTracks(),
                deezer.fans(),
                genres,
                artistDto,
                tracks
        );
    }

    public AlbumResDto toResDto(Album entity) {
        ArtistResDto artistDto = null;
        if (entity.getArtist() != null) {
            artistDto = artistMapper.toResDto(entity.getArtist());
        }

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

    public Album toEntity(DeezerAlbumDto deezer, Artist artist) {
        Album album = new Album();
        album.setId(deezer.id());
        album.setTitle(deezer.title());
        album.setCoverSmall(deezer.coverSmall());
        album.setCoverMedium(deezer.coverMedium());
        album.setCoverBig(deezer.coverBig());
        album.setCoverXl(deezer.coverXl());
        album.setReleaseDate(deezer.releaseDate());
        album.setLabel(deezer.label());
        album.setDuration(deezer.duration());
        album.setNbTracks(deezer.nbTracks());
        album.setFans(deezer.fans());
        if (deezer.genres() != null && deezer.genres().data() != null) {
            album.setGenres(deezer.genres().data().stream().map(g -> g.name()).toList());
        }
        album.setArtist(artist);
        return album;
    }
}
