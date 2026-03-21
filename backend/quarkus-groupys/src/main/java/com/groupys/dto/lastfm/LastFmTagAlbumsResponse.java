package com.groupys.dto.lastfm;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record LastFmTagAlbumsResponse(LastFmTagAlbums albums) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmTagAlbums(
            @JsonProperty("album") List<LastFmTagAlbum> albums
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmTagAlbum(
            String name,
            LastFmTagAlbumArtist artist
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmTagAlbumArtist(String name) {
    }
}
