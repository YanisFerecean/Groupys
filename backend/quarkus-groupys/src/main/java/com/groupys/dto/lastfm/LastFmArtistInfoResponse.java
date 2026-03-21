package com.groupys.dto.lastfm;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record LastFmArtistInfoResponse(LastFmArtistDetail artist) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmArtistDetail(
            String name,
            LastFmStats stats,
            LastFmBio bio
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmStats(String listeners, String playcount) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmBio(String summary) {
    }
}
