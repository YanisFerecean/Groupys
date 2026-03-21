package com.groupys.dto.deezer;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DeezerArtistDto(
        Long id,
        String name,
        @JsonProperty("picture_small") String pictureSmall,
        @JsonProperty("picture_medium") String pictureMedium,
        @JsonProperty("picture_big") String pictureBig,
        @JsonProperty("picture_xl") String pictureXl,
        @JsonProperty("nb_album") Integer nbAlbum,
        @JsonProperty("nb_fan") Long nbFan
) {
}
