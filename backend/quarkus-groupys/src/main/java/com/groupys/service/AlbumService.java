package com.groupys.service;

import com.groupys.client.DeezerClient;
import com.groupys.dto.AlbumResDto;
import com.groupys.dto.deezer.DeezerAlbumDto;
import com.groupys.dto.deezer.DeezerAlbumSearchResponse;
import com.groupys.mapper.AlbumMapper;
import com.groupys.mapper.ArtistMapper;
import com.groupys.model.Album;
import com.groupys.model.Artist;
import com.groupys.repository.AlbumRepository;
import com.groupys.repository.ArtistRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.rest.client.inject.RestClient;

import java.util.Collections;
import java.util.List;

@ApplicationScoped
public class AlbumService {

    @Inject
    @RestClient
    DeezerClient deezerClient;

    @Inject
    AlbumMapper albumMapper;

    @Inject
    ArtistMapper artistMapper;

    @Inject
    AlbumRepository albumRepository;

    @Inject
    ArtistRepository artistRepository;

    public List<AlbumResDto> search(String query, int limit) {
        DeezerAlbumSearchResponse response = deezerClient.searchAlbums(query, limit);
        if (response == null || response.data() == null) {
            return Collections.emptyList();
        }
        return response.data().stream()
                .map(this::enrichAlbum)
                .toList();
    }

    @Transactional
    public AlbumResDto getById(Long id) {
        Album existing = albumRepository.findById(id);

        DeezerAlbumDto deezerAlbum;
        try {
            deezerAlbum = deezerClient.getAlbumById(id);
        } catch (Exception e) {
            deezerAlbum = null;
        }

        if (deezerAlbum == null) {
            return existing != null ? albumMapper.toResDto(existing) : null;
        }

        Artist artist = resolveArtistEntity(deezerAlbum);
        if (existing == null) {
            albumRepository.persist(albumMapper.toEntity(deezerAlbum, artist));
        } else {
            mergeAlbum(existing, deezerAlbum, artist);
        }
        return albumMapper.toResDto(deezerAlbum);
    }

    private void mergeAlbum(Album existing, DeezerAlbumDto deezer, Artist artist) {
        existing.setTitle(deezer.title());
        existing.setCoverSmall(deezer.coverSmall());
        existing.setCoverMedium(deezer.coverMedium());
        existing.setCoverBig(deezer.coverBig());
        existing.setCoverXl(deezer.coverXl());
        if (deezer.releaseDate() != null) existing.setReleaseDate(deezer.releaseDate());
        if (deezer.label() != null) existing.setLabel(deezer.label());
        if (deezer.duration() != null) existing.setDuration(deezer.duration());
        if (deezer.nbTracks() != null) existing.setNbTracks(deezer.nbTracks());
        if (deezer.fans() != null) existing.setFans(deezer.fans());
        if (deezer.genres() != null && deezer.genres().data() != null) {
            existing.setGenres(deezer.genres().data().stream().map(g -> g.name()).toList());
        }
        if (artist != null) existing.setArtist(artist);
    }

    private Artist resolveArtistEntity(DeezerAlbumDto deezer) {
        if (deezer.artist() == null || deezer.artist().id() == null) {
            return null;
        }
        Artist existing = artistRepository.findById(deezer.artist().id());
        if (existing != null) {
            return existing;
        }
        Artist artist = artistMapper.toEntity(deezer.artist(), null);
        artistRepository.persist(artist);
        return artist;
    }

    private AlbumResDto enrichAlbum(DeezerAlbumDto deezer) {
        return albumMapper.toResDto(deezer);
    }
}
