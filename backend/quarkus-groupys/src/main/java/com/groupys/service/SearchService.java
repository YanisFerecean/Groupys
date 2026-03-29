package com.groupys.service;

import com.groupys.dto.AlbumResDto;
import com.groupys.dto.ArtistResDto;
import com.groupys.dto.SearchResDto;
import com.groupys.dto.TrackResDto;
import io.quarkus.cache.CacheResult;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.List;
import java.util.concurrent.CompletableFuture;

@ApplicationScoped
public class SearchService {

    @Inject
    ArtistService artistService;

    @Inject
    AlbumService albumService;

    @Inject
    TrackService trackService;

    @CacheResult(cacheName = "search")
    public SearchResDto search(String query) {
        // Capture Quarkus classloader — ForkJoin threads use the system classloader,
        // which breaks SmallRye Config's ServiceLoader lookup inside REST clients.
        ClassLoader cl = Thread.currentThread().getContextClassLoader();
        CompletableFuture<List<ArtistResDto>> artists = CompletableFuture.supplyAsync(() -> {
            Thread.currentThread().setContextClassLoader(cl);
            return artistService.search(query, 3);
        });
        CompletableFuture<List<AlbumResDto>> albums = CompletableFuture.supplyAsync(() -> {
            Thread.currentThread().setContextClassLoader(cl);
            return albumService.search(query, 3);
        });
        CompletableFuture<List<TrackResDto>> tracks = CompletableFuture.supplyAsync(() -> {
            Thread.currentThread().setContextClassLoader(cl);
            return trackService.search(query, 3);
        });
        return new SearchResDto(artists.join(), albums.join(), tracks.join());
    }
}
