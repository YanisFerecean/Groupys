package com.groupys.util;

import com.groupys.model.Genre;
import com.groupys.repository.GenreRepository;
import com.groupys.service.AppleCatalogService;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

@ApplicationScoped
public class GenreSeed {

    private static final Logger LOG = Logger.getLogger(GenreSeed.class);

    @Inject
    AppleCatalogService appleCatalogService;

    @Inject
    GenreRepository genreRepository;

    @Transactional
    void onStart(@Observes StartupEvent ev) {
        try {
            var response = appleCatalogService.getGenres(appleCatalogService.resolveStorefront(null));
            if (response == null || response.isEmpty()) {
                return;
            }

            int created = 0;
            int updated = 0;
            for (var dto : response) {
                if (dto.name() == null || dto.name().isBlank()) {
                    continue;
                }
                Genre genre = genreRepository.findByAppleGenreId(dto.id())
                        .or(() -> genreRepository.findByNameIgnoreCase(dto.name().trim()))
                        .orElseGet(Genre::new);
                boolean isNew = genre.id == null;
                genre.name = dto.name().trim();
                genre.appleGenreId = dto.id();
                if (isNew) {
                    genreRepository.persist(genre);
                    created++;
                } else {
                    updated++;
                }
            }
            LOG.infof("Synced Apple Music genres. created=%d updated=%d received=%d", created, updated, response.size());
        } catch (Exception e) {
            LOG.error("Failed to seed genres from Apple Music", e);
        }
    }
}
