package com.groupys.dto.lastfm;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record LastFmUserTopArtistsResponse(
        @JsonProperty("topartists") TopArtists topartists
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TopArtists(
            @JsonProperty("artist") List<LastFmArtist> artists
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmArtist(
            String name,
            String playcount,
            @JsonProperty("image") List<LastFmImage> images
    ) {
    }
}
