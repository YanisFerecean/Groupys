package com.groupys.dto.spotify;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SpotifyTopArtistsResponse(List<SpotifyArtistItem> items) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SpotifyArtistItem(String name, List<SpotifyImage> images) {
    }
}
