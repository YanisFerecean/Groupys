package com.groupys.dto.deezer;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DeezerGenreDto(
        Long id,
        String name
) {
}
