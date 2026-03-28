package com.groupys.dto;

import jakarta.validation.constraints.Size;

import java.util.List;

public record CommunityUpdateDto(
        @Size(max = 500) String description,
        @Size(max = 50) String genre,
        @Size(max = 60) String country,
        @Size(min = 2, max = 2) String countryCode,
        String imageUrl,
        String bannerUrl,
        String iconType,
        String iconEmoji,
        String iconUrl,
        List<String> tags,
        Long artistId,
        String visibility,
        Boolean discoveryEnabled,
        String tasteSummaryText
) {
}
