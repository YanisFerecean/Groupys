package com.groupys.dto.lastfm;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record LastFmUserTopTracksResponse(
        @JsonProperty("toptracks") TopTracks toptracks
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TopTracks(
            @JsonProperty("track") List<LastFmTrack> tracks
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmTrack(
            String name,
            String playcount,
            LastFmArtistRef artist,
            @JsonProperty("image") List<LastFmImage> images
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmArtistRef(String name) {
    }
}
