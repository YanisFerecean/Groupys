package com.groupys.dto.deezer;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DeezerAlbumDto(
        Long id,
        String title,
        @JsonProperty("cover_small") String coverSmall,
        @JsonProperty("cover_medium") String coverMedium,
        @JsonProperty("cover_big") String coverBig,
        @JsonProperty("cover_xl") String coverXl,
        @JsonProperty("nb_tracks") Integer nbTracks,
        DeezerArtistDto artist
) {
}
