package com.groupys.dto.spotify;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SpotifyTopTracksResponse(List<SpotifyTrackItem> items) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SpotifyTrackItem(
            String id,
            String name,
            Integer popularity,
            ExternalIds externalIds,
            List<SpotifyArtistRef> artists,
            SpotifyAlbumRef album
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SpotifyArtistRef(String id, String name) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SpotifyAlbumRef(String id, String name, List<SpotifyImage> images) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ExternalIds(String isrc) {
    }
}
