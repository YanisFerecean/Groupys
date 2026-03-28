package com.groupys.util;

import com.groupys.client.DeezerClient;
import com.groupys.dto.deezer.DeezerGenreDto;
import com.groupys.model.Genre;
import com.groupys.repository.GenreRepository;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

@ApplicationScoped
public class GenreSeed {

    private static final Logger LOG = Logger.getLogger(GenreSeed.class);

    @Inject
    @RestClient
    DeezerClient deezerClient;

    @Inject
    GenreRepository genreRepository;

    @Transactional
    void onStart(@Observes StartupEvent ev) {
        try {
            var response = deezerClient.getGenres();
            if (response != null && response.data() != null) {
                int created = 0;
                int updated = 0;

                for (DeezerGenreDto dto : response.data()) {
                    // Skip "All" genre (usually id 0)
                    if (dto.id() == 0) continue;
                    if (dto.name() == null || dto.name().isBlank()) continue;

                    String genreName = dto.name().trim();
                    Genre genre = genreRepository.findByDeezerId(dto.id())
                            .or(() -> genreRepository.findByNameIgnoreCase(genreName))
                            .orElseGet(Genre::new);

                    boolean isNew = genre.id == null;
                    genre.name = genreName;
                    genre.deezerId = dto.id();

                    if (isNew) {
                        genreRepository.persist(genre);
                        created++;
                    } else {
                        updated++;
                    }
                }
                LOG.infof("Synced Deezer genres. created=%d updated=%d received=%d", created, updated,
                        response.data().size());
            }
        } catch (Exception e) {
            LOG.error("Failed to seed genres from Deezer", e);
        }
    }
}
