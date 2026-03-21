package com.groupys.dto;

import jakarta.validation.constraints.Size;

public record UserUpdateDto(
        @Size(max = 50) String displayName,
        @Size(max = 300) String bio,
        String country,
        String bannerUrl,
        @Size(max = 7) String accentColor,
        @Size(max = 7) String nameColor,
        String widgets
) {
}
