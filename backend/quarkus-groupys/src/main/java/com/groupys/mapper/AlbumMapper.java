package com.groupys.mapper;

import com.groupys.dto.AlbumResDto;
import com.groupys.dto.ArtistResDto;
import com.groupys.dto.deezer.DeezerAlbumDto;
import com.groupys.model.Album;
import com.groupys.model.Artist;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class AlbumMapper {

    @Inject
    ArtistMapper artistMapper;

    public AlbumResDto toResDto(DeezerAlbumDto deezer) {
        ArtistResDto artistDto = null;
        if (deezer.artist() != null) {
            artistDto = artistMapper.toResDto(deezer.artist());
        }

        return new AlbumResDto(
                deezer.id(),
                deezer.title(),
                deezer.coverSmall(),
                deezer.coverMedium(),
                deezer.coverBig(),
                deezer.coverXl(),
                artistDto
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
                artistDto
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
        album.setArtist(artist);
        return album;
    }
}
