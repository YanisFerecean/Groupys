package com.groupys.mapper;

import com.groupys.dto.AlbumResDto;
import com.groupys.dto.ArtistResDto;
import com.groupys.dto.TrackResDto;
import com.groupys.dto.deezer.DeezerTrackDto;
import com.groupys.model.Album;
import com.groupys.model.Artist;
import com.groupys.model.Track;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class TrackMapper {

    @Inject
    ArtistMapper artistMapper;

    @Inject
    AlbumMapper albumMapper;

    public TrackResDto toResDto(DeezerTrackDto deezer) {
        ArtistResDto artistDto = null;
        if (deezer.artist() != null) {
            artistDto = artistMapper.toResDto(deezer.artist());
        }

        AlbumResDto albumDto = null;
        if (deezer.album() != null) {
            albumDto = albumMapper.toResDto(deezer.album());
        }

        return new TrackResDto(
                deezer.id(),
                deezer.title(),
                deezer.preview(),
                deezer.duration(),
                deezer.rank(),
                artistDto,
                albumDto
        );
    }

    public TrackResDto toResDto(Track entity) {
        ArtistResDto artistDto = null;
        if (entity.getArtist() != null) {
            artistDto = artistMapper.toResDto(entity.getArtist());
        }

        AlbumResDto albumDto = null;
        if (entity.getAlbum() != null) {
            albumDto = albumMapper.toResDto(entity.getAlbum());
        }

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

    public Track toEntity(DeezerTrackDto deezer, Artist artist, Album album) {
        Track track = new Track();
        track.setId(deezer.id());
        track.setTitle(deezer.title());
        track.setPreview(deezer.preview());
        track.setDuration(deezer.duration());
        track.setRank(deezer.rank());
        track.setArtist(artist);
        track.setAlbum(album);
        return track;
    }
}
