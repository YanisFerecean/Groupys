package com.groupys.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LastFmConnectReqDto(
        @NotBlank @Size(max = 100) String username
) {
}
