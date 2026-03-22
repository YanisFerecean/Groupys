package com.groupys.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserCreateDto(
        @NotBlank String clerkId,
        @NotBlank @Size(min = 3, max = 30) String username,
        @Size(max = 50) String displayName,
        @Size(max = 300) String bio,
        String profileImage
) {
}
