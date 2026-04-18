package com.groupys.dto.lastfm;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record LastFmUserTopAlbumsResponse(
        @JsonProperty("topalbums") TopAlbums topalbums
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TopAlbums(
            @JsonProperty("album") List<LastFmAlbum> albums
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmAlbum(
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
