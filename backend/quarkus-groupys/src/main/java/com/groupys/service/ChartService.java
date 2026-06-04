package com.groupys.service;

import com.groupys.dto.ArtistResDto;
import com.groupys.dto.TopAlbumResDto;
import com.groupys.dto.TopTrackResDto;
import com.groupys.dto.apple.AppleCatalogAlbum;
import com.groupys.dto.apple.AppleCatalogSong;
import com.groupys.dto.apple.AppleChartsResult;
import com.groupys.repository.GenreRepository;
import io.quarkus.cache.CacheResult;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

@ApplicationScoped
public class ChartService {

    @Inject
    AppleCatalogService appleCatalogService;

    @Inject
    ArtistService artistService;

    @Inject
    GenreRepository genreRepository;

    @CacheResult(cacheName = "charts-tracks")
    public List<TopTrackResDto> getGlobalTopTracks() {
        return mapTopTracks(appleCatalogService.resolveStorefront(null), appleCatalogService.getCharts(appleCatalogService.resolveStorefront(null), null, 10));
    }

    @CacheResult(cacheName = "charts-tracks-country")
    public List<TopTrackResDto> getTopTracksByCountry(String country) {
        String storefront = appleCatalogService.resolveStorefront(country);
        return mapTopTracks(storefront, appleCatalogService.getCharts(storefront, null, 10));
    }

    @CacheResult(cacheName = "charts-artists")
    public List<ArtistResDto> getGlobalTopArtists() {
        String storefront = appleCatalogService.resolveStorefront(null);
        return artistService.deriveArtistsFromCharts(storefront, appleCatalogService.getCharts(storefront, null, 10), 10);
    }

    @CacheResult(cacheName = "charts-artists-country")
    public List<ArtistResDto> getTopArtistsByCountry(String country) {
        String storefront = appleCatalogService.resolveStorefront(country);
        return artistService.deriveArtistsFromCharts(storefront, appleCatalogService.getCharts(storefront, null, 10), 10);
    }

    @CacheResult(cacheName = "charts-albums")
    public List<TopAlbumResDto> getGlobalTopAlbums() {
        return getTopAlbumsByTag("all");
    }

    @CacheResult(cacheName = "charts-albums-tag")
    public List<TopAlbumResDto> getTopAlbumsByTag(String tag) {
        String storefront = appleCatalogService.resolveStorefront(null);
        String normalizedTag = tag == null ? "" : tag.trim();
        if (normalizedTag.isBlank() || "all".equalsIgnoreCase(normalizedTag)) {
            return mapTopAlbums(storefront, appleCatalogService.getCharts(storefront, null, 10).topAlbums());
        }

        String genreId = genreRepository.findByNameIgnoreCase(normalizedTag)
                .map(genre -> genre.appleGenreId)
                .orElse(null);
        if (genreId != null && !genreId.isBlank()) {
            List<TopAlbumResDto> chartAlbums = mapTopAlbums(storefront, appleCatalogService.getCharts(storefront, genreId, 10).topAlbums());
            if (!chartAlbums.isEmpty()) {
                return chartAlbums;
            }
        }

        var searchResult = appleCatalogService.search(storefront, normalizedTag, 10);
        if (searchResult == null || searchResult.albums() == null) {
            return Collections.emptyList();
        }
        List<AppleCatalogAlbum> filtered = new ArrayList<>();
        for (AppleCatalogAlbum album : searchResult.albums()) {
            if (matchesGenre(album.genreNames(), normalizedTag)) {
                filtered.add(album);
            }
        }
        return mapTopAlbums(storefront, filtered);
    }

    private List<TopTrackResDto> mapTopTracks(String storefront, AppleChartsResult charts) {
        if (charts == null || charts.topSongs() == null) {
            return Collections.emptyList();
        }
        return charts.topSongs().stream()
                .limit(10)
                .map(song -> new TopTrackResDto(
                        song.name(),
                        artistService.resolveByAppleReference(storefront, song.artistId(), song.artistName()),
                        null,
                        null
                ))
                .toList();
    }

    private List<TopAlbumResDto> mapTopAlbums(String storefront, List<AppleCatalogAlbum> albums) {
        if (albums == null || albums.isEmpty()) {
            return Collections.emptyList();
        }
        return albums.stream()
                .limit(10)
                .map(album -> new TopAlbumResDto(
                        album.name(),
                        artistService.resolveByAppleReference(storefront, album.artistId(), album.artistName())
                ))
                .toList();
    }

    private boolean matchesGenre(List<String> genreNames, String expected) {
        if (genreNames == null || genreNames.isEmpty() || expected == null || expected.isBlank()) {
            return false;
        }
        String normalized = expected.trim().toLowerCase(Locale.ROOT);
        return genreNames.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(value -> value.trim().toLowerCase(Locale.ROOT))
                .anyMatch(value -> value.equals(normalized));
    }
}
