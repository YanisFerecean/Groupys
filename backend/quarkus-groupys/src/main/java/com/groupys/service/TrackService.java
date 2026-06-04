package com.groupys.service;

import com.groupys.dto.AlbumResDto;
import com.groupys.dto.ArtistResDto;
import com.groupys.dto.TrackResDto;
import com.groupys.dto.apple.AppleCatalogSong;
import com.groupys.mapper.AlbumMapper;
import com.groupys.mapper.ArtistMapper;
import com.groupys.mapper.TrackMapper;
import com.groupys.model.Track;
import com.groupys.repository.TrackRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.Collections;
import java.util.List;

@ApplicationScoped
public class TrackService {

    @Inject
    AppleCatalogService appleCatalogService;

    @Inject
    AppleCatalogEntityService entityService;

    @Inject
    ArtistMapper artistMapper;

    @Inject
    AlbumMapper albumMapper;

    @Inject
    TrackMapper trackMapper;

    @Inject
    TrackRepository trackRepository;

    public List<TrackResDto> search(String query, int limit) {
        var response = appleCatalogService.search(appleCatalogService.resolveStorefront(null), query, limit);
        if (response == null || response.songs() == null) {
            return Collections.emptyList();
        }
        return response.songs().stream()
                .limit(Math.max(limit, 0))
                .map(this::upsertAndMap)
                .filter(dto -> dto != null)
                .toList();
    }

    @Transactional
    public TrackResDto getById(Long id) {
        Track existing = trackRepository.findById(id);
        if (existing == null) {
            return null;
        }
        if (existing.getAppleMusicId() == null || existing.getAppleMusicId().isBlank()) {
            return trackMapper.toResDto(existing);
        }

        return appleCatalogService.getSong(appleCatalogService.resolveStorefront(null), existing.getAppleMusicId())
                .map(this::upsertAndMap)
                .orElseGet(() -> trackMapper.toResDto(existing));
    }

    private TrackResDto upsertAndMap(AppleCatalogSong song) {
        Track track = entityService.upsertTrack(song);
        if (track == null) {
            return null;
        }
        ArtistResDto artistDto = track.getArtist() != null ? artistMapper.toResDto(track.getArtist()) : null;
        AlbumResDto albumDto = track.getAlbum() != null
                ? albumMapper.toResDto(track.getAlbum())
                : trackMapper.toAlbumReference(
                        song.albumId() != null ? com.groupys.util.MusicIdentityUtil.syntheticAlbumId(song.albumId(), song.albumName(), song.artistName()) : null,
                        song.albumName(),
                        song.artworkUrlTemplate(),
                        song.artworkWidth(),
                        song.artworkHeight()
                );
        return trackMapper.toResDto(track.getId(), song, artistDto, albumDto);
    }
}
