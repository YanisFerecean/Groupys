package com.groupys.dto;

import jakarta.validation.constraints.NotBlank;

public record MusicConnectReqDto(
        @NotBlank(message = "musicUserToken is required")
        String musicUserToken
) {
}
