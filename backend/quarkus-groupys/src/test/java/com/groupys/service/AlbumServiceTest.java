package com.groupys.service;

import com.groupys.dto.AlbumResDto;
import com.groupys.dto.apple.AppleCatalogAlbum;
import com.groupys.mapper.AlbumMapper;
import com.groupys.mapper.ArtistMapper;
import com.groupys.model.Album;
import com.groupys.model.Artist;
import com.groupys.repository.AlbumRepository;
import com.groupys.repository.ArtistRepository;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.lang.reflect.Field;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class AlbumServiceTest {

    @Test
    void getByIdReturnsExistingAlbumWhenNoAppleMusicIdIsStored() {
        AlbumService service = new AlbumService();
        service.albumRepository = new StubAlbumRepository(album(12L, "Stored Album", null, null));
        service.albumMapper = mapper();

        AlbumResDto album = service.getById(12L);

        assertEquals("Stored Album", album.title());
    }

    @Test
    void searchPersistsAppleAlbumsAndDerivesDurationFromTracks() {
        StubArtistRepository artistRepository = new StubArtistRepository();
        StubAlbumRepository albumRepository = new StubAlbumRepository(null);

        AppleCatalogEntityService entityService = new AppleCatalogEntityService();
        entityService.artistRepository = artistRepository;
        entityService.albumRepository = albumRepository;

        AlbumService service = new AlbumService();
        service.appleCatalogService = new StubAppleCatalogService();
        service.entityService = entityService;
        service.albumMapper = mapper();
        service.artistMapper = new ArtistMapper();
        service.albumRepository = albumRepository;

        List<AlbumResDto> albums = service.search("Album One", 5);

        assertEquals(1, albums.size());
        assertEquals(380, albums.getFirst().duration());
        assertEquals("Album One", albumRepository.findByAppleMusicId("album-1").orElseThrow().getTitle());
    }

    private static AlbumMapper mapper() {
        AlbumMapper mapper = new AlbumMapper();
        setField(mapper, "artistMapper", new ArtistMapper());
        setField(mapper, "entityService", new AppleCatalogEntityService());
        return mapper;
    }

    private static void setField(Object target, String name, Object value) {
        try {
            Field field = target.getClass().getDeclaredField(name);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Failed to set field " + name, e);
        }
    }

    private static Album album(Long id, String title, String appleMusicId, Artist artist) {
        Album album = new Album();
        album.setId(id);
        album.setTitle(title);
        album.setAppleMusicId(appleMusicId);
        album.setArtist(artist);
        album.setGenres(List.of());
        return album;
    }

    private static final class StubAppleCatalogService extends AppleCatalogService {
        @Override
        public String resolveStorefront(String country) {
            return "us";
        }

        @Override
        public com.groupys.dto.apple.AppleSearchResult search(String storefront, String term, int limit) {
            return new com.groupys.dto.apple.AppleSearchResult(
                    List.of(),
                    List.of(new AppleCatalogAlbum(
                            "album-1",
                            "Album One",
                            "Artist One",
                            "artist-1",
                            "https://image.example/{w}x{h}.jpg",
                            1200,
                            1200,
                            "2024-01-01",
                            "Label",
                            2,
                            List.of("Pop"),
                            List.of(
                                    new com.groupys.dto.apple.AppleCatalogSong("song-1", "Song One", "Artist One", "artist-1", "Album One", "album-1", null, 180000, null, null, null, List.of("Pop"), 1, null),
                                    new com.groupys.dto.apple.AppleCatalogSong("song-2", "Song Two", "Artist One", "artist-1", "Album One", "album-1", null, 200000, null, null, null, List.of("Pop"), 2, null)
                            )
                    )),
                    List.of()
            );
        }
    }

    private static final class StubAlbumRepository extends AlbumRepository {
        private final Map<Long, Album> byId = new HashMap<>();

        private StubAlbumRepository(Album initial) {
            if (initial != null) {
                persist(initial);
            }
        }

        @Override
        public Album findById(Long id) {
            return byId.get(id);
        }

        @Override
        public Optional<Album> findByAppleMusicId(String appleMusicId) {
            return byId.values().stream()
                    .filter(album -> appleMusicId.equals(album.getAppleMusicId()))
                    .findFirst();
        }

        @Override
        public Optional<Album> findByTitleAndArtistNameIgnoreCase(String title, String artistName) {
            return byId.values().stream().filter(album -> album.getTitle().equalsIgnoreCase(title)).findFirst();
        }

        @Override
        public void persist(Album entity) {
            byId.put(entity.getId(), entity);
        }
    }

    private static final class StubArtistRepository extends ArtistRepository {
        private final Map<Long, Artist> byId = new HashMap<>();

        @Override
        public Optional<Artist> findByAppleMusicId(String appleMusicId) {
            return byId.values().stream()
                    .filter(artist -> appleMusicId.equals(artist.getAppleMusicId()))
                    .findFirst();
        }

        @Override
        public Optional<Artist> findByNameIgnoreCase(String name) {
            return byId.values().stream().filter(artist -> artist.getName().equalsIgnoreCase(name)).findFirst();
        }

        @Override
        public void persist(Artist entity) {
            byId.put(entity.getId(), entity);
        }
    }
}
