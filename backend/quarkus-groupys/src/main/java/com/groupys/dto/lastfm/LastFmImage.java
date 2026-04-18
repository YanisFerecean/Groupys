package com.groupys.dto.lastfm;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record LastFmImage(
        @JsonProperty("#text") String url,
        String size
) {
}
