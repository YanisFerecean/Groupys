package com.groupys.service;

import com.groupys.dto.ArtistResDto;
import com.groupys.dto.apple.AppleCatalogAlbum;
import com.groupys.dto.apple.AppleCatalogSong;
import com.groupys.dto.apple.AppleChartsResult;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ChartServiceTest {

    @Test
    void getGlobalTopArtistsReturnsEmptyListWhenAppleChartsAreEmpty() {
        ChartService service = new ChartService();
        service.appleCatalogService = new StubAppleCatalogService(new AppleChartsResult(List.of(), List.of(), List.of()));
        service.artistService = new StubArtistService();

        List<ArtistResDto> artists = service.getGlobalTopArtists();

        assertTrue(artists.isEmpty());
    }

    @Test
    void getGlobalTopArtistsReturnsResolvedArtistsFromAppleCharts() {
        ChartService service = new ChartService();
        service.appleCatalogService = new StubAppleCatalogService(new AppleChartsResult(
                List.of(),
                List.of(new AppleCatalogSong(
                        "song-1",
                        "Song One",
                        "Artist One",
                        "artist-1",
                        "Album One",
                        "album-1",
                        null,
                        null,
                        null,
                        null,
                        null,
                        List.of("Pop"),
                        null,
                        null
                )),
                List.of(new AppleCatalogAlbum(
                        "album-2",
                        "Album Two",
                        "Artist Two",
                        "artist-2",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        List.of("Rock"),
                        List.of()
                ))
        ));
        service.artistService = new StubArtistService();

        List<ArtistResDto> artists = service.getGlobalTopArtists();

        assertEquals(2, artists.size());
        assertEquals(List.of("Artist One", "Artist Two"), artists.stream().map(ArtistResDto::name).toList());
    }

    private static final class StubAppleCatalogService extends AppleCatalogService {

        private final AppleChartsResult charts;

        private StubAppleCatalogService(AppleChartsResult charts) {
            this.charts = charts;
        }

        @Override
        public String resolveStorefront(String country) {
            return "us";
        }

        @Override
        public AppleChartsResult getCharts(String storefront, String genreId, int limit) {
            return charts;
        }
    }

    private static final class StubArtistService extends ArtistService {

        @Override
        List<ArtistResDto> deriveArtistsFromCharts(String storefront, AppleChartsResult charts, int limit) {
            return super.deriveArtistsFromCharts(storefront, charts, limit);
        }

        @Override
        public ArtistResDto resolveByAppleReference(String storefront, String artistId, String artistName) {
            Long id = artistId == null ? null : (long) Math.abs(artistId.hashCode());
            return new ArtistResDto(id, artistName, List.of(), null, null, null, null);
        }
    }
}
