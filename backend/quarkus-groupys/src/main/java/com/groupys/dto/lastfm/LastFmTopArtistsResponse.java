package com.groupys.dto.lastfm;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record LastFmTopArtistsResponse(LastFmTopArtists topartists) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmTopArtists(
            @JsonProperty("artist") List<LastFmTopArtist> artists
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmTopArtist(String name, String listeners) {
    }
}
