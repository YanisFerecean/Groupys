package com.groupys.service;

import com.groupys.client.DeezerClient;
import com.groupys.dto.AlbumResDto;
import com.groupys.dto.ArtistResDto;
import com.groupys.dto.deezer.DeezerAlbumDto;
import com.groupys.dto.deezer.DeezerAlbumSearchResponse;
import com.groupys.mapper.AlbumMapper;
import com.groupys.model.Album;
import com.groupys.repository.AlbumRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
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
    AlbumRepository albumRepository;

    @Inject
    ArtistService artistService;

    public List<AlbumResDto> search(String query, int limit) {
        DeezerAlbumSearchResponse response = deezerClient.searchAlbums(query, limit);
        if (response == null || response.data() == null) {
            return Collections.emptyList();
        }
        return response.data().stream()
                .map(this::enrichAlbum)
                .toList();
    }

    public AlbumResDto getById(Long id) {
        Album existing = albumRepository.findById(id);
        if (existing != null) {
            return albumMapper.toResDto(existing);
        }

        try {
            DeezerAlbumDto deezerAlbum = deezerClient.getAlbumById(id);
            if (deezerAlbum == null) {
                return null;
            }
            return enrichAlbum(deezerAlbum);
        } catch (Exception e) {
            return null;
        }
    }

    private AlbumResDto enrichAlbum(DeezerAlbumDto deezer) {
        ArtistResDto artist = null;
        if (deezer.artist() != null) {
            artist = artistService.resolveByName(deezer.artist().name());
        }

        return new AlbumResDto(
                deezer.id(),
                deezer.title(),
                deezer.coverSmall(),
                deezer.coverMedium(),
                deezer.coverBig(),
                deezer.coverXl(),
                artist
        );
    }
}
