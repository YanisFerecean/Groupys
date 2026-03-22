package com.groupys.dto.spotify;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SpotifyCurrentlyPlayingResponse(
        @JsonProperty("is_playing") boolean isPlaying,
        SpotifyTrackItem item
) {

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
