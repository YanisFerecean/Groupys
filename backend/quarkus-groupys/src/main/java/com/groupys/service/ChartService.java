package com.groupys.service;

import com.groupys.client.LastFmClient;
import com.groupys.dto.ArtistResDto;
import com.groupys.dto.TopAlbumResDto;
import com.groupys.dto.TopTrackResDto;
import com.groupys.dto.lastfm.LastFmChartArtistsResponse;
import com.groupys.dto.lastfm.LastFmChartTracksResponse;
import com.groupys.dto.lastfm.LastFmGeoTracksResponse;
import com.groupys.dto.lastfm.LastFmTagAlbumsResponse;
import com.groupys.dto.lastfm.LastFmTopArtistsResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.rest.client.inject.RestClient;

import java.util.Collections;
import java.util.List;
import java.util.function.Supplier;

@ApplicationScoped
public class ChartService {

    private static final Logger LOG = Logger.getLogger(ChartService.class);

    @Inject
    @RestClient
    LastFmClient lastFmClient;

    @Inject
    ArtistService artistService;

    @ConfigProperty(name = "lastfm.api.key")
    String lastfmApiKey;

    public List<TopTrackResDto> getGlobalTopTracks() {
        LastFmChartTracksResponse response = fetchLastFmResponse(
                "chart.gettoptracks",
                () -> lastFmClient.getChartTopTracks("chart.gettoptracks", lastfmApiKey, "json")
        );

        if (response == null || response.tracks() == null || response.tracks().tracks() == null) {
            return Collections.emptyList();
        }

        return response.tracks().tracks().stream()
                .limit(10)
                .map(t -> new TopTrackResDto(
                        t.name(),
                        t.artist() != null ? artistService.resolveByName(t.artist().name()) : null,
                        parseLong(t.listeners()),
                        parseLong(t.playcount())
                ))
                .toList();
    }

    public List<TopTrackResDto> getTopTracksByCountry(String country) {
        LastFmGeoTracksResponse response = fetchLastFmResponse(
                "geo.gettoptracks",
                () -> lastFmClient.getGeoTopTracks("geo.gettoptracks", country, lastfmApiKey, "json")
        );

        if (response == null || response.tracks() == null || response.tracks().tracks() == null) {
            return Collections.emptyList();
        }

        return response.tracks().tracks().stream()
                .limit(10)
                .map(t -> new TopTrackResDto(
                        t.name(),
                        t.artist() != null ? artistService.resolveByName(t.artist().name()) : null,
                        parseLong(t.listeners()),
                        null
                ))
                .toList();
    }

    public List<ArtistResDto> getGlobalTopArtists() {
        LastFmChartArtistsResponse response = fetchLastFmResponse(
                "chart.gettopartists",
                () -> lastFmClient.getChartTopArtists("chart.gettopartists", lastfmApiKey, "json")
        );

        if (response == null || response.artists() == null || response.artists().artists() == null) {
            return Collections.emptyList();
        }

        return response.artists().artists().stream()
                .limit(10)
                .map(a -> artistService.resolveByName(a.name()))
                .filter(a -> a != null)
                .toList();
    }

    public List<ArtistResDto> getTopArtistsByCountry(String country) {
        LastFmTopArtistsResponse response = fetchLastFmResponse(
                "geo.gettopartists",
                () -> lastFmClient.getTopArtists("geo.gettopartists", country, lastfmApiKey, "json")
        );

        if (response == null || response.topartists() == null || response.topartists().artists() == null) {
            return Collections.emptyList();
        }

        return response.topartists().artists().stream()
                .limit(10)
                .map(a -> artistService.resolveByName(a.name()))
                .filter(a -> a != null)
                .toList();
    }

    public List<TopAlbumResDto> getGlobalTopAlbums() {
        return getTopAlbumsByTag("all");
    }

    public List<TopAlbumResDto> getTopAlbumsByTag(String tag) {
        LastFmTagAlbumsResponse response = fetchLastFmResponse(
                "tag.gettopalbums",
                () -> lastFmClient.getTagTopAlbums("tag.gettopalbums", tag, lastfmApiKey, "json")
        );

        if (response == null || response.albums() == null || response.albums().albums() == null) {
            return Collections.emptyList();
        }

        return response.albums().albums().stream()
                .limit(10)
                .map(a -> new TopAlbumResDto(
                        a.name(),
                        a.artist() != null ? artistService.resolveByName(a.artist().name()) : null
                ))
                .toList();
    }

    private Long parseLong(String value) {
        if (value == null || value.isBlank()) return null;
        return Long.parseLong(value);
    }

    private <T> T fetchLastFmResponse(String operation, Supplier<T> supplier) {
        try {
            return supplier.get();
        } catch (RuntimeException e) {
            LOG.warnf("Last.fm request failed for %s: %s", operation, e.getMessage());
            return null;
        }
    }
}
