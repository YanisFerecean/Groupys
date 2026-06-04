package com.groupys.service;

import com.groupys.dto.AlbumResDto;
import com.groupys.dto.ArtistResDto;
import com.groupys.dto.apple.AppleCatalogAlbum;
import com.groupys.mapper.AlbumMapper;
import com.groupys.mapper.ArtistMapper;
import com.groupys.model.Album;
import com.groupys.repository.AlbumRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.Collections;
import java.util.List;

@ApplicationScoped
public class AlbumService {

    @Inject
    AppleCatalogService appleCatalogService;

    @Inject
    AppleCatalogEntityService entityService;

    @Inject
    AlbumMapper albumMapper;

    @Inject
    ArtistMapper artistMapper;

    @Inject
    AlbumRepository albumRepository;

    public List<AlbumResDto> search(String query, int limit) {
        var response = appleCatalogService.search(appleCatalogService.resolveStorefront(null), query, limit);
        if (response == null || response.albums() == null) {
            return Collections.emptyList();
        }
        return response.albums().stream()
                .limit(Math.max(limit, 0))
                .map(this::upsertAndMap)
                .filter(dto -> dto != null)
                .toList();
    }

    @Transactional
    public AlbumResDto getById(Long id) {
        Album existing = albumRepository.findById(id);
        if (existing == null) {
            return null;
        }
        if (existing.getAppleMusicId() == null || existing.getAppleMusicId().isBlank()) {
            return albumMapper.toResDto(existing);
        }

        return appleCatalogService.getAlbum(appleCatalogService.resolveStorefront(null), existing.getAppleMusicId())
                .map(this::upsertAndMap)
                .orElseGet(() -> albumMapper.toResDto(existing));
    }

    private AlbumResDto upsertAndMap(AppleCatalogAlbum album) {
        Album entity = entityService.upsertAlbum(album);
        if (entity == null) {
            return null;
        }
        ArtistResDto artistDto = entity.getArtist() != null ? artistMapper.toResDto(entity.getArtist()) : null;
        return albumMapper.toResDto(entity.getId(), album, artistDto);
    }
}
