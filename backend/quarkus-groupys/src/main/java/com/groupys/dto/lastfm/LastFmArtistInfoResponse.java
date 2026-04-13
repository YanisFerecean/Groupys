package com.groupys.dto.lastfm;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record LastFmArtistInfoResponse(LastFmArtistDetail artist) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmArtistDetail(
            String name,
            LastFmStats stats,
            LastFmBio bio,
            LastFmTags tags
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmStats(String listeners, String playcount) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmBio(String summary) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmTags(
            @JsonProperty("tag")
            List<LastFmTag> tags
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmTag(String name) {
    }
}
