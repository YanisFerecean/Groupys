package com.groupys.util;

import com.groupys.client.DeezerClient;
import com.groupys.dto.deezer.DeezerAlbumDto;
import com.groupys.dto.deezer.DeezerAlbumSearchResponse;
import com.groupys.dto.deezer.DeezerArtistDto;
import com.groupys.dto.deezer.DeezerArtistSearchResponse;
import com.groupys.dto.deezer.DeezerGenreDto;
import com.groupys.dto.deezer.DeezerGenreListResponse;
import com.groupys.dto.deezer.DeezerTrackSearchResponse;
import com.groupys.model.Genre;
import com.groupys.repository.GenreRepository;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class GenreSeedTest {

    @Test
    void onStartPreservesExistingGenresAndUpsertsByName() {
        InMemoryGenreRepository genreRepository = new InMemoryGenreRepository();

        Genre existingRock = genreRepository.existing(757L, "Rock", null);
        Genre customGenre = genreRepository.existing(900L, "Synthwave", null);

        GenreSeed genreSeed = new GenreSeed();
        genreSeed.genreRepository = genreRepository;
        genreSeed.deezerClient = new StubDeezerClient(new DeezerGenreListResponse(List.of(
                new DeezerGenreDto(0L, "All"),
                new DeezerGenreDto(152L, "Rock"),
                new DeezerGenreDto(132L, "Pop")
        )));

        genreSeed.onStart(null);

        Genre syncedRock = genreRepository.findByNameIgnoreCase("rock").orElseThrow();
        Genre createdPop = genreRepository.findByNameIgnoreCase("pop").orElseThrow();
        Genre untouchedCustom = genreRepository.findByNameIgnoreCase("synthwave").orElseThrow();

        assertEquals(existingRock.id, syncedRock.id);
        assertEquals(152L, syncedRock.deezerId);

        assertNotNull(createdPop.id);
        assertEquals(132L, createdPop.deezerId);

        assertEquals(customGenre.id, untouchedCustom.id);
        assertNull(untouchedCustom.deezerId);
        assertEquals(3, genreRepository.snapshot().size());
    }

    @Test
    void onStartUpdatesExistingGenresByDeezerId() {
        InMemoryGenreRepository genreRepository = new InMemoryGenreRepository();
        Genre existing = genreRepository.existing(300L, "Electro / Dance", 106L);

        GenreSeed genreSeed = new GenreSeed();
        genreSeed.genreRepository = genreRepository;
        genreSeed.deezerClient = new StubDeezerClient(new DeezerGenreListResponse(List.of(
                new DeezerGenreDto(106L, "Dance")
        )));

        genreSeed.onStart(null);

        Genre updated = genreRepository.findByDeezerId(106L).orElseThrow();
        assertEquals(existing.id, updated.id);
        assertEquals("Dance", updated.name);
        assertEquals(1, genreRepository.snapshot().size());
    }

    private static final class InMemoryGenreRepository extends GenreRepository {

        private final List<Genre> genres = new ArrayList<>();
        private long nextId = 1000L;

        Genre existing(Long id, String name, Long deezerId) {
            Genre genre = new Genre();
            genre.id = id;
            genre.name = name;
            genre.deezerId = deezerId;
            genres.add(genre);
            nextId = Math.max(nextId, id + 1);
            return genre;
        }

        @Override
        public Optional<Genre> findByNameIgnoreCase(String name) {
            return genres.stream()
                    .filter(genre -> genre.name != null && genre.name.equalsIgnoreCase(name))
                    .findFirst();
        }

        @Override
        public Optional<Genre> findByDeezerId(Long deezerId) {
            return genres.stream()
                    .filter(genre -> deezerId != null && deezerId.equals(genre.deezerId))
                    .findFirst();
        }

        @Override
        public void persist(Genre entity) {
            if (entity.id == null) {
                entity.id = nextId++;
            }
            genres.add(entity);
        }

        List<Genre> snapshot() {
            return genres.stream()
                    .sorted(Comparator.comparing(genre -> genre.id))
                    .toList();
        }
    }

    private record StubDeezerClient(DeezerGenreListResponse genreListResponse) implements DeezerClient {

        @Override
        public DeezerArtistSearchResponse searchArtists(String query, int limit) {
            return null;
        }

        @Override
        public DeezerAlbumSearchResponse searchAlbums(String query, int limit) {
            return null;
        }

        @Override
        public DeezerTrackSearchResponse searchTracks(String query, int limit) {
            return null;
        }

        @Override
        public DeezerArtistDto getArtistById(Long id) {
            return null;
        }

        @Override
        public DeezerAlbumDto getAlbumById(Long id) {
            return null;
        }

        @Override
        public DeezerTrackSearchResponse getArtistTopTracks(Long id, int limit) {
            return null;
        }

        @Override
        public DeezerGenreListResponse getGenres() {
            return genreListResponse;
        }

        @Override
        public DeezerArtistSearchResponse getArtistsByGenre(Long id) {
            throw new UnsupportedOperationException("Not used in this test");
        }
    }
}
