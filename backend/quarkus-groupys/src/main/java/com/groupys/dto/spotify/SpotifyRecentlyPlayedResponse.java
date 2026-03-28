package com.groupys.dto.spotify;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SpotifyRecentlyPlayedResponse(List<SpotifyRecentlyPlayedItem> items) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SpotifyRecentlyPlayedItem(SpotifyTrackItem track) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SpotifyTrackItem(
            String name,
            List<SpotifyArtistRef> artists,
            SpotifyAlbumRef album
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SpotifyArtistRef(String name) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SpotifyAlbumRef(String name, List<SpotifyImage> images) {
    }
}
