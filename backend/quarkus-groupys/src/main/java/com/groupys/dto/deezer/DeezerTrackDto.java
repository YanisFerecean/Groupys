package com.groupys.dto.deezer;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DeezerTrackDto(
        Long id,
        String title,
        Integer duration,
        Integer rank,
        String preview,
        DeezerArtistDto artist,
        DeezerAlbumDto album
) {
}
