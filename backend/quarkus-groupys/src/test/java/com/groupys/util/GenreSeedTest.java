package com.groupys.util;

import com.groupys.dto.apple.AppleCatalogGenre;
import com.groupys.model.Genre;
import com.groupys.repository.GenreRepository;
import com.groupys.service.AppleCatalogService;
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
        genreSeed.appleCatalogService = new StubAppleCatalogService(List.of(
                new AppleCatalogGenre("20", "Rock", null, null),
                new AppleCatalogGenre("14", "Pop", null, null)
        ));

        genreSeed.onStart(null);

        Genre syncedRock = genreRepository.findByNameIgnoreCase("rock").orElseThrow();
        Genre createdPop = genreRepository.findByNameIgnoreCase("pop").orElseThrow();
        Genre untouchedCustom = genreRepository.findByNameIgnoreCase("synthwave").orElseThrow();

        assertEquals(existingRock.id, syncedRock.id);
        assertEquals("20", syncedRock.appleGenreId);

        assertNotNull(createdPop.id);
        assertEquals("14", createdPop.appleGenreId);

        assertEquals(customGenre.id, untouchedCustom.id);
        assertNull(untouchedCustom.appleGenreId);
        assertEquals(3, genreRepository.snapshot().size());
    }

    @Test
    void onStartUpdatesExistingGenresByAppleGenreId() {
        InMemoryGenreRepository genreRepository = new InMemoryGenreRepository();
        Genre existing = genreRepository.existing(300L, "Electro / Dance", "106");

        GenreSeed genreSeed = new GenreSeed();
        genreSeed.genreRepository = genreRepository;
        genreSeed.appleCatalogService = new StubAppleCatalogService(List.of(
                new AppleCatalogGenre("106", "Dance", null, null)
        ));

        genreSeed.onStart(null);

        Genre updated = genreRepository.findByAppleGenreId("106").orElseThrow();
        assertEquals(existing.id, updated.id);
        assertEquals("Dance", updated.name);
        assertEquals(1, genreRepository.snapshot().size());
    }

    private static final class StubAppleCatalogService extends AppleCatalogService {
        private final List<AppleCatalogGenre> genres;

        private StubAppleCatalogService(List<AppleCatalogGenre> genres) {
            this.genres = genres;
        }

        @Override
        public String resolveStorefront(String country) {
            return "us";
        }

        @Override
        public List<AppleCatalogGenre> getGenres(String storefront) {
            return genres;
        }
    }

    private static final class InMemoryGenreRepository extends GenreRepository {

        private final List<Genre> genres = new ArrayList<>();
        private long nextId = 1000L;

        Genre existing(Long id, String name, String appleGenreId) {
            Genre genre = new Genre();
            genre.id = id;
            genre.name = name;
            genre.appleGenreId = appleGenreId;
            genres.add(genre);
            nextId = Math.max(nextId, id + 1);
            return genre;
        }

        @Override
        public Genre findById(Long id) {
            return genres.stream().filter(genre -> genre.id.equals(id)).findFirst().orElse(null);
        }

        @Override
        public Optional<Genre> findByNameIgnoreCase(String name) {
            return genres.stream()
                    .filter(genre -> genre.name != null && genre.name.equalsIgnoreCase(name))
                    .findFirst();
        }

        @Override
        public Optional<Genre> findByAppleGenreId(String appleGenreId) {
            return genres.stream()
                    .filter(genre -> appleGenreId != null && appleGenreId.equals(genre.appleGenreId))
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
}
