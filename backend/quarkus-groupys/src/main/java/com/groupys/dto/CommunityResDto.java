package com.groupys.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CommunityResDto(
        UUID id,
        String name,
        String description,
        String genre,
        String country,
        String imageUrl,
        String bannerUrl,
        String iconType,
        String iconEmoji,
        String iconUrl,
        List<String> tags,
        Long artistId,
        int memberCount,
        UUID createdById,
        Instant createdAt
) {
}
