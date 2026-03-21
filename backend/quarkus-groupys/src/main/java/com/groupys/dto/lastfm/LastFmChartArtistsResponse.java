package com.groupys.dto.lastfm;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record LastFmChartArtistsResponse(LastFmChartArtists artists) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmChartArtists(
            @JsonProperty("artist") List<LastFmChartArtist> artists
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmChartArtist(
            String name,
            String playcount,
            String listeners
    ) {
    }
}
