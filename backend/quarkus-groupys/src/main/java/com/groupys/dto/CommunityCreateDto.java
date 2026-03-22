package com.groupys.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CommunityCreateDto(
        @NotBlank @Size(min = 2, max = 60) String name,
        @Size(max = 500) String description,
        @Size(max = 50) String genre,
        @Size(max = 60) String country,
        String imageUrl,
        String bannerUrl,
        String iconType,
        String iconEmoji,
        String iconUrl,
        List<String> tags,
        Long artistId
) {
}
