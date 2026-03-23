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
        genreRepository.deleteAll();

        try {
            var response = deezerClient.getGenres();
            if (response != null && response.data() != null) {
                for (DeezerGenreDto dto : response.data()) {
                    // Skip "All" genre (usually id 0)
                    if (dto.id() == 0) continue;

                    Genre g = new Genre();
                    g.name = dto.name();
                    g.deezerId = dto.id();
                    genreRepository.persist(g);
                }
                LOG.info("Seeded " + response.data().size() + " genres from Deezer.");
            }
        } catch (Exception e) {
            LOG.error("Failed to seed genres from Deezer", e);
        }
    }
}
