package com.groupys.dto.lastfm;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record LastFmChartTracksResponse(LastFmChartTracks tracks) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmChartTracks(
            @JsonProperty("track") List<LastFmChartTrack> tracks
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmChartTrack(
            String name,
            String playcount,
            String listeners,
            LastFmChartTrackArtist artist
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmChartTrackArtist(String name) {
    }
}
