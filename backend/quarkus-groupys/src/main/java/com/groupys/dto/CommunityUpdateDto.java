package com.groupys.dto;

import jakarta.validation.constraints.Size;

public record CommunityUpdateDto(
        @Size(max = 500) String description,
        @Size(max = 50) String genre,
        @Size(max = 60) String country,
        String imageUrl
) {
}
