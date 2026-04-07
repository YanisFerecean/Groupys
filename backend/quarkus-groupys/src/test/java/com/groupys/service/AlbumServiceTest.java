package com.groupys.service;

import com.groupys.client.DeezerClient;
import com.groupys.dto.AlbumResDto;
import com.groupys.dto.deezer.DeezerAlbumDto;
import com.groupys.dto.deezer.DeezerAlbumSearchResponse;
import com.groupys.dto.deezer.DeezerArtistDto;
import com.groupys.dto.deezer.DeezerArtistSearchResponse;
import com.groupys.dto.deezer.DeezerTrackSearchResponse;
import com.groupys.mapper.AlbumMapper;
import com.groupys.mapper.ArtistMapper;
import com.groupys.model.Album;
import com.groupys.repository.AlbumRepository;
import com.groupys.repository.ArtistRepository;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AlbumServiceTest {

    @Test
    void getByIdSkipsPersistWhenUpstreamPayloadIsMissingId() {
        StubAlbumRepository repository = new StubAlbumRepository(null);

        AlbumService service = new AlbumService();
        service.deezerClient = new StubDeezerClient(new DeezerAlbumDto(
                null, "Broken Album", null, null, null, null, null, null, null, null, null, null, null, null
        ));
        service.albumMapper = new AlbumMapper();
        service.artistMapper = new ArtistMapper();
        service.albumRepository = repository;
        service.artistRepository = new ArtistRepository();

        AlbumResDto album = service.getById(302127L);

        assertNull(album);
        assertFalse(repository.wasPersistCalled());
        assertTrue(repository.isEmpty());
    }

    @Test
    void getByIdKeepsExistingAlbumWhenUpstreamPayloadIsMissingTitle() {
        Album existing = album(302127L, "Existing Album");

        AlbumService service = new AlbumService();
        service.deezerClient = new StubDeezerClient(new DeezerAlbumDto(
                302127L, null, null, null, null, null, null, null, null, null, null, null, null, null
        ));
        service.albumMapper = new AlbumMapper();
        service.artistMapper = new ArtistMapper();
        service.albumRepository = new StubAlbumRepository(existing);
        service.artistRepository = new ArtistRepository();

        AlbumResDto album = service.getById(302127L);

        assertEquals("Existing Album", album.title());
    }

    private static Album album(Long id, String title) {
        Album album = new Album();
        album.setId(id);
        album.setTitle(title);
        album.setGenres(List.of());
        return album;
    }

    private static final class StubAlbumRepository extends AlbumRepository {

        private final Map<Long, Album> albums = new HashMap<>();
        private boolean persistCalled;

        private StubAlbumRepository(Album initialAlbum) {
            if (initialAlbum != null) {
                albums.put(initialAlbum.getId(), initialAlbum);
            }
        }

        @Override
        public Album findById(Long id) {
            return albums.get(id);
        }

        @Override
        public void persist(Album entity) {
            persistCalled = true;
            albums.put(entity.getId(), entity);
        }

        private boolean wasPersistCalled() {
            return persistCalled;
        }

        private boolean isEmpty() {
            return albums.isEmpty();
        }
    }

    private static final class StubDeezerClient implements DeezerClient {

        private final DeezerAlbumDto album;

        private StubDeezerClient(DeezerAlbumDto album) {
            this.album = album;
        }

        @Override
        public DeezerArtistSearchResponse searchArtists(String query, int limit) {
            throw new UnsupportedOperationException("Not used in this test");
        }

        @Override
        public DeezerAlbumSearchResponse searchAlbums(String query, int limit) {
            throw new UnsupportedOperationException("Not used in this test");
        }

        @Override
        public DeezerTrackSearchResponse searchTracks(String query, int limit) {
            throw new UnsupportedOperationException("Not used in this test");
        }

        @Override
        public DeezerArtistDto getArtistById(Long id) {
            throw new UnsupportedOperationException("Not used in this test");
        }

        @Override
        public DeezerAlbumDto getAlbumById(Long id) {
            return album;
        }

        @Override
        public DeezerTrackSearchResponse getArtistTopTracks(Long id, int limit) {
            throw new UnsupportedOperationException("Not used in this test");
        }

        @Override
        public com.groupys.dto.deezer.DeezerGenreListResponse getGenres() {
            throw new UnsupportedOperationException("Not used in this test");
        }

        @Override
        public DeezerArtistSearchResponse getArtistsByGenre(Long id) {
            throw new UnsupportedOperationException("Not used in this test");
        }
    }
}
