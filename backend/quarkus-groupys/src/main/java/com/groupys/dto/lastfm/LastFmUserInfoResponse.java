package com.groupys.dto.lastfm;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record LastFmUserInfoResponse(
        @JsonProperty("user") LastFmUserDetail user
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LastFmUserDetail(
            String name,
            String realname,
            String playcount
    ) {
    }
}
