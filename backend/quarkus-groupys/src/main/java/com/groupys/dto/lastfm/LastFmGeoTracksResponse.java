package com.groupys.dto.lastfm;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record LastFmGeoTracksResponse(LastFmGeoTracks tracks) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmGeoTracks(
            @JsonProperty("track") List<LastFmGeoTrack> tracks
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmGeoTrack(
            String name,
            String listeners,
            LastFmGeoTrackArtist artist
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmGeoTrackArtist(String name) {
    }
}
